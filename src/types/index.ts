// ARCH-03: domain types are defined once here, derived from the Zod schemas
// in src/lib/validation/ via z.infer. Never hand-write a parallel interface.
import type { z } from 'zod';
import type {
  ActivityEditFormSchema,
  ActivityFormSchema,
  ActivitySchema,
  ActivityStatusSchema,
  ActivityTemplateFormSchema,
  ActivityTemplateSchema,
  AppSettingsFormSchema,
  AppSettingsSchema,
  EvidenceCategorySchema,
  EvidenceKindSchema,
  EvidenceLinkStatusSchema,
  EvidenceSchema,
  InboxStatusSchema,
  KipAppStatusSchema,
  LinkProviderSchema,
  PerformancePlanSchema,
  PlanPeriodStatusSchema,
  PlanTypeSchema,
  RbAreaSchema,
  SkpPeriodSchema,
  UserProfileFormSchema,
  UserProfileSchema,
} from '@/lib/validation';

export type UserProfile = z.infer<typeof UserProfileSchema>;
export type UserProfileFormValues = z.infer<typeof UserProfileFormSchema>;
export type PerformancePlan = z.infer<typeof PerformancePlanSchema>;
export type SkpPeriod = z.infer<typeof SkpPeriodSchema>;
export type PlanPeriodStatus = z.infer<typeof PlanPeriodStatusSchema>;
export type Activity = z.infer<typeof ActivitySchema>;
export type ActivityForm = z.infer<typeof ActivityFormSchema>;
export type ActivityEditFormValues = z.infer<typeof ActivityEditFormSchema>;
export type Evidence = z.infer<typeof EvidenceSchema>;
export type ActivityTemplate = z.infer<typeof ActivityTemplateSchema>;
export type ActivityTemplateFormValues = z.infer<typeof ActivityTemplateFormSchema>;
export type AppSettings = z.infer<typeof AppSettingsSchema>;
export type AppSettingsFormValues = z.infer<typeof AppSettingsFormSchema>;

export type ActivityStatus = z.infer<typeof ActivityStatusSchema>;
export type EvidenceLinkStatus = z.infer<typeof EvidenceLinkStatusSchema>;
export type EvidenceCategory = z.infer<typeof EvidenceCategorySchema>;
export type RbArea = z.infer<typeof RbAreaSchema>;
export type PlanType = z.infer<typeof PlanTypeSchema>;
export type KipAppStatus = z.infer<typeof KipAppStatusSchema>;
export type EvidenceKind = z.infer<typeof EvidenceKindSchema>;
export type InboxStatus = z.infer<typeof InboxStatusSchema>;
export type LinkProvider = z.infer<typeof LinkProviderSchema>;
