import { formatIndonesianDate } from '@/lib/date/date-utils';
import { RbAreaSchema } from '@/lib/validation/enums';
import type { Activity, Evidence, PerformancePlan, UserProfile } from '@/types';
import logoBpsUrl from '@/assets/logo-bps.png';
import logoRbUrl from '@/assets/logo-rb.png';

const RB_AREAS = RbAreaSchema.options;
// A4 width (595pt) minus 2cm margins each side (~56.7pt) minus a little table padding.
const CONTENT_WIDTH_PT = 470;

export interface PdfActivityInput {
  activity: Activity;
  plan: PerformancePlan | null;
  evidence: Evidence[];
}

async function loadPdfMake() {
  const [{ default: pdfMake }, { default: vfs }] = await Promise.all([
    import('pdfmake/build/pdfmake'),
    import('pdfmake/build/vfs_fonts'),
  ]);
  pdfMake.vfs = vfs;
  return pdfMake;
}

async function isImageDecodable(blob: Blob): Promise<boolean> {
  try {
    const bitmap = await createImageBitmap(blob);
    bitmap.close();
    return true;
  } catch {
    return false;
  }
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error as DOMException);
    reader.readAsDataURL(blob);
  });
}

// §13.1 checkbox — drawn as a canvas rect (filled when checked) instead of a
// text glyph, since Roboto has no guaranteed ☑/☐ glyph.
function rbCheckboxRow(label: string, checked: boolean): Record<string, unknown> {
  return {
    columnGap: 3,
    margin: [0, 1, 0, 1],
    columns: [
      {
        width: 8,
        canvas: [
          {
            type: 'rect',
            x: 0,
            y: 1,
            w: 7,
            h: 7,
            lineWidth: 0.75,
            lineColor: '#000000',
            color: checked ? '#000000' : undefined,
          },
        ],
      },
      { width: '*', text: label, fontSize: 7.5 },
    ],
  };
}

// The office's own Word template (Template Data Dukung Laporan
// Kipapp.docx) embeds its kop as one flattened image containing both
// logos; these two PNGs are that same image cropped to just the logo
// regions (Reformasi Birokrasi has no per-profile source in KipLog's
// schema, but the official artwork itself isn't user-specific data, so
// it's bundled as a static asset rather than left blank).
let officialLogosPromise: Promise<{ bps: string; rb: string }> | null = null;
async function loadOfficialLogos(): Promise<{ bps: string; rb: string }> {
  officialLogosPromise ??= Promise.all([
    fetch(logoBpsUrl).then((r) => r.blob()).then(blobToDataUrl),
    fetch(logoRbUrl).then((r) => r.blob()).then(blobToDataUrl),
  ]).then(([bps, rb]) => ({ bps, rb }));
  return officialLogosPromise;
}

async function buildKop(activity: Activity, profile: UserProfile): Promise<Record<string, unknown>> {
  const checked = new Set(activity.rbAreas);
  const leftAreas = RB_AREAS.slice(0, 4);
  const rightAreas = RB_AREAS.slice(4, 8);
  const officialLogos = await loadOfficialLogos();
  // A user-uploaded unit logo (different BPS Kabupaten/Kota offices may
  // use their own variant) takes priority; the official BPS artwork is
  // the default rather than a blank box now that we have it.
  const leftLogoSrc = profile.logoDataUrl ?? officialLogos.bps;
  const leftLogoBox = { image: leftLogoSrc, width: 60, height: 60 };

  return {
    columnGap: 8,
    columns: [
      { width: 60, stack: [leftLogoBox] },
      {
        width: '*',
        margin: [8, 0, 8, 0],
        columnGap: 8,
        columns: [
          { width: '*', stack: leftAreas.map((area) => rbCheckboxRow(area, checked.has(area))) },
          { width: '*', stack: rightAreas.map((area) => rbCheckboxRow(area, checked.has(area))) },
        ],
      },
      { width: 60, stack: [{ image: officialLogos.rb, width: 60, height: 60 }] },
    ],
  };
}

function buildFieldTable(
  activity: Activity,
  plan: PerformancePlan | null,
  profile: UserProfile,
  dateRange: string
): Record<string, unknown> {
  const rows: [string, string, boolean][] = [
    ['Tanggal', dateRange, false],
    ['Waktu Kegiatan', activity.startTime && activity.endTime ? `${activity.startTime} - ${activity.endTime}` : '-', false],
    ['Kegiatan', activity.description, false],
    ['Capaian', activity.achievement, false],
    ['Progress', String(activity.progress), false],
    ['Rencana Kinerja', plan ? (plan.displayName ?? plan.name) : '-', false],
    ['Pelaksana', profile.name, true],
    ['NIP', profile.nip, false],
  ];

  // Matches the office's own reference template (Template Data Dukung
  // Laporan Kipapp.docx): each row gets a top border (a horizontal rule
  // above every field), plus a closing bottom border under the last row —
  // no vertical lines. Word gets this "for free" from its TableGrid style
  // with only left/right/insideV switched off; pdfmake has no named table
  // styles, so it's set explicitly per cell here.
  const lastIndex = rows.length - 1;
  return {
    margin: [0, 0, 0, 10],
    table: {
      widths: [110, 10, '*'],
      body: rows.map(([label, value, bold], index) => {
        const border: [boolean, boolean, boolean, boolean] = [false, true, false, index === lastIndex];
        return [
          { text: label, bold: true, border, margin: [0, 3, 0, 3] },
          { text: ':', border, margin: [0, 3, 0, 3] },
          { text: value, bold, border, margin: [0, 3, 0, 3] },
        ];
      }),
    },
    layout: {
      hLineWidth: () => 0.75,
      vLineWidth: () => 0,
      hLineColor: () => '#000000',
    },
  };
}

async function buildEvidenceContent(evidence: Evidence[]): Promise<Record<string, unknown>[]> {
  if (evidence.length === 0) {
    return [{ text: 'Tidak ada bukti dukung terlampir.', italics: true, color: '#6b7280', fontSize: 10 }];
  }

  const nodes: Record<string, unknown>[] = [];
  for (const item of evidence) {
    if (item.kind === 'link') {
      nodes.push({
        unbreakable: true,
        margin: [0, 0, 0, 6],
        text: [
          { text: '• ', bold: true },
          { text: item.linkTitle || item.url || '', link: item.url, color: '#2563eb', decoration: 'underline' },
        ],
      });
      continue;
    }

    const isImage = (item.mimeType ?? '').startsWith('image/');
    // A corrupt/undecodable image left pdfmake's internal image loader stuck
    // forever (getBlob's callback never fires — no error, no timeout). Decode
    // it ourselves first so a bad file degrades to a text reference instead
    // of hanging the whole report generation indefinitely.
    const decodable = isImage && item.blob ? await isImageDecodable(item.blob) : false;
    if (isImage && item.blob && decodable) {
      const dataUrl = await blobToDataUrl(item.blob);
      const stack: Record<string, unknown>[] = [{ image: dataUrl, fit: [CONTENT_WIDTH_PT, 320], alignment: 'center' }];
      if (item.caption) {
        stack.push({ text: item.caption, fontSize: 9, italics: true, alignment: 'center', margin: [0, 2, 0, 0] });
      }
      // FR-RPT-04: images that don't fit the remaining page space move whole to the next page.
      nodes.push({ unbreakable: true, margin: [0, 0, 0, 10], stack });
    } else {
      const suffix = isImage && item.blob && !decodable ? ' — gambar tidak dapat dibaca' : '';
      nodes.push({
        unbreakable: true,
        margin: [0, 0, 0, 6],
        text: `• ${item.fileName ?? 'Berkas'} (${item.category})${suffix}`,
        fontSize: 10,
      });
    }
  }
  return nodes;
}

async function buildActivitySection(item: PdfActivityInput, profile: UserProfile): Promise<Record<string, unknown>[]> {
  const { activity, plan, evidence } = item;
  const dateRange = `${formatIndonesianDate(activity.date)} - ${formatIndonesianDate(activity.date)}`;
  const evidenceContent = await buildEvidenceContent(evidence);
  const kop = await buildKop(activity, profile);

  return [
    kop,
    { text: 'Data Dukung Laporan Kegiatan', bold: true, fontSize: 13, alignment: 'center', margin: [0, 12, 0, 12] },
    buildFieldTable(activity, plan, profile, dateRange),
    {
      table: {
        widths: ['*'],
        body: [[{ stack: [{ text: 'Bukti Dukung', bold: true, margin: [0, 0, 0, 6] }, ...evidenceContent] }]],
      },
    },
  ];
}

// FR-RPT-01/02: one activity per PDF, or many activities in one combined
// document (a page break separates each activity's section).
export async function generateDataDukungPdf(items: PdfActivityInput[], profile: UserProfile): Promise<Blob> {
  const pdfMake = await loadPdfMake();
  const content: Record<string, unknown>[] = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (!item) continue;
    const section = await buildActivitySection(item, profile);
    if (i > 0) section[0] = { ...section[0], pageBreak: 'before' };
    content.push(...section);
  }

  const docDefinition = {
    pageSize: 'A4',
    pageOrientation: 'portrait',
    pageMargins: [56.7, 56.7, 56.7, 56.7],
    defaultStyle: { font: 'Roboto', fontSize: 11 },
    content,
  };

  const pdf = pdfMake.createPdf(docDefinition);
  return new Promise((resolve) => pdf.getBlob((blob) => resolve(blob)));
}
