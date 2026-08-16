import { z } from 'zod';
import { RbAreaSchema } from './enums';
import { IsoTimestampSchema, ProgressSchema, TimeStringSchema } from './primitives';

export const ActivityTemplateSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, 'Nama template wajib diisi'),
  performancePlanId: z.string().uuid().nullable(),
  descriptionTemplate: z.string(),
  achievementTemplate: z.string(), // supports {{deskripsi}} and {{tanggal}}
  defaultProgress: ProgressSchema.default(0),
  defaultStartTime: TimeStringSchema.optional(),
  defaultEndTime: TimeStringSchema.optional(),
  defaultLocation: z.string().optional(),
  defaultCountsTowardSkp: z.boolean().default(true),
  tags: z.array(z.string()).default([]),
  rbAreas: z.array(RbAreaSchema).default([]),
  usageCount: z.number().int().default(0),
  createdAt: IsoTimestampSchema,
  updatedAt: IsoTimestampSchema,
});

// FR-TPL-07: name is required to save. Everything else can start empty.
export const ActivityTemplateFormSchema = ActivityTemplateSchema.omit({
  id: true,
  usageCount: true,
  createdAt: true,
  updatedAt: true,
});
