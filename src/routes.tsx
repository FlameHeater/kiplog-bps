import { lazy, Suspense, type ReactNode } from 'react';
import { createHashRouter } from 'react-router-dom';
import { RequireProfile } from '@/components/common/RequireProfile';
import { OnboardingPage } from '@/pages/OnboardingPage';

// NFR-01/NFR-02/NFR-10 — every route beyond the entry (Dashboard) is
// code-split so visiting one page doesn't pull in the JS for all the
// others; only the active route's chunk is fetched.
const DashboardPage = lazy(() => import('@/pages/DashboardPage').then((m) => ({ default: m.DashboardPage })));
const KalenderPage = lazy(() => import('@/pages/KalenderPage').then((m) => ({ default: m.KalenderPage })));
const KegiatanPage = lazy(() => import('@/pages/KegiatanPage').then((m) => ({ default: m.KegiatanPage })));
const EvidenceInboxPage = lazy(() =>
  import('@/pages/EvidenceInboxPage').then((m) => ({ default: m.EvidenceInboxPage }))
);
const BuktiTautanPage = lazy(() =>
  import('@/pages/BuktiTautanPage').then((m) => ({ default: m.BuktiTautanPage }))
);
const RencanaKinerjaPage = lazy(() =>
  import('@/pages/RencanaKinerjaPage').then((m) => ({ default: m.RencanaKinerjaPage }))
);
const TemplatePage = lazy(() => import('@/pages/TemplatePage').then((m) => ({ default: m.TemplatePage })));
const KipAppReadyPage = lazy(() =>
  import('@/pages/KipAppReadyPage').then((m) => ({ default: m.KipAppReadyPage }))
);
const LaporanPage = lazy(() => import('@/pages/LaporanPage').then((m) => ({ default: m.LaporanPage })));
const ReviewPage = lazy(() => import('@/pages/ReviewPage').then((m) => ({ default: m.ReviewPage })));
const BackupPage = lazy(() => import('@/pages/BackupPage').then((m) => ({ default: m.BackupPage })));
const PengaturanPage = lazy(() => import('@/pages/PengaturanPage').then((m) => ({ default: m.PengaturanPage })));

function withSuspense(element: ReactNode) {
  return <Suspense fallback={null}>{element}</Suspense>;
}

// PRD §11: HashRouter avoids GitHub Pages deep-link 404s (DEP-03). Sitemap
// per Deliverable 0 §4.
export const router = createHashRouter([
  { path: '/onboarding', element: <OnboardingPage /> },
  {
    path: '/',
    element: <RequireProfile />,
    children: [
      { index: true, element: withSuspense(<DashboardPage />) },
      { path: 'kalender', element: withSuspense(<KalenderPage />) },
      { path: 'kegiatan', element: withSuspense(<KegiatanPage />) },
      { path: 'evidence-inbox', element: withSuspense(<EvidenceInboxPage />) },
      { path: 'bukti-tautan', element: withSuspense(<BuktiTautanPage />) },
      { path: 'rencana-kinerja', element: withSuspense(<RencanaKinerjaPage />) },
      { path: 'template', element: withSuspense(<TemplatePage />) },
      { path: 'kipapp-ready', element: withSuspense(<KipAppReadyPage />) },
      { path: 'laporan', element: withSuspense(<LaporanPage />) },
      { path: 'review', element: withSuspense(<ReviewPage />) },
      { path: 'backup', element: withSuspense(<BackupPage />) },
      { path: 'pengaturan', element: withSuspense(<PengaturanPage />) },
    ],
  },
]);
