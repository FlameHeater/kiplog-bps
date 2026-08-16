import { RouterProvider } from 'react-router-dom';
import { router } from '@/routes';
import { PwaUpdatePrompt } from '@/components/common/PwaUpdatePrompt';
import { useAppliedTheme } from '@/hooks/useAppliedTheme';

export function App() {
  useAppliedTheme();

  return (
    <>
      <RouterProvider router={router} />
      <PwaUpdatePrompt />
    </>
  );
}
