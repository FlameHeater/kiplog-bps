import { useLiveQuery } from 'dexie-react-hooks';
import { userProfileRepository } from '@/db/repositories';

// undefined = still loading; null = loaded, no profile yet; UserProfile = found.
// Coercing the "not found" case to `null` keeps it distinguishable from the
// hook's own `undefined` loading sentinel — both would otherwise collapse to
// `undefined` since a missing profile IS `undefined` from Dexie.
export function useUserProfile() {
  return useLiveQuery(async () => (await userProfileRepository.get()) ?? null, []);
}
