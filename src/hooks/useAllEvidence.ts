import { useLiveQuery } from 'dexie-react-hooks';
import { evidenceRepository } from '@/db/repositories';

export function useAllEvidence() {
  return useLiveQuery(() => evidenceRepository.list(), [], []);
}

export function useUnassignedEvidenceCount() {
  return useLiveQuery(async () => (await evidenceRepository.listInbox()).length, [], 0);
}
