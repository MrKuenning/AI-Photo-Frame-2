import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useToggles } from '../../hooks/useToggles';
import { useMediaFilter } from '../../hooks/useMediaFilter';
import SettingsModal from '../SettingsModal/SettingsModal';
import PassphraseModal from '../PassphraseModal/PassphraseModal';
import './Header.css';

export default function Header({ currentPath }) {
  const { authStatus } = useAuth();
  const toggles = useToggles();
  const { filterType, setFilterType, triggerRefresh } = useMediaFilter();
  
  const [menuOpen, setMenuOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showPassphrasePrompt, setShowPassphrasePrompt] = useState(false);

  const handleSettingsClick = () => {
    if (authStatus?.settings_passphrase_required) {
      setShowPassphrasePrompt('settings');
    } else {
      setShowSettings(true);
    }
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
          <div className="logo">
            <span className="logo-full">Photo Frame 6</span>
            <span className="logo-icon">PF6</span>
          </div>
          <nav className="main-nav desktop-nav">
            <NavLink to="/" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
              Home
            </NavLink>
            <NavLink to="/gallery" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
              Gallery
            </NavLink>
            <NavLink to="/frame" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
              Frame
            </NavLink>
          </nav>
        </div>

        <div className="header-center">
          <div className="filter-group header-filters">
            <button className={`btn-filter ${filterType === 'all' ? 'active' : ''}`} onClick={() => setFilterType('all')}>All</button>
            <button className={`btn-filter ${filterType === 'image' ? 'active' : ''}`} onClick={() => setFilterType('image')}>Photos</button>
            <button className={`btn-filter ${filterType === 'video' ? 'active' : ''}`} onClick={() => setFilterType('video')}>Videos</button>
          </div>
        </div>

        <div className={`header-right ${menuOpen ? 'open' : ''}`}>
          <nav className="main-nav mobile-nav">
            <NavLink to="/" onClick={() => setMenuOpen(false)} className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
              Home
            </NavLink>
            <NavLink to="/gallery" onClick={() => setMenuOpen(false)} className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
              Gallery
            </NavLink>
            <NavLink to="/frame" onClick={() => setMenuOpen(false)} className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
              Frame
            </NavLink>
          </nav>
          
          <div className="toggles-group">
            {/* View Toggles */}
            <button 
              className={`btn-pill-toggle ${toggles.safeMode ? 'active' : ''}`}
              title="Hide NSFW content"
              onClick={() => {
                if (authStatus?.safemode_passphrase_required && toggles.safeMode) {
                  setShowPassphrasePrompt('safemode');
                } else {
                  toggles.toggleSafeMode();
                }
              }}
            >
              Safe Mode
            </button>
            
            <button 
              className={`btn-pill-toggle ${toggles.contentLock ? 'active' : ''}`}
              title="Hide content in NSFW folders"
              onClick={() => {
                if (authStatus?.content_lock_passphrase_required && toggles.contentLock) {
                  setShowPassphrasePrompt('content_lock');
                } else {
                  toggles.toggleContentLock();
                }
              }}
            >
              Folder Lock
            </button>

            <button 
              className={`btn-pill-toggle ${toggles.contentScan ? 'active' : ''}`}
              title="Auto-detect & flag new files"
              onClick={() => {
                if (authStatus?.content_scan_passphrase_required && toggles.contentScan) {
                  setShowPassphrasePrompt('content_scan');
                } else {
                  toggles.toggleServerContentScan();
                }
              }}
            >
              Content Scan
            </button>
          </div>
          
          <div className="header-actions">
            <button className="btn btn-icon btn-ghost" onClick={triggerRefresh} title="Refresh Media">
              🔄
            </button>
            <button className="btn btn-icon btn-ghost" onClick={handleSettingsClick} title="Settings">
              ⚙️
            </button>
            <button className="btn btn-icon btn-ghost" onClick={toggleFullscreen} title="Toggle Fullscreen">
              ⛶
            </button>
          </div>
        </div>
        
        <button className="mobile-menu-btn btn btn-icon btn-ghost" onClick={() => setMenuOpen(!menuOpen)}>
          ☰
        </button>
      </header>

      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
      
      {showPassphrasePrompt && (
        <PassphraseModal 
          actionName={showPassphrasePrompt}
          title={showPassphrasePrompt === 'settings' ? 'Settings Locked' : 'Toggle Locked'}
          description={`Enter the passphrase to unlock ${showPassphrasePrompt.replace('_', ' ')}.`}
          onClose={() => setShowPassphrasePrompt(false)}
          onSuccess={() => {
            const action = showPassphrasePrompt;
            setShowPassphrasePrompt(false);
            
            // Execute the action that was unlocked
            if (action === 'settings') setShowSettings(true);
            else if (action === 'safemode') toggles.toggleSafeMode();
            else if (action === 'content_lock') toggles.toggleContentLock();
            else if (action === 'content_scan') toggles.toggleServerContentScan();
            else if (action === 'metadata_extraction') toggles.toggleServerMetadataExt();
            else if (action === 'hide_archive') toggles.toggleHideArchive();
          }}
        />
      )}
    </>
  );
}
