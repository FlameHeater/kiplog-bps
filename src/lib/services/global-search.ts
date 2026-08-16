import type { Activity, Evidence, PerformancePlan } from '@/types';

export interface SearchResult {
  type: 'activity' | 'evidence';
  id: string;
  activityId: string | null; // navigation target — for evidence, its parent activity (if any)
  title: string;
  snippet: string;
  matchStart: number;
  matchLength: number;
}

const SNIPPET_RADIUS = 40;

function buildSnippet(text: string, query: string): { snippet: string; matchStart: number; matchLength: number } | null {
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return null;
  const start = Math.max(0, idx - SNIPPET_RADIUS);
  const end = Math.min(text.length, idx + query.length + SNIPPET_RADIUS);
  const prefix = start > 0 ? '…' : '';
  const suffix = end < text.length ? '…' : '';
  return {
    snippet: prefix + text.slice(start, end) + suffix,
    matchStart: idx - start + prefix.length,
    matchLength: query.length,
  };
}

/**
 * FR-SCH-01: searches description/achievement/RK name/tags/location/notes
 * on activities, and fileName/caption on evidence. Case-insensitive
 * substring match, one snippet per hit from the first matching field.
 */
export function searchAll(
  query: string,
  activities: Activity[],
  evidence: Evidence[],
  plans: PerformancePlan[]
): SearchResult[] {
  const q = query.trim();
  if (!q) return [];
  const planById = new Map(plans.map((p) => [p.id, p]));

  const activityResults: SearchResult[] = [];
  for (const activity of activities) {
    const plan = activity.performancePlanId ? planById.get(activity.performancePlanId) : undefined;
    const fields: [string, string][] = [
      ['description', activity.description],
      ['achievement', activity.achievement],
      ['plan', plan?.name ?? ''],
      ['tags', activity.tags.join(', ')],
      ['location', activity.location ?? ''],
      ['notes', activity.notes ?? ''],
    ];
    for (const [, text] of fields) {
      const hit = buildSnippet(text, q);
      if (hit) {
        activityResults.push({
          type: 'activity',
          id: activity.id,
          activityId: activity.id,
          title: activity.description || '(tanpa deskripsi)',
          ...hit,
        });
        break;
      }
    }
  }

  const evidenceResults: SearchResult[] = [];
  for (const item of evidence) {
    const fields: [string, string][] = [
      ['fileName', item.fileName ?? item.linkTitle ?? ''],
      ['caption', item.caption],
    ];
    for (const [, text] of fields) {
      const hit = buildSnippet(text, q);
      if (hit) {
        evidenceResults.push({
          type: 'evidence',
          id: item.id,
          activityId: item.activityId,
          title: item.fileName ?? item.linkTitle ?? 'Tautan',
          ...hit,
        });
        break;
      }
    }
  }

  return [...activityResults, ...evidenceResults];
}
