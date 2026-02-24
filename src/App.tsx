import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Spinner } from './components/ui/Spinner';

const HomePage = lazy(() => import('./components/pages/HomePage').then(m => ({ default: m.HomePage })));
const RhinoVisionPage = lazy(() => import('./components/pages/RhinoVisionPage').then(m => ({ default: m.RhinoVisionPage })));
const RhinoHubPage = lazy(() => import('./pages/RhinoHubPage').then(m => ({ default: m.RhinoHubPage })));
const HubRouter = lazy(() => import('./features/hub/HubRouter').then(m => ({ default: m.HubRouter })));
const PublicTrackingPage = lazy(() => import('./pages/PublicTrackingPage').then(m => ({ default: m.PublicTrackingPage })));
const PrivacyPage = lazy(() => import('./pages/PrivacyPage').then(m => ({ default: m.PrivacyPage })));
const DeleteAccountPage = lazy(() => import('./pages/DeleteAccountPage').then(m => ({ default: m.DeleteAccountPage })));

function AppLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <img src="/logo.jpg" alt="Rhino" className="w-16 h-16 mx-auto mb-4 object-contain" />
        <div className="flex items-center justify-center gap-2 mt-3">
          <Spinner size={20} color="#D3010A" />
          <span className="text-sm" style={{ color: '#8A8886' }}>Cargando...</span>
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <Router>
      <ErrorBoundary>
        <div className="min-h-screen overflow-x-hidden">
          <Suspense fallback={<AppLoading />}>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/rhinovision" element={<RhinoVisionPage />} />
              <Route path="/rhinohub" element={<RhinoHubPage />} />
              <Route path="/tracking" element={<PublicTrackingPage />} />
              <Route path="/tracking/:code" element={<PublicTrackingPage />} />
              <Route path="/hub/*" element={<HubRouter />} />
              <Route path="/privacy" element={<PrivacyPage />} />
              <Route path="/delete-account" element={<DeleteAccountPage />} />
            </Routes>
          </Suspense>
        </div>
      </ErrorBoundary>
    </Router>
  );
}

export default App;
