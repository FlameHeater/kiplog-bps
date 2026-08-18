import { z } from 'zod';
import { IsoTimestampSchema } from './primitives';

export const UserProfileSchema = z.object({
  id: z.literal('me'),
  name: z.string().min(1, 'Nama wajib diisi'),
  nip: z.string().regex(/^\d{18}$/, 'NIP harus 18 digit angka'),
  position: z.string().min(1, 'Jabatan wajib diisi'),
  unit: z.string().min(1, 'Unit Kerja wajib diisi'),
  email: z.string().email().optional().or(z.literal('')),
  // Foto pegawai, tampil di sidebar dan topbar. Opsional supaya profil lama
  // tetap sah tanpa migrasi.
  photoDataUrl: z.string().optional(),
  // Logo unit kerja, dipakai di kop PDF Data Dukung (§13.1).
  logoDataUrl: z.string().optional(),
  defaultYear: z.number().int(),
  timezone: z.string().default('Asia/Makassar'),
  updatedAt: IsoTimestampSchema,
});

// Form-only shape (no id/updatedAt) — those are filled in on submit.
export const UserProfileFormSchema = UserProfileSchema.omit({ id: true, updatedAt: true });
