import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useToggles } from '../../hooks/useToggles';
import { useMediaFilter } from '../../hooks/useMediaFilter';
import { useWebSocket } from '../../hooks/useWebSocket';
import SettingsModal from '../SettingsModal/SettingsModal';
import { rescanMedia } from '../../utils/api';
import './Header.css';

export default function Header({ currentPath }) {
  const { authStatus, requireUnlock } = useAuth();
  const toggles = useToggles();
  const { filterType, setFilterType, triggerRefresh } = useMediaFilter();
  const { isConnected } = useWebSocket();
  
  const [menuOpen, setMenuOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const handleRefreshClick = async () => {
    try {
      await rescanMedia();
    } catch (err) {
      console.error('Error rescanning media:', err);
    }
    triggerRefresh();
  };

  const handleSettingsClick = () => {
    requireUnlock('settings', authStatus?.settings_passphrase_required, () => {
      setShowSettings(true);
    });
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  return (
    <>
      <header className="header glass">
        <div className="header-left">
          <div className="logo" style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <div>
              <span className="logo-full">Photo Frame 2</span>
              <span className="logo-icon">PF2</span>
            </div>
            <div className="app-status-indicator">
              <div className={`status-dot ${isConnected ? 'online' : 'offline'}`}></div>
              <span>{isConnected ? 'Live' : 'Connecting...'}</span>
              <span className="build-version">v{__APP_VERSION__}</span>
            </div>
          </div>
          <nav className="main-nav desktop-nav">
            <NavLink to="/" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg> Home
            </NavLink>
            <NavLink to="/gallery" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg> Gallery
            </NavLink>
            <NavLink to="/frame" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg> Frame
            </NavLink>
          </nav>
        </div>

        <div style={{ flex: 1 }}></div>

        <div className={`header-right ${menuOpen ? 'open' : ''}`}>
          <nav className="main-nav mobile-nav">
            <NavLink to="/" onClick={() => setMenuOpen(false)} className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg> Home
            </NavLink>
            <NavLink to="/gallery" onClick={() => setMenuOpen(false)} className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg> Gallery
            </NavLink>
            <NavLink to="/frame" onClick={() => setMenuOpen(false)} className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg> Frame
            </NavLink>
          </nav>
          
          <div className="toggles-group">
            <div className="filter-group header-filters">
              <button className={`btn-filter ${filterType === 'all' ? 'active' : ''}`} onClick={() => { setFilterType('all'); setMenuOpen(false); }}>All</button>
              <button className={`btn-filter ${filterType === 'image' ? 'active' : ''}`} onClick={() => { setFilterType('image'); setMenuOpen(false); }}>Photos</button>
              <button className={`btn-filter ${filterType === 'video' ? 'active' : ''}`} onClick={() => { setFilterType('video'); setMenuOpen(false); }}>Videos</button>
            </div>
            
            {/* View Toggles */}
            <button 
              className={`btn-pill-toggle ${toggles.safeMode ? 'active' : ''}`}
              title="Hide NSFW content"
              onClick={() => {
                requireUnlock('safemode', authStatus?.safemode_passphrase_required && toggles.safeMode, () => {
                  toggles.toggleSafeMode();
                });
              }}
            >
              Safe Mode
            </button>
            
            <button 
              className={`btn-pill-toggle ${toggles.contentLock ? 'active' : ''}`}
              title="Hide content in NSFW folders"
              onClick={() => {
                requireUnlock('content_lock', authStatus?.content_lock_passphrase_required && toggles.contentLock, () => {
                  toggles.toggleContentLock();
                });
              }}
            >
              Folder Lock
            </button>

            <button 
              className={`btn-pill-toggle ${toggles.contentScan ? 'active' : ''}`}
              title="Auto-detect & flag new files"
              onClick={() => {
                requireUnlock('content_scan', authStatus?.content_scan_passphrase_required && toggles.contentScan, () => {
                  toggles.toggleServerContentScan();
                });
              }}
            >
              Content Scan
            </button>
            
            {currentPath === '/gallery' && (
              <button 
                className="btn-pill-toggle"
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('scan-folder-request'));
                  setMenuOpen(false);
                }}
                title="Scan current folder for NSFW content"
                style={{ color: 'var(--primary)', borderColor: 'var(--primary)' }}
              >
                Scan Folder
              </button>
            )}
          </div>
          
          <div className="header-actions">
            <button className="btn btn-icon btn-ghost" onClick={handleRefreshClick} title="Refresh Media">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
            </button>
            <button className="btn btn-icon btn-ghost" onClick={handleSettingsClick} title="Settings">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
            </button>
            <button className="btn btn-icon btn-ghost" onClick={toggleFullscreen} title="Toggle Fullscreen">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path></svg>
            </button>
          </div>
        </div>
        
        <button className="mobile-menu-btn btn btn-icon btn-ghost" onClick={() => setMenuOpen(!menuOpen)}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
        </button>
      </header>

      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </>
  );
}
