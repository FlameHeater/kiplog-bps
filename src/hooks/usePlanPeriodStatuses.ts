import { useLiveQuery } from 'dexie-react-hooks';
import { skpPeriodRepository } from '@/db/repositories';

// Map<performancePlanId, isCompleted> for the given SKP period — undefined while loading.
export function usePlanPeriodStatuses(skpPeriod: string) {
  return useLiveQuery(async () => {
    const all = await skpPeriodRepository.listPlanStatus();
    return new Map(all.filter((s) => s.skpPeriod === skpPeriod).map((s) => [s.performancePlanId, s.isCompleted]));
  }, [skpPeriod]);
}
