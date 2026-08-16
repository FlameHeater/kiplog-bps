import type { Activity, Evidence, PerformancePlan } from '@/types';
import { buildActivityReportRows } from './activity-rows';

const COLUMNS = [
  'Tanggal',
  'Hari',
  'Jam Mulai',
  'Jam Selesai',
  'Durasi (menit)',
  'Periode SKP',
  'Rencana Kinerja',
  'Jenis RK',
  'Kegiatan',
  'Capaian',
  'Progress',
  'Status Capaian (Capaian SKP)',
  'Link Bukti Dukung',
  'Status KipLog',
  'Jumlah Bukti',
  'Nama Bukti',
  'Kategori',
  'Tag',
  'Lokasi',
  'Catatan',
] as const;

// §13.2: header row frozen, auto-filter on, column widths adjusted, dates
// as real date values, Progress as an integer.
export async function generateActivityExcel(
  activities: Activity[],
  planById: Map<string, PerformancePlan>,
  evidenceByActivityId: Map<string, Evidence[]>
): Promise<Blob> {
  const ExcelJS = (await import('exceljs')).default;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'KipLog BPS';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Kegiatan', {
    views: [{ state: 'frozen', ySplit: 1 }],
  });

  sheet.columns = COLUMNS.map((header) => ({
    header,
    key: header,
    width: header === 'Kegiatan' || header === 'Capaian' ? 40 : header === 'Link Bukti Dukung' ? 30 : 18,
  }));
  sheet.getRow(1).font = { bold: true };

  const rows = buildActivityReportRows(activities, planById, evidenceByActivityId);
  for (const row of rows) {
    const excelRow = sheet.addRow(row);
    excelRow.getCell('Tanggal').numFmt = 'dd/mm/yyyy';
    excelRow.getCell('Progress').numFmt = '0';
  }

  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: COLUMNS.length } };

  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}
