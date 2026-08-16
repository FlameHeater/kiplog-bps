import { z } from 'zod';
import { PlanTypeSchema } from './enums';
import { IsoTimestampSchema } from './primitives';

export const PerformancePlanSchema = z.object({
  id: z.string().uuid(),
  year: z.number().int(),
  type: PlanTypeSchema,
  // VERBATIM from source (DR-01) — never auto-correct typos here.
  name: z.string().min(1),
  displayName: z.string().optional(),
  parentPlanName: z.string().optional(),
  teamName: z.string().optional(),
  teamLeader: z.string().optional(),
  category: z.string().nullable(),
  description: z.string().optional(),
  keywords: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  color: z.string(),
  isActive: z.boolean().default(true),
  isFavorite: z.boolean().default(false),
  sortOrder: z.number().int().default(0),
  usageCount: z.number().int().default(0),
  lastUsedAt: IsoTimestampSchema.nullable(),
  createdAt: IsoTimestampSchema,
  updatedAt: IsoTimestampSchema,
});
