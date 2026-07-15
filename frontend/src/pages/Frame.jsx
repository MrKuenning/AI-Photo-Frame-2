import React, { useState, useEffect, useCallback } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';
import { useToggles } from '../hooks/useToggles';
import { fetchLatest, deleteMedia, flagMedia, markSafe } from '../utils/api';
import { getMediaFileUrl } from '../utils/api';
import './Frame.css';

export default function Frame() {
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
  const handleDelete = async (e) => {
    e.stopPropagation();
    if (!latestItem) return;
    try {
      await deleteMedia(latestItem.id);
      loadLatest();
    } catch (err) {
      alert(`Error deleting: ${err.message}`);
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

      {/* Minimal Overlay Controls */}
      <div className={`frame-overlay ${showControls ? 'visible' : ''}`} onClick={e => e.stopPropagation()}>
        <div className="frame-info">
          <span className="frame-filename">{latestItem.filename}</span>
          {latestItem.is_nsfw && <span className="frame-badge">NSFW</span>}
        </div>
        
        <div className="frame-actions">
          <button className="btn-icon" onClick={handleDelete} title="Delete">🗑️</button>
          <button className="btn-icon" onClick={handleFlag} title="Flag NSFW">⚠️</button>
        </div>
      </div>
    </div>
  );
}
