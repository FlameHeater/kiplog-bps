import { calculateDurationMinutes } from './activity-fields';

export interface ValidationCheck {
  field: string; // matches a form field id, for "jump to field"
  label: string;
  passed: boolean;
  message?: string;
}

export interface ValidationResult {
  isReady: boolean;
  checks: ValidationCheck[];
}

export interface ReadyToReportInput {
  date: string;
  startTime: string;
  endTime: string;
  performancePlanId: string | null;
  planExists: boolean;
  description: string;
  achievement: string;
  progress: number;
  evidenceCount: number;
  evidenceLink: string | null;
}

export interface ReadyToReportOptions {
  requireEvidenceForReady: boolean;
  requireEvidenceLinkForReady: boolean;
  periodLocked: boolean;
}

const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;
const MIN_DURATION_MIN = 5;
const MAX_DURATION_MIN = 12 * 60;
const MIN_TEXT_LENGTH = 10;

/** §12.3 — pure validator; the form renders this live, not just on submit. */
export function validateReadyToReport(
  input: ReadyToReportInput,
  options: ReadyToReportOptions
): ValidationResult {
  const checks: ValidationCheck[] = [];

  const dateValid = /^\d{4}-\d{2}-\d{2}$/.test(input.date);
  const dateNotTooFarFuture =
    dateValid && new Date(input.date).getTime() - Date.now() <= ONE_YEAR_MS;
  checks.push({
    field: 'date',
    label: 'Tanggal',
    passed: dateValid && dateNotTooFarFuture,
    message: !dateValid
      ? 'Tanggal tidak valid'
      : !dateNotTooFarFuture
        ? 'Tanggal tidak boleh lebih dari 1 tahun ke depan'
        : undefined,
  });

  const timesFilled = Boolean(input.startTime) && Boolean(input.endTime);
  const durationMinutes = timesFilled ? calculateDurationMinutes(input.startTime, input.endTime) : 0;
  const timeOrderOk = timesFilled && input.endTime > input.startTime;
  const durationOk = timeOrderOk && durationMinutes >= MIN_DURATION_MIN && durationMinutes <= MAX_DURATION_MIN;
  checks.push({
    field: 'startTime',
    label: 'Waktu',
    passed: timesFilled && timeOrderOk && durationOk,
    message: !timesFilled
      ? 'Jam mulai dan selesai wajib diisi'
      : !timeOrderOk
        ? 'Jam selesai harus setelah jam mulai'
        : !durationOk
          ? 'Durasi harus antara 5 menit dan 12 jam'
          : undefined,
  });

  checks.push({
    field: 'performancePlanId',
    label: 'Rencana Kinerja',
    passed: input.performancePlanId !== null && input.planExists,
    message:
      input.performancePlanId === null
        ? 'Pilih Rencana Kinerja'
        : !input.planExists
          ? 'Rencana Kinerja yang dipilih tidak lagi tersedia'
          : undefined,
  });

  checks.push({
    field: 'description',
    label: 'Deskripsi Kegiatan',
    passed: input.description.trim().length >= MIN_TEXT_LENGTH,
    message: `Minimal ${MIN_TEXT_LENGTH} karakter`,
  });

  checks.push({
    field: 'achievement',
    label: 'Capaian Hasil Kegiatan',
    passed: input.achievement.trim().length >= MIN_TEXT_LENGTH,
    message: `Minimal ${MIN_TEXT_LENGTH} karakter`,
  });

  checks.push({
    field: 'progress',
    label: 'Progress',
    passed: Number.isInteger(input.progress) && input.progress >= 0 && input.progress <= 100,
  });

  if (options.requireEvidenceForReady) {
    checks.push({
      field: 'evidence',
      label: 'Bukti Dukung',
      passed: input.evidenceCount >= 1,
      message: 'Tambahkan minimal satu bukti dukung',
    });
  }

  if (options.requireEvidenceLinkForReady) {
    const linkValid = isHttpUrl(input.evidenceLink);
    checks.push({
      field: 'evidenceLink',
      label: 'Link Bukti Dukung',
      passed: linkValid,
      message: 'Link bukti dukung harus diawali https:// atau http://.',
    });
  }

  checks.push({
    field: 'period',
    label: 'Periode',
    passed: !options.periodLocked,
    message: 'Periode SKP ini sudah Anda tandai terkunci. Buka kunci di halaman KipApp Ready jika ini keliru.',
  });

  return { isReady: checks.every((c) => c.passed), checks };
}

function isHttpUrl(value: string | null): boolean {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}
