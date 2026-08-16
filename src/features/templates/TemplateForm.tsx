import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ActivityTemplateFormSchema } from '@/lib/validation';
import type { ActivityTemplate, ActivityTemplateFormValues } from '@/types';
import { templateRepository } from '@/db/repositories';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { ProgressControl } from '@/features/activities/ProgressControl';
import { TagInput } from '@/features/activities/TagInput';
import { RkCombobox } from '@/features/performance-plans/RkCombobox';

interface TemplateFormProps {
  existing: ActivityTemplate | null;
  onSaved: () => void;
  onCancel: () => void;
}

// FR-TPL-01/04/07.
export function TemplateForm({ existing, onSaved, onCancel }: TemplateFormProps) {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ActivityTemplateFormValues>({
    resolver: zodResolver(ActivityTemplateFormSchema),
    defaultValues: existing ?? {
      name: '',
      performancePlanId: null,
      descriptionTemplate: '',
      achievementTemplate: '',
      defaultProgress: 0,
      defaultStartTime: '08:00',
      defaultEndTime: '16:00',
      defaultLocation: '',
      defaultCountsTowardSkp: true,
      tags: [],
      rbAreas: [],
    },
  });

  async function onSubmit(values: ActivityTemplateFormValues) {
    const now = new Date().toISOString();
    await templateRepository.upsert({
      ...values,
      id: existing?.id ?? crypto.randomUUID(),
      usageCount: existing?.usageCount ?? 0,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    });
    onSaved();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="tpl-name">Nama Template</Label>
        <Input id="tpl-name" {...register('name')} />
        {errors.name ? <p className="text-xs text-destructive">{errors.name.message}</p> : null}
      </div>

      <div className="space-y-1.5">
        <Label>Rencana Kinerja</Label>
        <Controller
          control={control}
          name="performancePlanId"
          render={({ field }) => <RkCombobox value={field.value} onChange={field.onChange} />}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="tpl-desc">Deskripsi Kegiatan</Label>
        <Textarea id="tpl-desc" {...register('descriptionTemplate')} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="tpl-achievement">
          Capaian — gunakan{' '}
          <code className="rounded bg-secondary px-1">{'{{deskripsi}}'}</code> /{' '}
          <code className="rounded bg-secondary px-1">{'{{tanggal}}'}</code>
        </Label>
        <Textarea id="tpl-achievement" {...register('achievementTemplate')} />
      </div>

      <div className="space-y-1.5">
        <Label>Progress Default</Label>
        <Controller
          control={control}
          name="defaultProgress"
          render={({ field }) => <ProgressControl value={field.value} onChange={field.onChange} />}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="tpl-start">Jam Mulai Default</Label>
          <Input id="tpl-start" type="time" {...register('defaultStartTime')} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="tpl-end">Jam Selesai Default</Label>
          <Input id="tpl-end" type="time" {...register('defaultEndTime')} />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="tpl-location">Lokasi Default</Label>
        <Input id="tpl-location" {...register('defaultLocation')} />
      </div>

      <div className="space-y-1.5">
        <Label>Tag</Label>
        <Controller
          control={control}
          name="tags"
          render={({ field }) => <TagInput value={field.value} onChange={field.onChange} />}
        />
      </div>

      <div className="flex items-center justify-between">
        <Label htmlFor="tpl-counts">Status Capaian Default — masukkan ke SKP</Label>
        <Controller
          control={control}
          name="defaultCountsTowardSkp"
          render={({ field }) => (
            <Switch id="tpl-counts" checked={field.value} onCheckedChange={field.onChange} />
          )}
        />
      </div>

      <div className="flex gap-2 pt-2">
        <Button type="submit" disabled={isSubmitting}>
          Simpan Template
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Batal
        </Button>
      </div>
    </form>
  );
}
