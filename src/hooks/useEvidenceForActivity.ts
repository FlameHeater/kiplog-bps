import { useLiveQuery } from 'dexie-react-hooks';
import { evidenceRepository } from '@/db/repositories';

export function useEvidenceForActivity(activityId: string | null) {
  return useLiveQuery(
    async () => (activityId ? evidenceRepository.listByActivity(activityId) : []),
    [activityId],
    []
  );
}
