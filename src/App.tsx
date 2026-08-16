import { RouterProvider } from 'react-router-dom';
import { router } from '@/routes';
import { PwaUpdatePrompt } from '@/components/common/PwaUpdatePrompt';

export function App() {
  return (
    <>
      <RouterProvider router={router} />
      <PwaUpdatePrompt />
    </>
  );
}
