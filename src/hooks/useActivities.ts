import { useLiveQuery } from 'dexie-react-hooks';
import { activityRepository } from '@/db/repositories';

export function useActivities() {
  return useLiveQuery(() => activityRepository.list(), [], []);
}
