import { Cloud, CloudOff, LogOut, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useSyncStore, syncNow } from '@/lib/sync/sync-engine';

function formatSyncedAt(iso: string | null): string {
  if (!iso) return 'Belum pernah sinkron.';
  return `Sinkron terakhir: ${new Date(iso).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}`;
}

// Only ever rendered while signed-in (Pengaturan lives behind RequireAuth),
// so `email` here always reflects the one allow-listed account.
export function SyncStatusCard() {
  const { email, signOut } = useAuth();
  const { status, lastSyncedAt, errorMessage } = useSyncStore();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sinkronisasi</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2 text-sm">
          {status === 'error' ? (
            <CloudOff className="h-4 w-4 shrink-0 text-destructive" aria-hidden="true" />
          ) : (
            <Cloud className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
          )}
          <div className="min-w-0">
            <p className="truncate">Masuk sebagai {email}</p>
            <p className="text-xs text-muted-foreground">
              {status === 'error' ? (errorMessage ?? 'Sinkronisasi gagal.') : formatSyncedAt(lastSyncedAt)}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={status === 'syncing'}
            onClick={() => void syncNow()}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${status === 'syncing' ? 'animate-spin' : ''}`} aria-hidden="true" />
            {status === 'syncing' ? 'Menyinkronkan…' : 'Sinkron Sekarang'}
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={signOut}>
            <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
            Keluar
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          Data disimpan di Google Drive akun ini (tersembunyi, khusus KipLog) supaya sama di semua perangkat Anda.
          Jika dua perangkat diubah bersamaan, perubahan yang tersinkron paling akhir yang dipakai.
        </p>
      </CardContent>
    </Card>
  );
}
