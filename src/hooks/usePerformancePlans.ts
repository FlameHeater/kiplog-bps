import { useLiveQuery } from 'dexie-react-hooks';
import { performancePlanRepository } from '@/db/repositories';

export function usePerformancePlans() {
  return useLiveQuery(() => performancePlanRepository.list(), [], []);
}
