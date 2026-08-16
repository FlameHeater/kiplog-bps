import { Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { AuthStatus } from '@/hooks/useAuth';

interface LoginPageProps {
  status: Extract<AuthStatus, 'signed-out' | 'unauthorized'>;
  email: string | null;
  onSignIn: () => void;
  onSignOut: () => void;
}

// The only screen reachable without a verified, allow-listed Google
// session — see src/components/common/RequireAuth.tsx.
export function LoginPage({ status, email, onSignIn, onSignOut }: LoginPageProps) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-sm flex-col items-center justify-center gap-4 px-4 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Lock className="h-6 w-6" aria-hidden="true" />
      </div>
      <h1 className="text-xl font-semibold">KipLog BPS</h1>

      {status === 'unauthorized' ? (
        <>
          <p className="text-sm text-destructive">
            Akun ini tidak diizinkan{email ? ` (${email})` : ''}. KipLog ini dikunci untuk satu akun Google saja.
          </p>
          <Button onClick={onSignOut}>Coba akun lain</Button>
        </>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            Aplikasi ini dikunci untuk satu akun Google saja. Masuk untuk melanjutkan.
          </p>
          <Button onClick={onSignIn}>Masuk dengan Google</Button>
        </>
      )}
    </div>
  );
}
