import { CONFUSABLE_PLAN_GROUPS } from '@/data/performance-plans-2026';
import { cleanText, diceCoefficient, tokenize } from './normalize';
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

/**
 * §12.1 — deterministic, no-LLM recommendation. Weights are calibrated (not
 * a literal transcription of the PRD fractions — see docs/ASSUMPTIONS.md)
 * so that the §12.1.5 required test cases pass on a freshly seeded,
 * zero-usage-history dataset: a couple of specific keyword hits is treated
 * as strong signal on its own, since this dataset's keywords were curated
 * to be discriminating terms, not generic words.
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

  const candidates = plans.filter((p) => p.isActive && p.year === year);
  const scored: RkRecommendation[] = candidates.map((plan) => score(plan, descTokens, descClean, activityTags, recentActivities));

  const byId = new Map(scored.map((s) => [s.plan.id, s]));
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

  void byId; // kept for readability of the lookup step above
  return combined.slice(0, MAX_RESULTS);
}

const MAX_LEARNED_KEYWORDS = 50;

/**
 * §12.1.4 — after the user picks a plan, fold any new description tokens
 * into its keyword list (cap 50, oldest/least-recently-added dropped first
 * to make room). Pure — caller persists the result.
 */
export function applyLocalLearning(plan: PerformancePlan, description: string): string[] {
  const existing = new Set(plan.keywords.map((k) => k.toLowerCase()));
  const newTokens = [...tokenize(description)].filter((t) => !existing.has(t));
  let keywords = [...plan.keywords, ...newTokens];
  if (keywords.length > MAX_LEARNED_KEYWORDS) {
    keywords = keywords.slice(keywords.length - MAX_LEARNED_KEYWORDS);
  }
  return keywords;
}

function score(
  plan: PerformancePlan,
  descTokens: Set<string>,
  descClean: string,
  activityTags: string[],
  recentActivities: Activity[]
): RkRecommendation {
  const reason: string[] = [];

  // Signal 1 — keyword matches (weight 40). Any specific match is trusted;
  // a second match saturates the signal.
  const matchedKeywords = plan.keywords.filter((kw) => descClean.includes(kw.toLowerCase()));
  const keywordScore = matchedKeywords.length >= 2 ? 40 : matchedKeywords.length === 1 ? 32 : 0;
  if (matchedKeywords.length > 0) reason.push(`kata kunci: ${matchedKeywords.join(', ')}`);

  // Signal 2 — Dice coefficient against the RK name (weight 20).
  const nameTokens = tokenize(plan.name);
  const nameDice = diceCoefficient(descTokens, nameTokens);
  const nameScore = nameDice * 20;

  // Signal 3 — tag intersection with the activity's own tags (weight 15).
  const planTagsLower = plan.tags.map((t) => t.toLowerCase());
  const matchedTags = activityTags.filter((t) => planTagsLower.includes(t.toLowerCase()));
  const tagScore = plan.tags.length > 0 ? (matchedTags.length / plan.tags.length) * 15 : 0;
  if (matchedTags.length > 0) reason.push(`tag: ${matchedTags.join(', ')}`);

  // Signal 4 — highest similarity vs this plan's last 50 activities (weight 10, Dice >= 0.5 gate).
  const history = recentActivities
    .filter((a) => a.performancePlanId === plan.id)
    .slice(0, RECENT_HISTORY_LIMIT);
  let maxHistoryDice = 0;
  for (const activity of history) {
    const d = diceCoefficient(descTokens, tokenize(activity.description));
    if (d > maxHistoryDice) maxHistoryDice = d;
  }
  const historyScore = maxHistoryDice >= 0.5 ? maxHistoryDice * 10 : 0;

  // Signal 5 — frequency + recency (weight 10).
  const freqBase = Math.min(10, (Math.log(plan.usageCount + 1) / Math.log(21)) * 7);
  const recentBonus =
    plan.lastUsedAt && Date.now() - new Date(plan.lastUsedAt).getTime() < RECENT_USAGE_DAYS * 86_400_000 ? 3 : 0;
  const frequencyScore = Math.min(10, freqBase + recentBonus);

  // Signal 6 — team/parent-plan name match (weight 5).
  const teamTokens = tokenize(`${plan.teamName ?? ''} ${plan.parentPlanName ?? ''}`);
  const teamScore = diceCoefficient(descTokens, teamTokens) * 5;

  const total = keywordScore + nameScore + tagScore + historyScore + frequencyScore + teamScore;

  return { plan, score: Math.round(total), reason };
}
