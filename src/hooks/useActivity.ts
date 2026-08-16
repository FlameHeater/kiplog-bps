import { useLiveQuery } from 'dexie-react-hooks';
import { activityRepository } from '@/db/repositories';

// undefined = loading; null = loaded, no such activity; Activity = found.
export function useActivity(id: string | null) {
  return useLiveQuery(async () => {
    if (!id) return null;
    return (await activityRepository.get(id)) ?? null;
  }, [id]);
}
