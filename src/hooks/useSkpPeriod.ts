import { useLiveQuery } from 'dexie-react-hooks';
import { skpPeriodRepository } from '@/db/repositories';

// undefined = loading; null = no record yet (never locked); SkpPeriod = found.
export function useSkpPeriod(skpPeriodId: string | null) {
  return useLiveQuery(async () => {
    if (!skpPeriodId) return null;
    return (await skpPeriodRepository.get(skpPeriodId)) ?? null;
  }, [skpPeriodId]);
}
