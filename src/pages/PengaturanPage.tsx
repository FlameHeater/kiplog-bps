import { PageHeader } from '@/components/common/PageHeader';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useSettings } from '@/hooks/useSettings';
import { APP_VERSION } from '@/lib/version';
import { ProfileForm } from './pengaturan/ProfileForm';
import { AppSettingsForm } from './pengaturan/AppSettingsForm';

export function PengaturanPage() {
  const profile = useUserProfile();
  const settings = useSettings();

  if (profile === undefined || settings === undefined) {
    return null;
  }

  return (
    <div>
      <PageHeader title="Pengaturan" description="Profil dan preferensi aplikasi." />
      <div className="grid gap-6 md:grid-cols-2">
        <ProfileForm initial={profile ?? undefined} />
        <AppSettingsForm initial={settings ?? undefined} />
      </div>
      <p className="mt-8 text-xs text-muted-foreground">KipLog BPS v{APP_VERSION}</p>
    </div>
  );
}
