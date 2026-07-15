import React from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import { TogglesProvider } from './hooks/useToggles';
import { MediaFilterProvider } from './hooks/useMediaFilter';
import Header from './components/Layout/Header';
import Home from './pages/Home';
import Gallery from './pages/Gallery';
import Frame from './pages/Frame';
import './App.css';

// Wrapper to hide header on frame page
function AppLayout() {
  const location = useLocation();
  const isFrame = location.pathname === '/frame';

  return (
    <div className="app-container">
      {!isFrame && <Header currentPath={location.pathname} />}
      <main className={`main-content-wrapper ${isFrame ? 'fullscreen' : ''}`}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/gallery" element={<Gallery />} />
          <Route path="/frame" element={<Frame />} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <TogglesProvider>
        <MediaFilterProvider>
          <BrowserRouter>
            <AppLayout />
          </BrowserRouter>
        </MediaFilterProvider>
      </TogglesProvider>
    </AuthProvider>
  );
}

export default App;
