import { z } from 'zod';
import { EvidenceCategorySchema, EvidenceKindSchema, InboxStatusSchema, LinkProviderSchema } from './enums';
import { IsoTimestampSchema } from './primitives';

export const EvidenceSchema = z.object({
  id: z.string().uuid(),
  activityId: z.string().uuid().nullable(), // null = Evidence Inbox
  kind: EvidenceKindSchema,

  blob: z.instanceof(Blob).optional(),
  thumbnailBlob: z.instanceof(Blob).optional(),
  fileName: z.string().optional(),
  mimeType: z.string().optional(),
  size: z.number().optional(),

  url: z.string().optional(),
  linkTitle: z.string().optional(),
  linkProvider: LinkProviderSchema.optional(),

  caption: z.string().default(''),
  category: EvidenceCategorySchema,
  sortOrder: z.number().int().default(0),
  inboxStatus: InboxStatusSchema.default('unassigned'),
  capturedAt: IsoTimestampSchema.nullable(),
  createdAt: IsoTimestampSchema,
  updatedAt: IsoTimestampSchema,
});

// FR-EVD-03 — supported upload types.
export const SUPPORTED_EVIDENCE_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
] as const;
