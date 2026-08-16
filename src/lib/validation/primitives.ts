import { z } from 'zod';

// PRD §9.1 — string-based date/time to avoid timezone drift. Never use Date objects for these.
export const DateStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD');

export const TimeStringSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Format jam harus HH:mm (24 jam)');

export const SkpPeriodStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}$/, 'Format periode SKP harus YYYY-MM');

export const IsoTimestampSchema = z.string().datetime();

export const ProgressSchema = z.number().int().min(0).max(100);

// SEC-05: only http(s) allowed. Rejects javascript:, data:, file:, and malformed input.
export const HttpUrlSchema = z
  .string()
  .refine((val) => {
    try {
      const parsed = new URL(val);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  }, 'Link bukti dukung harus diawali https:// atau http://.');
