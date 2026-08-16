import type { ActivityStatus } from '@/types';

export const ACTIVITY_STATUS_LABELS: Record<ActivityStatus, string> = {
  draft: 'Draft',
  complete: 'Lengkap',
  ready_to_report: 'Siap Lapor',
  reported: 'Sudah Dilaporkan',
  archived: 'Diarsipkan',
};

export const ACTIVITY_STATUS_OPTIONS: { value: ActivityStatus; label: string }[] = (
  Object.entries(ACTIVITY_STATUS_LABELS) as [ActivityStatus, string][]
).map(([value, label]) => ({ value, label }));
