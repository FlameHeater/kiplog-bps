import type { Evidence } from '@/types';

// `evidenceRepository.list()` returns Dexie's primary-key order (effectively
// random for UUID ids), not `sortOrder` — every caller that groups it by
// activity must re-sort within each group or evidence appears in the PDF/
// Excel/ZIP in an arbitrary order instead of the order the user arranged it.
export function groupEvidenceByActivity(evidence: Evidence[]): Map<string, Evidence[]> {
  const map = new Map<string, Evidence[]>();
  for (const item of evidence) {
    if (!item.activityId) continue;
    const list = map.get(item.activityId) ?? [];
    list.push(item);
    map.set(item.activityId, list);
  }
  for (const list of map.values()) list.sort((a, b) => a.sortOrder - b.sortOrder);
  return map;
}
