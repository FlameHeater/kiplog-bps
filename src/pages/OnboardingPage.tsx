import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ProfileForm } from './pengaturan/ProfileForm';
import { seedPerformancePlansIfEmpty } from '@/lib/services/seed-performance-plans';
import { seedDefaultSettingsIfMissing } from '@/lib/services/seed-default-settings';

type Step = 'profile' | 'seed';

// FR-DAT-02: first-run flow — profile, then an explicit (skippable) offer to
// load the 40 RK 2026 seed. Seeding RK is never silent/automatic outside
// this flow. AppSettings, on the other hand, has no user-facing "skip" —
// every feature reads it, so it's seeded with defaults the moment the
// profile is saved, whichever way the RK offer is answered.
export function OnboardingPage() {
  const [step, setStep] = useState<Step>('profile');
  const [seeding, setSeeding] = useState(false);
  const navigate = useNavigate();

  async function handleProfileSaved() {
    await seedDefaultSettingsIfMissing();
    // ST-03: ask the browser not to evict KipLog's data under storage
    // pressure. Best-effort — some browsers grant this silently based on
    // site engagement heuristics, others prompt. Either way it's not
    // something we block onboarding on.
    if (navigator.storage?.persist) {
      void navigator.storage.persist();
    }
    setStep('seed');
  }

  async function loadSeed() {
    setSeeding(true);
    await seedPerformancePlansIfEmpty();
    navigate('/');
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-4 py-12">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-semibold">Selamat datang di KipLog</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Catat pekerjaan sekali → kelola bukti dukung → hasilkan berkas Data Dukung → tempel ke
          KipApp.
        </p>
      </div>

      {step === 'profile' ? (
        <ProfileForm onSaved={() => void handleProfileSaved()} />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Muat 40 Rencana Kinerja 2026?</CardTitle>
            <CardDescription>
              Daftar RK resmi tahun 2026 dapat dimuat sekarang, atau Anda tambahkan sendiri nanti
              lewat halaman Rencana Kinerja.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex gap-3">
            <Button onClick={loadSeed} disabled={seeding}>
              Ya, muat 40 RK
            </Button>
            <Button variant="outline" onClick={() => navigate('/')} disabled={seeding}>
              Lewati
            </Button>
          </CardContent>
        </Card>
      )}

      {step === 'seed' ? (
        <p className="mt-4 text-center text-xs text-muted-foreground">
          KipLog meminta browser menyimpan data secara persisten agar catatan Anda tidak terhapus
          otomatis saat penyimpanan perangkat menipis.
        </p>
      ) : null}
    </div>
  );
}
