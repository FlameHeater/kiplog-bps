import { formatIndonesianDate } from '@/lib/date/date-utils';
import type { ActivityEditFormValues, ActivityTemplate } from '@/types';

/**
 * FR-TPL-02/04: fills form fields from a template. Everything returned
 * stays editable — this never saves anything itself. `achievementTemplate`
 * supports `{{deskripsi}}` (the resolved description) and `{{tanggal}}`.
 */
export function applyTemplate(
  template: ActivityTemplate,
  date: string
): Partial<ActivityEditFormValues> {
  const description = template.descriptionTemplate;
  const achievement = template.achievementTemplate
    .split('{{deskripsi}}')
    .join(description)
    .split('{{tanggal}}')
    .join(formatIndonesianDate(date));

  return {
    description,
    achievement,
    progress: template.defaultProgress,
    startTime: template.defaultStartTime,
    endTime: template.defaultEndTime,
    location: template.defaultLocation,
    countsTowardSkp: template.defaultCountsTowardSkp,
    performancePlanId: template.performancePlanId,
    tags: template.tags,
    rbAreas: template.rbAreas,
  };
}
