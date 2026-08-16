import { useEffect, type ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { LoginPage } from '@/pages/LoginPage';
import { pullOnStart } from '@/lib/sync/sync-engine';

interface RequireAuthProps {
  children: ReactNode;
}

// Gates literally everything else in the app — mirrors RequireProfile.tsx's
// undefined/null/value shape: 'loading' -> null, signed-out/unauthorized ->
// LoginPage, signed-in -> children.
export function RequireAuth({ children }: RequireAuthProps) {
  const { status, email, error, signIn, signOut } = useAuth();

  useEffect(() => {
    if (status === 'signed-in') void pullOnStart();
  }, [status]);

  if (status === 'loading') return null;

  if (status === 'signed-out' || status === 'unauthorized') {
    return (
      <LoginPage
        status={status}
        email={email}
        error={error}
        onSignIn={() => void signIn()}
        onSignOut={signOut}
      />
    );
  }

  return <>{children}</>;
}
