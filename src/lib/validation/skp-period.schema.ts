import { z } from 'zod';
import { KipAppStatusSchema } from './enums';
import { IsoTimestampSchema, SkpPeriodStringSchema } from './primitives';

export const SkpPeriodSchema = z.object({
  id: SkpPeriodStringSchema, // "2026-08"
  year: z.number().int(),
  month: z.number().int().min(1).max(12),
  kipAppStatus: KipAppStatusSchema.default('sedang_dibuat'),
  isLocked: z.boolean().default(false),
  lockedAt: IsoTimestampSchema.nullable(),
  notes: z.string().optional(),
  updatedAt: IsoTimestampSchema,
});

export const PlanPeriodStatusSchema = z.object({
  id: z.string(), // `${planId}:${skpPeriod}`
  performancePlanId: z.string().uuid(),
  skpPeriod: SkpPeriodStringSchema,
  isCompleted: z.boolean().default(false),
  completedAt: IsoTimestampSchema.nullable(),
});
