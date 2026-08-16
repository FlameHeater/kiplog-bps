import { Navigate } from 'react-router-dom';
import { useUserProfile } from '@/hooks/useUserProfile';
import { AppShell } from '@/layouts/AppShell';

// Gates the main app behind onboarding (FR-DAT-02) — no profile yet means no
// report header data exists, so every feature route waits until it's set.
export function RequireProfile() {
  const profile = useUserProfile();

  if (profile === undefined) {
    return null; // still loading from IndexedDB
  }

  if (profile === null) {
    return <Navigate to="/onboarding" replace />;
  }

  return <AppShell />;
}
