import { useLiveQuery } from 'dexie-react-hooks';
import { templateRepository } from '@/db/repositories';

export function useTemplates() {
  return useLiveQuery(() => templateRepository.list(), [], []);
}
