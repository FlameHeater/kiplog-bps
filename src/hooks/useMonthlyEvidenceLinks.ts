import { useLiveQuery } from 'dexie-react-hooks';
import { listMonthlyEvidenceLinks } from '@/lib/services/monthly-evidence-link';

export function useMonthlyEvidenceLinks() {
  return useLiveQuery(() => listMonthlyEvidenceLinks(), [], []);
}
