import { useLiveQuery } from 'dexie-react-hooks';
import { activityRepository, templateRepository } from '@/db/repositories';

/** FR-TPL-05 — every tag already used across activities/templates, for autocomplete. */
export function useAllTags(): string[] {
  return useLiveQuery(
    async () => {
      const [activities, templates] = await Promise.all([activityRepository.list(), templateRepository.list()]);
      const tags = new Set<string>();
      for (const a of activities) for (const t of a.tags) tags.add(t);
      for (const t of templates) for (const tag of t.tags) tags.add(tag);
      return Array.from(tags).sort((a, b) => a.localeCompare(b));
    },
    [],
    []
  );
}
