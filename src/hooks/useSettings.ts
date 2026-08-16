import { useLiveQuery } from 'dexie-react-hooks';
import { settingsRepository } from '@/db/repositories';

// See useUserProfile.ts for why `null` (not `undefined`) marks "loaded, none found".
export function useSettings() {
  return useLiveQuery(async () => (await settingsRepository.get()) ?? null, []);
}
