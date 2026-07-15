import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWebSocket } from '../hooks/useWebSocket';
import { useToggles } from '../hooks/useToggles';
import { fetchLatest, deleteMedia, flagMedia, markSafe } from '../utils/api';
import { getMediaFileUrl } from '../utils/api';
import './Frame.css';

export default function Frame() {
  const navigate = useNavigate();
  const [latestItem, setLatestItem] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [showControls, setShowControls] = useState(false);
  const { isConnected, lastMessage, clearLastMessage } = useWebSocket();
  const toggles = useToggles();

  const loadLatest = useCallback(async () => {
    try {
      const data = await fetchLatest({
        safe_mode: toggles.safeMode,
        content_lock: toggles.contentLock,
        hide_archive: toggles.hideArchive
      });
      if (data.item) {
        setLatestItem(data.item);
        setHistory([data.item]);
        setHistoryIndex(0);
      } else {
        setLatestItem(null);
      }
    } catch (err) {
      console.error('Error fetching latest media:', err);
    }
  }, [toggles.safeMode, toggles.contentLock, toggles.hideArchive]);

  useEffect(() => {
    loadLatest();
  }, [loadLatest]);

  // Handle WebSocket updates
  useEffect(() => {
    if (lastMessage?.type === 'new_image') {
      setTimeout(() => {
        loadLatest();
      }, 500);
      clearLastMessage();
    }
  }, [lastMessage, loadLatest, clearLastMessage]);

  const handleNext = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setLatestItem(history[newIndex]);
    }
  };

  const handlePrev = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setLatestItem(history[newIndex]);
    }
  };

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'ArrowLeft') handlePrev();
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  // Action Handlers
  const handleFullscreen = (e) => {
    e.stopPropagation();
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  const handleFlag = async (e) => {
    e.stopPropagation();
    if (!latestItem) return;
    try {
      await flagMedia(latestItem.id);
      loadLatest();
    } catch (err) {
      alert(`Error flagging: ${err.message}`);
    }
  };

  if (!latestItem) {
    return (
      <div className="frame-page empty">
        <div className="spinner"></div>
      </div>
    );
  }

  const isVideo = latestItem.media_type === 'video';
  const url = getMediaFileUrl(latestItem.id);

  return (
    <div 
      className="frame-page"
      onMouseMove={() => {
        setShowControls(true);
        // Hide after 3s of inactivity (simple timeout)
        clearTimeout(window.frameTimeout);
        window.frameTimeout = setTimeout(() => setShowControls(false), 3000);
      }}
      onClick={() => setShowControls(!showControls)}
    >
      {/* Background Blur for aesthetics */}
      <div 
        className="frame-bg" 
        style={{ backgroundImage: `url(${url})` }} 
      />

      {/* Main Content */}
      <div className="frame-content">
        {isVideo ? (
          <video src={url} autoPlay loop playsInline className="frame-media" />
        ) : (
          <img src={url} alt={latestItem.filename} className="frame-media" />
        )}
      </div>

      {/* Connection Indicator (always visible if offline) */}
      {!isConnected && (
        <div className="offline-indicator fade-in">
          Offline
        </div>
      )}

      {/* Invisible Navigation Areas */}
      <div className="nav-area left" onClick={(e) => { e.stopPropagation(); handlePrev(); }} />
      <div className="nav-area right" onClick={(e) => { e.stopPropagation(); handleNext(); }} />

      {/* Top Right Controls */}
      <div className={`frame-top-right ${showControls ? 'visible' : ''}`} onClick={e => e.stopPropagation()}>
        <div className="frame-actions">
          <button className="btn-icon" onClick={(e) => { e.stopPropagation(); navigate('/'); }} title="Home">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
          </button>
          <button className="btn-icon" onClick={handleFlag} title="Flag NSFW">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg>
          </button>
          <button className="btn-icon" onClick={handleFullscreen} title="Toggle Fullscreen">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path></svg>
          </button>
        </div>
      </div>

      {/* Minimal Overlay Controls */}
      <div className={`frame-overlay ${showControls ? 'visible' : ''}`} onClick={e => e.stopPropagation()}>
        <div className="frame-info">
          <span className="frame-filename">{latestItem.filename}</span>
          {latestItem.is_nsfw && <span className="frame-badge">NSFW</span>}
        </div>
      </div>
    </div>
  );
}
