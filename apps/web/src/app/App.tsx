import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { PERMISSIONS, type PermissionCode } from '@socialapp/shared';
import { AppLayout } from '../components/layout/AppLayout';
import { useAuth } from '../features/auth/useAuth';
import { LoginPage } from '../pages/LoginPage';

const DashboardPage = lazy(() => import('../pages/DashboardPage').then((module) => ({ default: module.DashboardPage })));
const NotFoundPage = lazy(() => import('../pages/NotFoundPage').then((module) => ({ default: module.NotFoundPage })));
const SyncPage = lazy(() => import('../pages/SyncPage').then((module) => ({ default: module.SyncPage })));
const AthletesPage = lazy(() => import('../pages/AthletesPage').then((module) => ({ default: module.AthletesPage })));
const AthleteFormPage = lazy(() => import('../pages/AthleteFormPage').then((module) => ({ default: module.AthleteFormPage })));
const AthleteDetailPage = lazy(() => import('../pages/AthleteDetailPage').then((module) => ({ default: module.AthleteDetailPage })));
const SocialRecordFormPage = lazy(() => import('../pages/SocialRecordFormPage').then((module) => ({ default: module.SocialRecordFormPage })));
const SocioeconomicAssessmentPage = lazy(() => import('../pages/SocioeconomicAssessmentPage').then((module) => ({ default: module.SocioeconomicAssessmentPage })));
const WorkOverviewPage = lazy(() => import('../pages/WorkOverviewPage').then((module) => ({ default: module.WorkOverviewPage })));
const AthleteWorkPage = lazy(() => import('../pages/AthleteWorkPage').then((module) => ({ default: module.AthleteWorkPage })));
const DiagramPage = lazy(() => import('../pages/DiagramPage').then((module) => ({ default: module.DiagramPage })));
const CampaignsPage = lazy(() => import('../pages/CampaignsPage').then((module) => ({ default: module.CampaignsPage })));
const CampaignFormPage = lazy(() => import('../pages/CampaignFormPage').then((module) => ({ default: module.CampaignFormPage })));
const CampaignModePage = lazy(() => import('../pages/CampaignModePage').then((module) => ({ default: module.CampaignModePage })));
const ScreeningFormPage = lazy(() => import('../pages/ScreeningFormPage').then((module) => ({ default: module.ScreeningFormPage })));
const ScreeningResultPage = lazy(() => import('../pages/ScreeningResultPage').then((module) => ({ default: module.ScreeningResultPage })));
const ReportsPage = lazy(() => import('../pages/ReportsPage').then((module) => ({ default: module.ReportsPage })));
const AdminPage = lazy(() => import('../pages/AdminPage').then((module) => ({ default: module.AdminPage })));
const IndividualReportPage = lazy(() => import('../pages/IndividualReportPage').then((module) => ({ default: module.IndividualReportPage })));

function ProtectedApp() {
  const { user, can } = useAuth();
  if (!user) return <Navigate to="/acceso" replace />;

  return (
    <AppLayout>
      <Suspense fallback={<div className="p-12 text-center text-sm text-slate-500">Abriendo módulo…</div>}><Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/sincronizacion" element={<Gate can={can} permission={PERMISSIONS.SYNC_EXECUTE}><SyncPage /></Gate>} />
        <Route path="/deportistas" element={<Gate can={can} permission={PERMISSIONS.ATHLETE_READ}><AthletesPage /></Gate>} />
        <Route path="/deportistas/nuevo" element={<Gate can={can} permission={PERMISSIONS.ATHLETE_WRITE}><AthleteFormPage /></Gate>} />
        <Route path="/deportistas/:id/editar" element={<Gate can={can} permission={PERMISSIONS.ATHLETE_WRITE}><AthleteFormPage /></Gate>} />
        <Route path="/deportistas/:id" element={<Gate can={can} permission={PERMISSIONS.ATHLETE_READ}><AthleteDetailPage /></Gate>} />
        <Route path="/deportistas/:id/ficha-social" element={<Gate can={can} permission={PERMISSIONS.SOCIAL_RECORD_WRITE}><SocialRecordFormPage /></Gate>} />
        <Route path="/deportistas/:id/caracterizacion" element={<Gate can={can} permission={PERMISSIONS.ASSESSMENT_WRITE}><SocioeconomicAssessmentPage /></Gate>} />
        <Route path="/deportistas/:id/trabajo-social" element={<Gate can={can} permission={PERMISSIONS.FOLLOW_UP_READ}><AthleteWorkPage /></Gate>} />
        <Route path="/deportistas/:id/familiograma" element={<Gate can={can} permission={PERMISSIONS.DIAGRAM_WRITE}><DiagramPage /></Gate>} />
        <Route path="/deportistas/:id/ecomapa" element={<Gate can={can} permission={PERMISSIONS.DIAGRAM_WRITE}><DiagramPage /></Gate>} />
        <Route path="/trabajo-social" element={<Gate can={can} permission={PERMISSIONS.SOCIAL_RECORD_READ}><WorkOverviewPage /></Gate>} />
        <Route path="/brigadas" element={<Gate can={can} permission={PERMISSIONS.SCREENING_READ}><CampaignsPage /></Gate>} />
        <Route path="/brigadas/nueva" element={<Gate can={can} permission={PERMISSIONS.SCREENING_WRITE}><CampaignFormPage /></Gate>} />
        <Route path="/brigadas/:id/editar" element={<Gate can={can} permission={PERMISSIONS.SCREENING_WRITE}><CampaignFormPage /></Gate>} />
        <Route path="/brigadas/:id" element={<Gate can={can} permission={PERMISSIONS.SCREENING_READ}><CampaignModePage /></Gate>} />
        <Route path="/brigadas/:id/deportistas/:athleteId" element={<Gate can={can} permission={PERMISSIONS.SCREENING_WRITE}><ScreeningFormPage /></Gate>} />
        <Route path="/brigadas/:id/resultados/:athleteId" element={<Gate can={can} permission={PERMISSIONS.SCREENING_READ}><ScreeningResultPage /></Gate>} />
        <Route path="/reportes" element={<Gate can={can} permission={PERMISSIONS.DASHBOARD_AGGREGATE_READ}><ReportsPage /></Gate>} />
        <Route path="/reportes/deportistas/:id" element={<Gate can={can} permission={PERMISSIONS.SOCIAL_RECORD_READ}><IndividualReportPage /></Gate>} />
        <Route path="/administracion" element={<Gate can={can} permission={PERMISSIONS.ADMIN_USERS}><AdminPage /></Gate>} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes></Suspense>
    </AppLayout>
  );
}

function Gate({ can, permission, children }: { can: (permission: PermissionCode) => boolean; permission: PermissionCode; children: React.ReactNode }) {
  return can(permission) ? children : <div className="card p-10 text-center"><h1 className="font-display text-3xl text-pine-900">Acceso restringido</h1><p className="mt-3 text-sm text-slate-500">Tu perfil no tiene permiso para consultar esta información.</p><a href="/" className="btn-secondary mt-6">Volver al inicio</a></div>;
}

export function App() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/acceso" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/*" element={<ProtectedApp />} />
    </Routes>
  );
}
