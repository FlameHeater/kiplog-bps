import { useState } from 'react';
import { BookmarkPlus } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { templateRepository } from '@/db/repositories';
import type { ActivityEditFormValues } from '@/types';

interface SaveAsTemplateButtonProps {
  values: ActivityEditFormValues;
}

// FR-TPL-03: save the current form's field values as a reusable template.
export function SaveAsTemplateButton({ values }: SaveAsTemplateButtonProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');

  async function save() {
    if (!name.trim()) return; // FR-TPL-07
    const now = new Date().toISOString();
    await templateRepository.upsert({
      id: crypto.randomUUID(),
      name: name.trim(),
      performancePlanId: values.performancePlanId,
      descriptionTemplate: values.description,
      achievementTemplate: values.achievement,
      defaultProgress: values.progress,
      defaultStartTime: values.startTime,
      defaultEndTime: values.endTime,
      defaultLocation: values.location,
      defaultCountsTowardSkp: values.countsTowardSkp,
      tags: values.tags,
      rbAreas: values.rbAreas,
      usageCount: 0,
      createdAt: now,
      updatedAt: now,
    });
    setName('');
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" size="sm" variant="outline">
          <BookmarkPlus className="h-3.5 w-3.5" />
          Simpan sebagai template
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 space-y-2 p-3">
        <Input placeholder="Nama template" value={name} onChange={(e) => setName(e.target.value)} />
        <Button type="button" size="sm" disabled={!name.trim()} onClick={() => void save()}>
          Simpan
        </Button>
      </PopoverContent>
    </Popover>
  );
}
