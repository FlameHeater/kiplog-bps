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

// Fields mapped 1:1 to the KipApp Add form, in KipApp's exact order (§2.2, FR-ACT-02).
const ActivityCoreFieldsSchema = z.object({
  date: DateStringSchema,
  startTime: TimeStringSchema,
  endTime: TimeStringSchema,
  description: z.string().min(1, 'Deskripsi kegiatan wajib diisi'),
  progress: ProgressSchema,
  achievement: z.string(),
  evidenceLink: OptionalEvidenceLinkSchema,
  countsTowardSkp: z.boolean(),
});

const TIME_ORDER_MESSAGE = { message: 'Jam selesai harus setelah jam mulai', path: ['endTime'] };

export const ActivityFormSchema = ActivityCoreFieldsSchema.refine(
  (data) => data.endTime > data.startTime,
  TIME_ORDER_MESSAGE
);

// Full edit form: core KipApp-order fields + KipLog-only fields the user can set.
export const ActivityEditFormSchema = ActivityCoreFieldsSchema.extend({
  performancePlanId: z.string().uuid().nullable(),
  location: z.string().optional(),
  tags: z.array(z.string()).default([]),
  rbAreas: z.array(RbAreaSchema).default([]),
}).refine((data) => data.endTime > data.startTime, TIME_ORDER_MESSAGE);

export const ActivitySchema = z.object({
  id: z.string().uuid(),

  date: DateStringSchema,
  startTime: TimeStringSchema,
  endTime: TimeStringSchema,
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
