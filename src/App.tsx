import '@/lib/sentry';
import { lazy, Suspense } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { ActionsProvider } from '@/context/ActionsContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ErrorBusProvider } from '@/components/ErrorBus';
import { Layout } from '@/components/Layout';
import DashboardOverview from '@/pages/DashboardOverview';
import AdminPage from '@/pages/AdminPage';
import AbteilungenPage from '@/pages/AbteilungenPage';
import StellenPage from '@/pages/StellenPage';
import MitarbeiterPage from '@/pages/MitarbeiterPage';
import AbwesenheitenPage from '@/pages/AbwesenheitenPage';
import LeistungsbeurteilungenPage from '@/pages/LeistungsbeurteilungenPage';
import PublicFormAbteilungen from '@/pages/public/PublicForm_Abteilungen';
import PublicFormStellen from '@/pages/public/PublicForm_Stellen';
import PublicFormMitarbeiter from '@/pages/public/PublicForm_Mitarbeiter';
import PublicFormAbwesenheiten from '@/pages/public/PublicForm_Abwesenheiten';
import PublicFormLeistungsbeurteilungen from '@/pages/public/PublicForm_Leistungsbeurteilungen';
// <public:imports>
// </public:imports>
// <custom:imports>
const MitarbeiterOnboardingPage = lazy(() => import('@/pages/intents/MitarbeiterOnboardingPage'));
const LeistungsbeurteilungPage = lazy(() => import('@/pages/intents/LeistungsbeurteilungPage'));
// </custom:imports>

export default function App() {
  return (
    <ErrorBoundary>
      <ErrorBusProvider>
        <HashRouter>
          <ActionsProvider>
            <Routes>
              <Route path="public/6a04393196b6d0e1fe432568" element={<PublicFormAbteilungen />} />
              <Route path="public/6a04393858a300b18cad58a9" element={<PublicFormStellen />} />
              <Route path="public/6a0439397a0c50347e1a18b3" element={<PublicFormMitarbeiter />} />
              <Route path="public/6a04393b87d551873784e867" element={<PublicFormAbwesenheiten />} />
              <Route path="public/6a04393ce2ed260f9576b292" element={<PublicFormLeistungsbeurteilungen />} />
              {/* <public:routes> */}
              {/* </public:routes> */}
              <Route element={<Layout />}>
                <Route index element={<DashboardOverview />} />
                <Route path="abteilungen" element={<AbteilungenPage />} />
                <Route path="stellen" element={<StellenPage />} />
                <Route path="mitarbeiter" element={<MitarbeiterPage />} />
                <Route path="abwesenheiten" element={<AbwesenheitenPage />} />
                <Route path="leistungsbeurteilungen" element={<LeistungsbeurteilungenPage />} />
                <Route path="admin" element={<AdminPage />} />
                {/* <custom:routes> */}
                <Route path="intents/mitarbeiter-onboarding" element={<Suspense fallback={null}><MitarbeiterOnboardingPage /></Suspense>} />
                <Route path="intents/leistungsbeurteilung" element={<Suspense fallback={null}><LeistungsbeurteilungPage /></Suspense>} />
                {/* </custom:routes> */}
              </Route>
            </Routes>
          </ActionsProvider>
        </HashRouter>
      </ErrorBusProvider>
    </ErrorBoundary>
  );
}
