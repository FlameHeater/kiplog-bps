import { useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { EmptyState } from '@/components/common/EmptyState';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TemplateForm } from '@/features/templates/TemplateForm';
import { useTemplates } from '@/hooks/useTemplates';
import { templateRepository } from '@/db/repositories';
import type { ActivityTemplate } from '@/types';

// FR-TPL-01..07.
export function TemplatePage() {
  const templates = useTemplates();
  const [editing, setEditing] = useState<ActivityTemplate | 'new' | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ActivityTemplate | null>(null);

  return (
    <div>
      <PageHeader
        title="Template"
        description={`${templates.length} template kegiatan`}
        actions={
          <Button onClick={() => setEditing('new')}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Buat Template
          </Button>
        }
      />

      {templates.length === 0 ? (
        <EmptyState
          title="Template mempercepat kegiatan rutin."
          action={<Button onClick={() => setEditing('new')}>Buat Template</Button>}
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {templates.map((tpl) => (
            <Card key={tpl.id}>
              <CardHeader>
                <CardTitle className="text-base">{tpl.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="line-clamp-2 text-sm text-muted-foreground">{tpl.descriptionTemplate}</p>
                <div className="mt-3 flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setEditing(tpl)}>
                    <Pencil className="h-3.5 w-3.5" />
                    Ubah
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setDeleteTarget(tpl)}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing === 'new' ? 'Buat Template' : 'Ubah Template'}</DialogTitle>
          </DialogHeader>
          <TemplateForm
            existing={editing !== 'new' ? editing : null}
            onSaved={() => setEditing(null)}
            onCancel={() => setEditing(null)}
          />
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Hapus template?"
        description="Template ini akan dihapus permanen. Kegiatan yang sudah dibuat dari template ini tidak terpengaruh."
        confirmLabel="Hapus"
        destructive
        onConfirm={() => {
          if (deleteTarget) void templateRepository.remove(deleteTarget.id);
        }}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      />
    </div>
  );
}
