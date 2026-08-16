import { useEffect, useRef, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ActivityEditFormSchema } from '@/lib/validation';
import { RbAreaSchema } from '@/lib/validation/enums';
import type { Activity, ActivityEditFormValues, AppSettings } from '@/types';
import { activityRepository } from '@/db/repositories';
import { buildActivityFromForm, calculateDurationMinutes } from '@/lib/services/activity-fields';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { ProgressControl } from './ProgressControl';
import { EvidenceLinkField } from './EvidenceLinkField';
import { TagInput } from './TagInput';
import { RkCombobox } from '@/features/performance-plans/RkCombobox';
import { RkRecommendationPanel } from './RkRecommendationPanel';
import { EvidenceGallery, EvidenceGalleryPlaceholder } from '@/features/evidence/EvidenceGallery';
import { usePerformancePlans } from '@/hooks/usePerformancePlans';
import { recordRkSelection } from '@/lib/services/rk-selection';
import { generateAchievementSuggestions } from '@/lib/matching/achievement-generator';
import { useEvidenceForActivity } from '@/hooks/useEvidenceForActivity';
import { useSkpPeriod } from '@/hooks/useSkpPeriod';
import { ReadyToReportChecklist } from './ReadyToReportChecklist';
import { validateReadyToReport } from '@/lib/services/activity-validator';
import { ApplyTemplateControl } from './ApplyTemplateControl';
import { SaveAsTemplateButton } from './SaveAsTemplateButton';

const AUTOSAVE_DEBOUNCE_MS = 2000;

interface ActivityFormProps {
  existing: Activity | null;
  prefillDate: string | null;
  settings: AppSettings | undefined;
  readOnly?: boolean;
  readOnlyReason?: string;
  onSaved: () => void;
  onCancel: () => void;
}

// FR-ACT-01..09: field order matches the KipApp Add form exactly (§2.2) so
// the user can copy top-to-bottom without hunting for fields.
export function ActivityForm({
  existing,
  prefillDate,
  settings,
  readOnly,
  readOnlyReason,
  onSaved,
  onCancel,
}: ActivityFormProps) {
  const draftIdRef = useRef(existing?.id ?? crypto.randomUUID());
  // Evidence Gallery needs a real DB row to attach to. For a brand-new
  // activity that's only true once the first autosave/submit lands — before
  // that, EvidenceGalleryPlaceholder asks the user to save first rather
  // than risk evidence pointing at an activity id that doesn't exist yet.
  const [savedId, setSavedId] = useState<string | null>(existing?.id ?? null);
  const [rkComboboxOpen, setRkComboboxOpen] = useState(false);
  const plans = usePerformancePlans();

  const [achievementIsSuggested, setAchievementIsSuggested] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ActivityEditFormValues>({
    resolver: zodResolver(ActivityEditFormSchema),
    defaultValues: existing ?? {
      date: prefillDate ?? new Date().toISOString().slice(0, 10),
      startTime: settings?.defaultStartTime ?? '08:00',
      endTime: settings?.defaultEndTime ?? '16:00',
      description: '',
      progress: 0,
      achievement: '',
      evidenceLink: null,
      countsTowardSkp: settings?.defaultCountsTowardSkp ?? true,
      performancePlanId: null,
      location: '',
      tags: [],
      rbAreas: [],
    },
  });

  const values = watch();
  const evidenceForChecklist = useEvidenceForActivity(savedId);
  const skpPeriodForChecklist = useSkpPeriod(values.date ? values.date.slice(0, 7) : null);
  const duration = (() => {
    try {
      return calculateDurationMinutes(values.startTime, values.endTime);
    } catch {
      return 0;
    }
  })();

  // FR-ACT-09: autosave draft 2s after the user stops typing. Persists to
  // Dexie (not localStorage — ST-02 forbids domain data there) under a
  // stable id so it's recovered on reload even mid-edit.
  //
  // Always re-reads the current DB row (not just the `existing` prop, which
  // is a snapshot from when the modal opened) before merging form values —
  // otherwise this `put()` would blindly overwrite evidenceCount/
  // evidenceLinkStatus that the Evidence Gallery updated out-of-band while
  // the form sat open (§9.6 fields must never regress from a stale save).
  useEffect(() => {
    if (readOnly) return;
    const timer = setTimeout(() => {
      void (async () => {
        if (!values.date || !values.startTime || !values.endTime) return;
        // Don't litter the calendar with empty drafts just because the modal
        // was opened and closed without anything being typed.
        const isUntouched = !existing && values.description.trim() === '';
        if (isUntouched) return;
        const current = await activityRepository.get(draftIdRef.current);
        const activity = buildActivityFromForm(
          { ...values, evidenceLink: values.evidenceLink || null },
          current ?? existing ?? ({ id: draftIdRef.current } as Activity)
        );
        await activityRepository.save(activity);
        setSavedId(activity.id);
      })();
    }, AUTOSAVE_DEBOUNCE_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(values), readOnly]);

  async function onSubmit(formValues: ActivityEditFormValues) {
    const current = await activityRepository.get(draftIdRef.current);
    const activity = buildActivityFromForm(
      formValues,
      current ?? existing ?? ({ id: draftIdRef.current } as Activity)
    );
    // §9.4: ready_to_report is only reached once §12.3 validation passes.
    if (activity.status === 'draft' || activity.status === 'complete') {
      const validation = validateReadyToReport(
        {
          date: activity.date,
          startTime: activity.startTime,
          endTime: activity.endTime,
          performancePlanId: activity.performancePlanId,
          planExists: activity.performancePlanId
            ? (plans ?? []).some((p) => p.id === activity.performancePlanId)
            : false,
          description: activity.description,
          achievement: activity.achievement,
          progress: activity.progress,
          evidenceCount: activity.evidenceCount,
          evidenceLink: activity.evidenceLink,
        },
        {
          requireEvidenceForReady: settings?.requireEvidenceForReady ?? true,
          requireEvidenceLinkForReady: settings?.requireEvidenceLinkForReady ?? true,
          periodLocked: skpPeriodForChecklist?.isLocked ?? false,
        }
      );
      activity.status = validation.isReady ? 'ready_to_report' : 'complete';
    }
    await activityRepository.save(activity);
    setSavedId(activity.id);
    onSaved();
  }

  if (readOnly) {
    return (
      <div className="space-y-3">
        <p className="rounded-control bg-secondary p-3 text-sm text-secondary-foreground">
          {readOnlyReason}
        </p>
        <Button type="button" variant="outline" onClick={onCancel}>
          Tutup
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <ApplyTemplateControl
          date={values.date}
          onApply={(partial) => {
            for (const [key, value] of Object.entries(partial)) {
              setValue(key as keyof ActivityEditFormValues, value as never, { shouldDirty: true });
            }
          }}
        />
        <SaveAsTemplateButton values={values} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="date">1. Tanggal</Label>
        <Input id="date" type="date" {...register('date')} />
        {errors.date ? <p className="text-xs text-destructive">{errors.date.message}</p> : null}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="startTime">2. Jam mulai kegiatan</Label>
          <Input id="startTime" type="time" {...register('startTime')} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="endTime">3. Jam selesai kegiatan</Label>
          <Input id="endTime" type="time" {...register('endTime')} />
          {errors.endTime ? <p className="text-xs text-destructive">{errors.endTime.message}</p> : null}
        </div>
      </div>
      {duration > 0 ? (
        <p className="text-xs text-muted-foreground">
          Durasi: {Math.floor(duration / 60)}j {duration % 60}m
        </p>
      ) : null}

      <div className="space-y-1.5">
        <Label htmlFor="description">4. Deskripsi kegiatan</Label>
        <Textarea id="description" {...register('description')} />
        {errors.description ? (
          <p className="text-xs text-destructive">{errors.description.message}</p>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <Label>Rencana Kinerja</Label>
        <Controller
          control={control}
          name="performancePlanId"
          render={({ field }) => {
            async function selectPlan(planId: string) {
              field.onChange(planId);
              const plan = plans?.find((p) => p.id === planId);
              if (plan) await recordRkSelection(plan, values.description);
            }
            return (
              <div className="space-y-2">
                {!field.value ? (
                  <RkRecommendationPanel
                    description={values.description}
                    year={Number(values.date.slice(0, 4)) || new Date().getFullYear()}
                    tags={values.tags}
                    onSelect={(planId) => void selectPlan(planId)}
                    onSearchMore={() => setRkComboboxOpen(true)}
                  />
                ) : null}
                <RkCombobox
                  value={field.value}
                  onChange={(planId) => void (planId ? selectPlan(planId) : field.onChange(null))}
                  open={rkComboboxOpen}
                  onOpenChange={setRkComboboxOpen}
                />
              </div>
            );
          }}
        />
      </div>

      <div className="space-y-1.5">
        <Label>5. Progress kegiatan</Label>
        <Controller
          control={control}
          name="progress"
          render={({ field }) => <ProgressControl value={field.value} onChange={field.onChange} />}
        />
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="achievement">6. Capaian hasil kegiatan</Label>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={!values.description.trim() || values.achievement.trim() !== ''}
            onClick={() => {
              // FR-SCG-03: only fills an empty field, never overwrites what the user typed.
              const [suggestion] = generateAchievementSuggestions(values.description, values.progress);
              if (suggestion) {
                setValue('achievement', suggestion.text, { shouldDirty: true });
                setAchievementIsSuggested(true);
              }
            }}
          >
            Sarankan capaian
          </Button>
        </div>
        <Textarea
          id="achievement"
          {...register('achievement', { onChange: () => setAchievementIsSuggested(false) })}
        />
        {achievementIsSuggested ? (
          <p className="text-[10px] text-muted-foreground">Ini saran — masih bisa diedit bebas.</p>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <Label>7. Link bukti dukung</Label>
        <Controller
          control={control}
          name="evidenceLink"
          render={({ field }) => (
            <EvidenceLinkField
              value={field.value ?? ''}
              onChange={field.onChange}
              error={errors.evidenceLink?.message}
            />
          )}
        />
      </div>

      <div className="flex items-center justify-between">
        <Label htmlFor="countsTowardSkp">8. Status capaian — masukkan ke capaian SKP</Label>
        <Controller
          control={control}
          name="countsTowardSkp"
          render={({ field }) => (
            <Switch id="countsTowardSkp" checked={field.value} onCheckedChange={field.onChange} />
          )}
        />
      </div>

      <hr className="border-border" />

      {savedId ? (
        <EvidenceGallery activityId={savedId} settings={settings} />
      ) : (
        <EvidenceGalleryPlaceholder />
      )}

      <div className="space-y-1.5">
        <Label htmlFor="location">Lokasi</Label>
        <Input id="location" {...register('location')} />
      </div>

      <div className="space-y-1.5">
        <Label>Tag</Label>
        <Controller
          control={control}
          name="tags"
          render={({ field }) => <TagInput value={field.value} onChange={field.onChange} />}
        />
      </div>

      <div className="space-y-1.5">
        <Label>Area Reformasi Birokrasi</Label>
        <Controller
          control={control}
          name="rbAreas"
          render={({ field }) => (
            <div className="grid grid-cols-2 gap-2">
              {RbAreaSchema.options.map((area) => (
                <label key={area} className="flex items-start gap-2 text-xs">
                  <Checkbox
                    checked={field.value.includes(area)}
                    onCheckedChange={(checked) =>
                      field.onChange(
                        checked ? [...field.value, area] : field.value.filter((a) => a !== area)
                      )
                    }
                  />
                  {area}
                </label>
              ))}
            </div>
          )}
        />
      </div>

      <ReadyToReportChecklist
        input={{
          date: values.date,
          startTime: values.startTime,
          endTime: values.endTime,
          performancePlanId: values.performancePlanId,
          planExists: values.performancePlanId
            ? (plans ?? []).some((p) => p.id === values.performancePlanId)
            : false,
          description: values.description,
          achievement: values.achievement,
          progress: values.progress,
          evidenceCount: evidenceForChecklist.length,
          evidenceLink: values.evidenceLink,
        }}
        options={{
          requireEvidenceForReady: settings?.requireEvidenceForReady ?? true,
          requireEvidenceLinkForReady: settings?.requireEvidenceLinkForReady ?? true,
          periodLocked: skpPeriodForChecklist?.isLocked ?? false,
        }}
      />

      <div className="flex gap-2 pt-2">
        <Button type="submit" disabled={isSubmitting}>
          Simpan
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Batal
        </Button>
      </div>
    </form>
  );
}
