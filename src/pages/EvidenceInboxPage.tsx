import { useMemo, useState } from 'react';
import { PageHeader } from '@/components/common/PageHeader';
import { EmptyState } from '@/components/common/EmptyState';
import { EmptyEvidence } from '@/components/illustrations/EmptyEvidence';
import { Button } from '@/components/ui/button';
import { EvidenceDropzone } from '@/features/evidence/EvidenceDropzone';
import { AddLinkEvidenceForm } from '@/features/evidence/AddLinkEvidenceForm';
import { EvidenceThumbnail } from '@/features/evidence/EvidenceThumbnail';
import { EvidencePreviewModal } from '@/features/evidence/EvidencePreviewModal';
import { LinkToActivityDialog } from '@/features/evidence/LinkToActivityDialog';
import { Checkbox } from '@/components/ui/checkbox';
import { useAllEvidence } from '@/hooks/useAllEvidence';
import { useSettings } from '@/hooks/useSettings';
import { evidenceRepository, activityRepository } from '@/db/repositories';
import { buildActivityFromForm } from '@/lib/services/activity-fields';
import { todayString } from '@/lib/date/date-utils';
import { useActivityModalStore } from '@/features/activities/activity-modal-store';
import type { Evidence, InboxStatus } from '@/types';

type Tab = InboxStatus;
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

// FR-INB-01..07.
export function EvidenceInboxPage() {
  const evidence = useAllEvidence();
  const settings = useSettings();
  const openEdit = useActivityModalStore((s) => s.openEdit);
  const [tab, setTab] = useState<Tab>('unassigned');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [previewing, setPreviewing] = useState<Evidence | null>(null);
  const [linking, setLinking] = useState(false);

  const tabItems = useMemo(() => evidence.filter((e) => e.inboxStatus === tab), [evidence, tab]);
  const unassigned = useMemo(() => evidence.filter((e) => e.inboxStatus === 'unassigned'), [evidence]);
  const staleCount = useMemo(
    () => unassigned.filter((e) => Date.now() - new Date(e.createdAt).getTime() > SEVEN_DAYS_MS).length,
    [unassigned]
  );

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function createActivityFrom(item: Evidence) {
    if (!settings) return;
    const date = item.capturedAt ? item.capturedAt.slice(0, 10) : todayString();
    const activity = buildActivityFromForm({
      date,
      startTime: settings.defaultStartTime,
      endTime: settings.defaultEndTime,
      description: '',
      progress: 0,
      achievement: '',
      evidenceLink: null,
      countsTowardSkp: settings.defaultCountsTowardSkp,
      performancePlanId: null,
      location: '',
      tags: [],
      rbAreas: [],
    });
    await activityRepository.add(activity);
    await evidenceRepository.assignToActivity(item.id, activity.id);
    openEdit(activity.id);
  }

  return (
    <div>
      <PageHeader
        title="Evidence Inbox"
        description={`${unassigned.length} bukti belum ditautkan`}
        actions={<AddLinkEvidenceForm activityId={null} />}
      />

      {staleCount > 0 ? (
        <div className="mb-4 rounded-control border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-warning">
          {staleCount} bukti dukung belum ditautkan lebih dari 7 hari.
        </div>
      ) : null}

      <EvidenceDropzone
        activityId={null}
        maxFileSizeMb={settings?.maxFileSizeMb ?? 10}
        autoCompressImages={settings?.autoCompressImages ?? true}
      />

      <div className="my-4 flex gap-1 rounded-control border border-border p-1 w-fit">
        {(['unassigned', 'assigned', 'archived'] as Tab[]).map((t) => (
          <Button key={t} size="sm" variant={tab === t ? 'default' : 'ghost'} onClick={() => setTab(t)}>
            {t === 'unassigned' ? 'Unassigned' : t === 'assigned' ? 'Assigned' : 'Archived'}
          </Button>
        ))}
      </div>

      {selected.size > 0 ? (
        <div className="mb-3 flex items-center gap-2 rounded-control bg-secondary px-3 py-2 text-sm">
          <span>{selected.size} dipilih</span>
          <Button size="sm" onClick={() => setLinking(true)}>
            Tautkan ke kegiatan
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
            Batal
          </Button>
        </div>
      ) : null}

      {tabItems.length === 0 ? (
        <EmptyState illustration={<EmptyEvidence />} title="Semua bukti dukung sudah ditautkan." />
      ) : (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 md:grid-cols-6">
          {tabItems.map((item) => (
            <div key={item.id} className="overflow-hidden rounded-card border border-border bg-card">
              <div className="relative">
                <button type="button" onClick={() => setPreviewing(item)} className="block aspect-square w-full">
                  <EvidenceThumbnail evidence={item} className="h-full w-full object-cover" />
                </button>
                <div className="absolute left-1 top-1">
                  <Checkbox checked={selected.has(item.id)} onCheckedChange={() => toggleSelect(item.id)} />
                </div>
              </div>
              <div className="p-1.5">
                <p className="line-clamp-1 text-[11px]">{item.fileName ?? item.linkTitle ?? 'Tautan'}</p>
                {tab !== 'archived' ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="mt-1 h-6 w-full px-1 text-[10px]"
                    onClick={() => void createActivityFrom(item)}
                  >
                    Buat kegiatan
                  </Button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}

      <EvidencePreviewModal evidence={previewing} onOpenChange={(open) => !open && setPreviewing(null)} />
      {linking ? (
        <LinkToActivityDialog
          evidenceIds={Array.from(selected)}
          onOpenChange={(open) => !open && setLinking(false)}
          onLinked={() => {
            setSelected(new Set());
            setLinking(false);
          }}
        />
      ) : null}
    </div>
  );
}
