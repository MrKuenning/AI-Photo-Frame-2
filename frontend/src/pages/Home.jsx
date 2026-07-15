import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';
import { useToggles } from '../hooks/useToggles';
import { useMediaFilter } from '../hooks/useMediaFilter';
import { useMediaList } from '../hooks/useMediaList';
import { deleteMedia, flagMedia, unflagMedia, markSafe, unmarkSafe, getThumbUrl } from '../utils/api';
import HeroViewer from '../components/HeroViewer/HeroViewer';
import MetadataOverlay from '../components/MetadataOverlay/MetadataOverlay';
import './Home.css';

export default function Home() {
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [showMetadata, setShowMetadata] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  
  const { isConnected, lastMessage, clearLastMessage } = useWebSocket();
  const toggles = useToggles();
  const { filterType, refreshKey } = useMediaFilter();

  const {
    items: mediaList,
    loading,
    hasMore,
    setFilter,
    loadMore,
    prependItem,
    removeItem,
    removeItemByFilename,
    updateItem,
    refresh
  } = useMediaList({
    safe_mode: toggles.safeMode,
    content_lock: toggles.contentLock,
    media_type: filterType === 'all' ? undefined : filterType
  });

  // Sync toggles and filters with API filters
  useEffect(() => {
    setFilter('safe_mode', toggles.safeMode);
    setFilter('content_lock', toggles.contentLock);
    setFilter('media_type', filterType === 'all' ? undefined : filterType);
    setSelectedIndex(0); // Reset selection when filters change
  }, [toggles.safeMode, toggles.contentLock, filterType, setFilter]);

  // Safety check for out of bounds index
  useEffect(() => {
    if (mediaList.length > 0 && selectedIndex >= mediaList.length) {
      setSelectedIndex(mediaList.length - 1);
    }
  }, [mediaList.length, selectedIndex]);

  // Sync refreshKey
  useEffect(() => {
    if (refreshKey > 0) refresh();
  }, [refreshKey, refresh]);

  // Handle WebSocket updates
  useEffect(() => {
    if (lastMessage?.type === 'new_image') {
      prependItem(lastMessage.data);
      clearLastMessage();
    } else if (lastMessage?.type === 'media_deleted') {
      removeItemByFilename(lastMessage.filename);
      clearLastMessage();
    }
  }, [lastMessage, clearLastMessage, prependItem, removeItemByFilename]);

  // Default selection when mediaList loads
  useEffect(() => {
    if (mediaList.length > 0 && selectedIndex === -1) {
      setSelectedIndex(0);
    } else if (mediaList.length === 0 && selectedIndex !== -1) {
      setSelectedIndex(-1);
    }
  }, [mediaList, selectedIndex]);

  // Infinite Scroll Observer
  const observerTarget = useRef(null);
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );
    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }
    return () => observer.disconnect();
  }, [hasMore, loadMore, loading]);

  const handleOlder = useCallback((e) => {
    if (e) e.stopPropagation();
    if (selectedIndex < mediaList.length - 1) {
      setSelectedIndex(prev => prev + 1);
    }
  }, [selectedIndex, mediaList]);

  const handleNewer = useCallback((e) => {
    if (e) e.stopPropagation();
    if (selectedIndex > 0) {
      setSelectedIndex(prev => prev - 1);
    }
  }, [selectedIndex]);

  const currentItem = mediaList[selectedIndex];

  // Action Handlers
  const handleDelete = async () => {
    if (!currentItem) return;
    try {
      await deleteMedia(currentItem.id);
      removeItem(currentItem.id);
    } catch (err) {
      alert(`Error deleting: ${err.message}`);
    }
  };

  const handleFlagToggle = async () => {
    if (!currentItem) return;
    try {
      let res;
      if (currentItem.is_content_locked) {
        res = await unflagMedia(currentItem.id);
        updateItem(currentItem.id, { is_content_locked: false, subfolder: '', file_path: res.new_path || currentItem.file_path });
      } else {
        res = await flagMedia(currentItem.id);
        updateItem(currentItem.id, { is_content_locked: true, subfolder: 'NSFW', file_path: res.new_path || currentItem.file_path });
      }
    } catch (err) {
      alert(`Error toggling flag: ${err.message}`);
    }
  };

  const handleMarkSafe = async () => {
    if (!currentItem) return;
    try {
      let res;
      const isSafe = (currentItem.subfolder || '').toLowerCase().includes('safe');
      if (isSafe) {
        res = await unmarkSafe(currentItem.id);
        updateItem(currentItem.id, { subfolder: '', file_path: res.new_path || currentItem.file_path });
      } else {
        res = await markSafe(currentItem.id);
        updateItem(currentItem.id, { subfolder: 'SAFE', file_path: res.new_path || currentItem.file_path });
      }
    } catch (err) {
      alert(`Error toggling safe mark: ${err.message}`);
    }
  };

  const toggleAppFullscreen = () => {
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

  const handleExpandView = () => {
    setFullscreen(!fullscreen);
  };

  const handleMediaError = (id) => {
    removeItem(id);
    if (selectedIndex >= mediaList.length - 1) {
      setSelectedIndex(Math.max(0, mediaList.length - 2));
    }
  };

  return (
    <div className={`home-page ${fullscreen ? 'fullscreen-mode' : ''}`}>
      {!fullscreen && (
        <div className="sidebar glass">
          {/* Top of Sidebar: Layout Controls */}
          <div className="sidebar-header" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Thumbnail Columns: {toggles.homeThumbnailColumns}
            </label>
            <input 
              type="range" 
              min="1" 
              max="4" 
              value={toggles.homeThumbnailColumns} 
              onChange={e => toggles.updateHomeThumbnailColumns(Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--primary)' }}
            />
          </div>

          {/* Thumbnails Grid */}
          <div className={`thumbnail-grid aspect-${toggles.thumbnailAspectRatio}`} style={{ gridTemplateColumns: `repeat(${toggles.homeThumbnailColumns}, 1fr)` }}>
            {mediaList.map((item, idx) => (
              <div 
                key={item.id} 
                className={`thumbnail-container ${idx === selectedIndex ? 'selected' : ''}`}
                onClick={() => setSelectedIndex(idx)}
              >
                {item.media_type === 'video' ? (
                  <video 
                    className="thumbnail" 
                    src={`${getThumbUrl(item.id)}#t=0.1`} 
                    preload="metadata" 
                    muted 
                    playsInline
                    onError={() => handleMediaError(item.id)}
                  />
                ) : (
                  <img 
                    className="thumbnail" 
                    src={getThumbUrl(item.id)} 
                    alt={item.filename} 
                    loading="lazy" 
                    onError={() => handleMediaError(item.id)}
                  />
                )}
                {item.is_flagged && <div className="flag-badge">⚠️</div>}
                {(item.is_content_locked || item.is_nsfw || (item.subfolder || '').toLowerCase().includes('safe')) ? (
                  <div className="media-badges">
                    {item.is_content_locked ? <div className="nsfw-badge">NSFW</div> : null}
                    {item.is_nsfw ? <div className="safemode-badge">Safe Mode</div> : null}
                    {(item.subfolder || '').toLowerCase().includes('safe') ? <div className="safe-badge">SAFE</div> : null}
                  </div>
                ) : null}
              </div>
            ))}
            
            {hasMore && (
              <div 
                ref={observerTarget}
                style={{ height: '20px', gridColumn: `1 / -1` }}
              ></div>
            )}
            
            {mediaList.length === 0 && !loading && (
              <div className="text-center p-4 text-muted" style={{ gridColumn: `1 / -1` }}>No media found</div>
            )}
            
            {loading && (
              <div className="text-center p-4 text-muted" style={{ gridColumn: `1 / -1` }}>Loading...</div>
            )}
          </div>
        </div>
      )}

      <div className={`main-content ${fullscreen ? 'expanded' : ''}`}>
        {currentItem ? (
          <div className="hero-section">
            <div className="hero-image-container">
              <HeroViewer 
                key={currentItem.id}
                item={currentItem} 
                onNext={handleOlder} 
                onPrev={handleNewer} 
                onClose={() => setFullscreen(false)} 
              />
              {(currentItem.is_content_locked || currentItem.is_nsfw || (currentItem.subfolder || '').toLowerCase().includes('safe')) ? (
                <div className="media-badges" style={{ bottom: '16px', right: '16px', transform: 'scale(1.2)', transformOrigin: 'bottom right' }}>
                  {currentItem.is_content_locked ? <div className="nsfw-badge">NSFW</div> : null}
                  {currentItem.is_nsfw ? <div className="safemode-badge">Safe Mode</div> : null}
                  {(currentItem.subfolder || '').toLowerCase().includes('safe') ? <div className="safe-badge">SAFE</div> : null}
                </div>
              ) : null}
              <MetadataOverlay item={currentItem} showBottomPane={showMetadata} />
            </div>

            {/* Navigation and Action Controls Footer */}
            <div className="hero-controls glass">
              <button className="btn btn-primary flex-grow" onClick={handleNewer} disabled={selectedIndex <= 0}>
                ⬅ Next
              </button>
              <div className="center-actions">
                <button className={`btn-icon toggle-btn ${showMetadata ? 'active' : ''}`} onClick={() => setShowMetadata(!showMetadata)} title="Show Metadata">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="16" x2="12" y2="12"></line>
                    <line x1="12" y1="8" x2="12.01" y2="8"></line>
                  </svg>
                </button>
                <button className="btn-icon toggle-btn danger" onClick={handleDelete} title="Delete Media">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    <line x1="10" y1="11" x2="10" y2="17"></line>
                    <line x1="14" y1="11" x2="14" y2="17"></line>
                  </svg>
                </button>
                <button className={`btn-icon toggle-btn warning ${currentItem.is_content_locked ? 'active' : ''}`} onClick={handleFlagToggle} title={currentItem.is_content_locked ? "Unflag NSFW" : "Flag as NSFW"}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path>
                    <line x1="4" y1="22" x2="4" y2="15"></line>
                  </svg>
                </button>
                <button className={`btn-icon toggle-btn success ${(currentItem.subfolder || '').toLowerCase().includes('safe') ? 'active' : ''}`} onClick={handleMarkSafe} title="Mark Safe">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill={(currentItem.subfolder || '').toLowerCase().includes('safe') ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                    <polyline points="9 12 11 14 15 10"></polyline>
                  </svg>
                </button>
                <button className={`btn-icon toggle-btn ${fullscreen ? 'active' : ''}`} onClick={handleExpandView} title={fullscreen ? "Exit Expanded View" : "Expanded View"}>
                  {fullscreen ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="4 14 10 14 10 20"></polyline>
                      <polyline points="20 10 14 10 14 4"></polyline>
                      <line x1="14" y1="10" x2="21" y2="3"></line>
                      <line x1="3" y1="21" x2="10" y2="14"></line>
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="15 3 21 3 21 9"></polyline>
                      <polyline points="9 21 3 21 3 15"></polyline>
                      <line x1="21" y1="3" x2="14" y2="10"></line>
                      <line x1="3" y1="21" x2="10" y2="14"></line>
                    </svg>
                  )}
                </button>
                <button className="btn-icon toggle-btn" onClick={toggleAppFullscreen} title="Toggle Browser Fullscreen">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="8 3 3 3 3 8"></polyline>
                    <polyline points="16 3 21 3 21 8"></polyline>
                    <polyline points="8 21 3 21 3 16"></polyline>
                    <polyline points="16 21 21 21 21 16"></polyline>
                    <line x1="3" y1="3" x2="9" y2="9"></line>
                    <line x1="21" y1="3" x2="15" y2="9"></line>
                    <line x1="3" y1="21" x2="9" y2="15"></line>
                    <line x1="21" y1="21" x2="15" y2="15"></line>
                  </svg>
                </button>
              </div>
              <button className="btn btn-outline-primary flex-grow" onClick={handleOlder} disabled={selectedIndex >= mediaList.length - 1}>
                Previous ➡
              </button>
            </div>
          </div>
        ) : (
          <div className="empty-state fade-in">
            <div className="empty-icon">🖼️</div>
            <h3>Waiting for incoming media...</h3>
            <p>Generate some images to see them appear here automatically.</p>
          </div>
        )}
      </div>
    </div>
  );
}
