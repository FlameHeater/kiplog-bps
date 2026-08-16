import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTemplates } from '@/hooks/useTemplates';
import { templateRepository } from '@/db/repositories';
import { applyTemplate } from '@/lib/services/apply-template';
import type { ActivityEditFormValues } from '@/types';

interface ApplyTemplateControlProps {
  date: string;
  onApply: (values: Partial<ActivityEditFormValues>) => void;
}

// FR-TPL-02: picking a template fills the form; every field stays editable after.
export function ApplyTemplateControl({ date, onApply }: ApplyTemplateControlProps) {
  const templates = useTemplates();

  if (templates.length === 0) return null;

  async function handleSelect(templateId: string) {
    const template = templates.find((t) => t.id === templateId);
    if (!template) return;
    onApply(applyTemplate(template, date));
    await templateRepository.upsert({ ...template, usageCount: template.usageCount + 1 });
  }

  return (
    <Select onValueChange={(v) => void handleSelect(v)}>
      <SelectTrigger className="h-9 w-56 text-xs">
        <SelectValue placeholder="Pakai template…" />
      </SelectTrigger>
      <SelectContent>
        {templates.map((t) => (
          <SelectItem key={t.id} value={t.id}>
            {t.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
