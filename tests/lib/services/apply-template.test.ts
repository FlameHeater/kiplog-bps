import { describe, expect, it } from 'vitest';
import { applyTemplate } from '@/lib/services/apply-template';
import type { ActivityTemplate } from '@/types';

const template: ActivityTemplate = {
  id: 'tmpl-1',
  name: 'Monitoring PPL',
  performancePlanId: 'plan-16',
  descriptionTemplate: 'Monitoring progres listing SE2026',
  achievementTemplate: 'Terlaksananya {{deskripsi}} pada {{tanggal}}',
  defaultProgress: 25,
  defaultStartTime: '08:00',
  defaultEndTime: '10:00',
  defaultLocation: 'Kecamatan Tejakula',
  defaultCountsTowardSkp: true,
  tags: ['SE2026', 'Monitoring'],
  rbAreas: [],
  usageCount: 0,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('applyTemplate', () => {
  it('substitutes {{deskripsi}} and {{tanggal}} in the achievement text', () => {
    const result = applyTemplate(template, '2026-08-02');
    expect(result.description).toBe('Monitoring progres listing SE2026');
    expect(result.achievement).toBe(
      'Terlaksananya Monitoring progres listing SE2026 pada 02 Agustus 2026'
    );
  });

  it('copies every default field, all still overridable by the caller', () => {
    const result = applyTemplate(template, '2026-08-02');
    expect(result.progress).toBe(25);
    expect(result.startTime).toBe('08:00');
    expect(result.location).toBe('Kecamatan Tejakula');
    expect(result.performancePlanId).toBe('plan-16');
    expect(result.tags).toEqual(['SE2026', 'Monitoring']);
  });
});
