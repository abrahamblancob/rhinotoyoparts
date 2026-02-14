import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { HomePage } from './components/pages/HomePage';
import { RhinoVisionPage } from './components/pages/RhinoVisionPage';
import { RhinoHubPage } from './pages/RhinoHubPage';
import { HubRouter } from './features/hub/HubRouter';

function App() {
  return (
    <Router>
      <div className="min-h-screen overflow-x-hidden">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/rhinovision" element={<RhinoVisionPage />} />
          <Route path="/rhinohub" element={<RhinoHubPage />} />
          <Route path="/hub/*" element={<HubRouter />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
