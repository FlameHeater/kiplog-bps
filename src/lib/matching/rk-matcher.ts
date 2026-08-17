import { CONFUSABLE_PLAN_GROUPS } from '@/data/performance-plans-2026';
import {
  DOMAIN_TERMS,
  GENERIC_ACTIVITY_WORDS,
  PLAN_DOMAINS,
  PLAN_ROLES,
  RK_NAME_BOILERPLATE,
  ROLE_MARKERS,
  type RkRole,
} from '@/data/rk-vocabulary-2026';
import { cleanText, containsPhrase, diceCoefficient, tokenize } from './normalize';
import type { Activity, PerformancePlan } from '@/types';

export interface RkRecommendation {
  plan: PerformancePlan;
  score: number; // 0-100
  reason: string[];
}

const MIN_THRESHOLD = 35;
const MAX_RESULTS = 3;
const AMBIGUITY_SCORE_GAP = 8;
const RECENT_USAGE_DAYS = 14;
const RECENT_HISTORY_LIMIT = 50;

// Bobot maksimum per sinyal. Dikalibrasi terhadap ambang 35 supaya:
//   - satu kata kunci KHAS (dimiliki satu RK) cukup sendirian;
//   - bidang saja TIDAK cukup (25 < 35) sehingga deskripsi sebidang yang tidak
//     menyebut bentuk pekerjaannya memunculkan beberapa kandidat, bukan satu
//     jawaban percaya diri yang bisa salah;
//   - bidang + bentuk pekerjaan (25 + 15) cukup.
const W_KEYWORD_BEST = 40; // dibagi jumlah RK pemilik kata kunci itu
const W_KEYWORD_EXTRA = 6;
const W_KEYWORD_CAP = 45;
const W_DOMAIN = 25;
const W_ROLE = 15;
const W_ROLE_PENALTY = 10;
const W_NAME = 8;
const W_TAG = 8;
const W_HISTORY = 10;
const W_FREQUENCY = 10;
const W_TEAM = 4;

/**
 * §12.1 — rekomendasi deterministik, tanpa LLM.
 *
 * Kalibrasi ulang (Agustus 2026) memakai dua sumber nyata: file cascading
 * kinerja resmi dan 85 deskripsi kegiatan asli milik pengguna. Pengukuran
 * terhadap korpus itu menunjukkan versi sebelumnya presisinya sudah baik
 * (13 dari 14 kegiatan berlabel tepat di posisi teratas) tetapi hanya berani
 * menjawab untuk 27 dari 85 deskripsi. Dua sebab strukturalnya diperbaiki di
 * sini:
 *
 * 1. Kecocokan SATU kata kunci dulu bernilai 32, di bawah ambang 35 — artinya
 *    kata sekhas "sakernas" atau "shped" tidak pernah bisa memunculkan RK-nya
 *    sendirian. Sekarang bobot kata kunci mengikuti KEKHASANNYA: kata yang
 *    hanya dimiliki satu RK bernilai penuh, kata yang dipakai banyak RK
 *    (mis. "opd", "dokumentasi") dibagi rata sesuai jumlah pemiliknya.
 *
 * 2. Kemiripan nama RK dihitung atas seluruh teks nama, padahal nama RK BPS
 *    memakai kerangka kalimat yang sama; "Statistik Harga" vs "Statistik
 *    Jasa" bisa mencapai kemiripan 0.92 tanpa berbagi bidang sama sekali.
 *    Sekarang token kerangka itu dibuang lebih dulu (RK_NAME_BOILERPLATE).
 *
 * 3. Kata kunci per RK berupa frasa panjang ("rilis neraca pengeluaran") gagal
 *    begitu pengguna menyelipkan satu kata di tengahnya ("rilis BRS neraca
 *    pengeluaran"). Karena itu pencocokan sekarang bersumbu dua, mengikuti
 *    struktur file cascading itu sendiri: BIDANG (Tim Kerja / Nama Proyek —
 *    "soal apa") dan PERAN (Indikator Kinerja — "bentuk pekerjaannya apa:
 *    pelaksanaan lapangan, publikasi, rilis, atau administrasi"). Bidang saja
 *    tidak cukup melewati ambang, sehingga deskripsi yang hanya menyebut
 *    bidangnya memunculkan beberapa kandidat untuk dipilih pengguna alih-alih
 *    satu jawaban percaya diri yang berpeluang salah.
 */
export function recommendPerformancePlans(
  description: string,
  plans: PerformancePlan[],
  year: number,
  options?: { activityTags?: string[]; recentActivities?: Activity[] }
): RkRecommendation[] {
  const activityTags = options?.activityTags ?? [];
  const recentActivities = options?.recentActivities ?? [];

  const descTokens = tokenize(description);
  const descClean = cleanText(description);
  const descRole = detectRole(descClean);
  const descDomains = detectDomains(descClean);

  const candidates = plans.filter((p) => p.isActive && p.year === year);
  const keywordOwners = countKeywordOwners(candidates);

  const scored: RkRecommendation[] = candidates.map((plan) =>
    score(plan, {
      descTokens,
      descClean,
      descRole,
      descDomains,
      activityTags,
      recentActivities,
      keywordOwners,
    })
  );

  const qualified = scored.filter((s) => s.score >= MIN_THRESHOLD);

  // Ambiguity rule (§12.1.2): pull in a confusable sibling that's close in
  // score even if it individually missed the threshold, so the UI can show
  // the disambiguator instead of silently picking one.
  const extra: RkRecommendation[] = [];
  for (const q of qualified) {
    const group = CONFUSABLE_PLAN_GROUPS.find((g) => g.includes(q.plan.sortOrder));
    if (!group) continue;
    for (const memberNo of group) {
      const sibling = scored.find((s) => s.plan.sortOrder === memberNo);
      if (!sibling || sibling.plan.id === q.plan.id) continue;
      if (Math.abs(sibling.score - q.score) < AMBIGUITY_SCORE_GAP && !qualified.includes(sibling)) {
        extra.push(sibling);
      }
    }
  }

  const combined = [...qualified, ...extra].filter(
    (s, index, arr) => arr.findIndex((x) => x.plan.id === s.plan.id) === index
  );
  combined.sort((a, b) => b.score - a.score);

  return combined.slice(0, MAX_RESULTS);
}

const MAX_LEARNED_KEYWORDS = 50;
const MIN_LEARNED_LENGTH = 4;

/**
 * §12.1.4 — after the user picks a plan, fold any new description tokens
 * into its keyword list (cap 50, oldest/least-recently-added dropped first
 * to make room). Pure — caller persists the result.
 *
 * Token yang terlalu umum disaring: karena bobot kata kunci kini mengikuti
 * kekhasan, sebuah kata seperti "rapat" yang hanya tersimpan di satu RK akan
 * dinilai sangat khas padahal justru sebaliknya.
 */
export function applyLocalLearning(plan: PerformancePlan, description: string): string[] {
  const existing = new Set(plan.keywords.map((k) => k.toLowerCase()));
  const newTokens = [...tokenize(description)].filter(
    (t) =>
      !existing.has(t) &&
      t.length >= MIN_LEARNED_LENGTH &&
      !GENERIC_ACTIVITY_WORDS.has(t) &&
      !RK_NAME_BOILERPLATE.has(t) &&
      !/^\d+$/.test(t)
  );
  let keywords = [...plan.keywords, ...newTokens];
  if (keywords.length > MAX_LEARNED_KEYWORDS) {
    keywords = keywords.slice(keywords.length - MAX_LEARNED_KEYWORDS);
  }
  return keywords;
}

/** Berapa RK yang memakai tiap kata kunci — dasar pembobotan kekhasan. */
function countKeywordOwners(plans: PerformancePlan[]): Map<string, number> {
  const owners = new Map<string, number>();
  for (const plan of plans) {
    for (const keyword of new Set(plan.keywords.map((k) => cleanText(k)))) {
      if (!keyword) continue;
      owners.set(keyword, (owners.get(keyword) ?? 0) + 1);
    }
  }
  return owners;
}

/** Peran yang tersirat dari deskripsi kegiatan, bila ada penandanya. */
function detectRole(descClean: string): RkRole | null {
  for (const [role, markers] of Object.entries(ROLE_MARKERS) as [RkRole, string[]][]) {
    if (markers.some((marker) => containsPhrase(descClean, marker))) return role;
  }
  return null;
}

/**
 * Bidang yang disebut deskripsi. Bisa lebih dari satu — mis. "Membuat konten
 * sosialisasi SE2026" menyentuh humas sekaligus se2026, dan itu memang benar
 * ambigu; kandidat dari kedua bidang layak ditawarkan.
 */
function detectDomains(descClean: string): Set<string> {
  const domains = new Set<string>();
  for (const [domain, terms] of Object.entries(DOMAIN_TERMS)) {
    if (terms.some((term) => containsPhrase(descClean, term))) domains.add(domain);
  }
  return domains;
}

/** Token nama RK setelah kerangka kalimat resmi dibuang. */
function discriminativeNameTokens(name: string): Set<string> {
  return new Set([...tokenize(name)].filter((t) => !RK_NAME_BOILERPLATE.has(t)));
}

interface ScoreContext {
  descTokens: Set<string>;
  descClean: string;
  descRole: RkRole | null;
  descDomains: Set<string>;
  activityTags: string[];
  recentActivities: Activity[];
  keywordOwners: Map<string, number>;
}

function score(plan: PerformancePlan, ctx: ScoreContext): RkRecommendation {
  const reason: string[] = [];

  // Sinyal 1 — kata kunci, dibobot kekhasan (maks 45).
  const matched: { keyword: string; weight: number }[] = [];
  for (const raw of plan.keywords) {
    const keyword = cleanText(raw);
    if (!keyword || !containsPhrase(ctx.descClean, keyword)) continue;
    const owners = ctx.keywordOwners.get(keyword) ?? 1;
    matched.push({ keyword: raw, weight: 1 / owners });
  }
  matched.sort((a, b) => b.weight - a.weight);

  let keywordScore = 0;
  if (matched.length > 0) {
    keywordScore = W_KEYWORD_BEST * matched[0]!.weight;
    for (const extra of matched.slice(1)) keywordScore += W_KEYWORD_EXTRA * extra.weight;
    keywordScore = Math.min(W_KEYWORD_CAP, keywordScore);
    reason.push(`kata kunci: ${matched.map((m) => m.keyword).join(', ')}`);
  }

  // Sinyal 2 — bidang (maks 25). Sengaja di bawah ambang: bidang saja tidak
  // boleh cukup untuk satu jawaban percaya diri.
  const planDomain = PLAN_DOMAINS[plan.sortOrder] ?? null;
  const domainHit = planDomain !== null && ctx.descDomains.has(planDomain);
  const domainScore = domainHit ? W_DOMAIN : 0;
  if (domainHit) reason.push(`bidang: ${planDomain!.replace(/_/g, ' ')}`);

  // Sinyal 3 — peran/bentuk pekerjaan (maks 15, atau penalti bila jelas beda).
  // Hanya berlaku di dalam bidang yang cocok: penalti untuk RK bidang lain
  // tidak ada gunanya, dan bonus untuk RK bidang lain justru menyesatkan.
  const planRole = PLAN_ROLES[plan.sortOrder] ?? null;
  let roleScore = 0;
  if (domainHit && planRole && ctx.descRole) {
    if (planRole === ctx.descRole) {
      roleScore = W_ROLE;
      reason.push(`bentuk pekerjaan: ${planRole}`);
    } else {
      roleScore = -W_ROLE_PENALTY;
    }
  }

  // Sinyal 4 — kemiripan nama RK, hanya atas token yang membedakan (maks 8).
  const nameScore = diceCoefficient(ctx.descTokens, discriminativeNameTokens(plan.name)) * W_NAME;

  // Sinyal 5 — irisan tag kegiatan (maks 8).
  const planTagsLower = plan.tags.map((t) => t.toLowerCase());
  const matchedTags = ctx.activityTags.filter((t) => planTagsLower.includes(t.toLowerCase()));
  const tagScore = plan.tags.length > 0 ? (matchedTags.length / plan.tags.length) * W_TAG : 0;
  if (matchedTags.length > 0) reason.push(`tag: ${matchedTags.join(', ')}`);

  // Sinyal 6 — kemiripan tertinggi dengan 50 kegiatan terakhir RK ini (maks 10, gerbang Dice >= 0.5).
  const history = ctx.recentActivities
    .filter((a) => a.performancePlanId === plan.id)
    .slice(0, RECENT_HISTORY_LIMIT);
  let maxHistoryDice = 0;
  for (const activity of history) {
    const d = diceCoefficient(ctx.descTokens, tokenize(activity.description));
    if (d > maxHistoryDice) maxHistoryDice = d;
  }
  const historyScore = maxHistoryDice >= 0.5 ? maxHistoryDice * W_HISTORY : 0;
  if (historyScore > 0) reason.push('mirip kegiatan sebelumnya di RK ini');

  // Sinyal 7 — frekuensi + kebaruan pemakaian (maks 10).
  const freqBase = Math.min(W_FREQUENCY, (Math.log(plan.usageCount + 1) / Math.log(21)) * 7);
  const recentBonus =
    plan.lastUsedAt &&
    Date.now() - new Date(plan.lastUsedAt).getTime() < RECENT_USAGE_DAYS * 86_400_000
      ? 3
      : 0;
  const frequencyScore = Math.min(W_FREQUENCY, freqBase + recentBonus);

  // Sinyal 8 — nama tim / RK atasan (maks 4).
  const teamTokens = discriminativeNameTokens(
    `${plan.teamName ?? ''} ${plan.parentPlanName ?? ''}`
  );
  const teamScore = diceCoefficient(ctx.descTokens, teamTokens) * W_TEAM;

  const total =
    keywordScore +
    domainScore +
    roleScore +
    nameScore +
    tagScore +
    historyScore +
    frequencyScore +
    teamScore;

  return { plan, score: Math.max(0, Math.min(100, Math.round(total))), reason };
}
