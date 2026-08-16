import { z } from 'zod';
import { ActivityStatusSchema, EvidenceLinkStatusSchema, RbAreaSchema } from './enums';
import {
  DateStringSchema,
  HttpUrlSchema,
  IsoTimestampSchema,
  ProgressSchema,
  SkpPeriodStringSchema,
  TimeStringSchema,
} from './primitives';

// Empty string ("" from a blank input) means "no link yet", not an invalid URL.
const OptionalEvidenceLinkSchema = z.preprocess(
  (val) => (val === '' ? null : val),
  HttpUrlSchema.nullable()
);

// Empty string ("") means "waktu tidak dicatat" — the user opted out of
// recording a time for this activity, a deliberate choice, not a
// validation error. Kept as `''` (not `null`) so every consumer that
// already treats these as plain strings (sorting, display, exports)
// keeps working without a type change; only the handful of places that
// compute/format a duration need to check for emptiness first.
const OptionalTimeStringSchema = z.union([TimeStringSchema, z.literal('')]);

// Fields mapped 1:1 to the KipApp Add form, in KipApp's exact order (§2.2, FR-ACT-02).
const ActivityCoreFieldsSchema = z.object({
  date: DateStringSchema,
  startTime: OptionalTimeStringSchema,
  endTime: OptionalTimeStringSchema,
  description: z.string().min(1, 'Deskripsi kegiatan wajib diisi'),
  progress: ProgressSchema,
  achievement: z.string(),
  evidenceLink: OptionalEvidenceLinkSchema,
  countsTowardSkp: z.boolean(),
});

const TIME_ORDER_MESSAGE = { message: 'Jam selesai harus setelah jam mulai', path: ['endTime'] };
// Only enforce start < end when the user filled in BOTH times — an empty
// pair (opted out) or a half-filled pair (still typing) isn't an ordering
// error, it's just not a complete time range yet.
const timeOrderValid = (data: { startTime: string; endTime: string }) =>
  !data.startTime || !data.endTime || data.endTime > data.startTime;

export const ActivityFormSchema = ActivityCoreFieldsSchema.refine(timeOrderValid, TIME_ORDER_MESSAGE);

// Full edit form: core KipApp-order fields + KipLog-only fields the user can set.
export const ActivityEditFormSchema = ActivityCoreFieldsSchema.extend({
  performancePlanId: z.string().uuid().nullable(),
  location: z.string().optional(),
  tags: z.array(z.string()).default([]),
  rbAreas: z.array(RbAreaSchema).default([]),
}).refine(timeOrderValid, TIME_ORDER_MESSAGE);

export const ActivitySchema = z.object({
  id: z.string().uuid(),

  date: DateStringSchema,
  startTime: OptionalTimeStringSchema,
  endTime: OptionalTimeStringSchema,
  description: z.string().min(1),
  progress: ProgressSchema,
  achievement: z.string(),
  evidenceLink: HttpUrlSchema.nullable(),
  countsTowardSkp: z.boolean().default(true),

  year: z.number().int(),
  skpPeriod: SkpPeriodStringSchema,
  performancePlanId: z.string().uuid().nullable(),

  durationMinutes: z.number().int(),
  status: ActivityStatusSchema.default('draft'),
  evidenceLinkStatus: EvidenceLinkStatusSchema.default('none'),
  location: z.string().optional(),
  project: z.string().optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).default([]),
  rbAreas: z.array(RbAreaSchema).default([]),
  evidenceCount: z.number().int().default(0),
  reportedAt: IsoTimestampSchema.nullable(),
  sentForReview: z.boolean().default(false),
  templateId: z.string().uuid().nullable(),

  createdAt: IsoTimestampSchema,
  updatedAt: IsoTimestampSchema,
});
