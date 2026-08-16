import { RouterProvider } from 'react-router-dom';
import { router } from '@/routes';
import { PwaUpdatePrompt } from '@/components/common/PwaUpdatePrompt';
import { RequireAuth } from '@/components/common/RequireAuth';
import { useAppliedTheme } from '@/hooks/useAppliedTheme';

export function App() {
  useAppliedTheme();

  return (
    <RequireAuth>
      <RouterProvider router={router} />
      <PwaUpdatePrompt />
    </RequireAuth>
  );
}
