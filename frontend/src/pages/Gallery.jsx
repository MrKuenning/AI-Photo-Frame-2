import React, { useState, useEffect, useCallback } from 'react';
import { useMediaList } from '../hooks/useMediaList';
import { useToggles } from '../hooks/useToggles';
import { useWebSocket } from '../hooks/useWebSocket';
import { useMediaFilter } from '../hooks/useMediaFilter';
import { deleteMedia, flagMedia, unflagMedia, markSafe, unmarkSafe, scanFolder } from '../utils/api';
import FolderBrowser from '../components/FolderBrowser/FolderBrowser';
import MediaGrid from '../components/MediaGrid/MediaGrid';
import HeroViewer from '../components/HeroViewer/HeroViewer';
import MetadataOverlay from '../components/MetadataOverlay/MetadataOverlay';
import './Gallery.css';

export default function Gallery() {
  const toggles = useToggles();
  const { isConnected, lastMessage, clearLastMessage } = useWebSocket();
  const { filterType, refreshKey } = useMediaFilter();
  
  const [currentFolder, setCurrentFolder] = useState('');
  const [activeItemIndex, setActiveItemIndex] = useState(-1);
  const [searchQuery, setSearchQuery] = useState('');
  const [showMetadata, setShowMetadata] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [scanProgress, setScanProgress] = useState(null);

  const {
    items,
    loading,
    hasMore,
    filters,
    setFilter,
    loadMore,
    prependItem,
    removeItem,
    removeItemByFilename,
    updateItem,
    refresh
  } = useMediaList({
    subfolder: currentFolder,
    recursive: true,
    safe_mode: toggles.safeMode,
    content_lock: toggles.contentLock,
    search: searchQuery,
    media_type: filterType === 'all' ? undefined : filterType
  });

  // Apply view toggles to filters
  useEffect(() => {
    setFilter('safe_mode', toggles.safeMode);
    setFilter('content_lock', toggles.contentLock);
    setFilter('media_type', filterType === 'all' ? undefined : filterType);
    setActiveItemIndex(-1); // Close viewer when filters change
  }, [toggles.safeMode, toggles.contentLock, filterType, setFilter]);

  // Safety check for out of bounds index
  useEffect(() => {
    if (items.length > 0 && activeItemIndex >= items.length) {
      setActiveItemIndex(0);
    } else if (items.length === 0 && activeItemIndex !== -1) {
      setActiveItemIndex(-1);
    }
  }, [items.length, activeItemIndex]);

  // Sync refreshKey
  useEffect(() => {
    if (refreshKey > 0) refresh();
  }, [refreshKey, refresh]);

  // Handle WebSocket updates
  useEffect(() => {
    if (lastMessage?.type === 'new_image') {
      prependItem(lastMessage);
      clearLastMessage();
    } else if (lastMessage?.type === 'media_deleted') {
      removeItemByFilename(lastMessage.filename);
      clearLastMessage();
    } else if (lastMessage?.type === 'scan_progress') {
      setScanProgress(lastMessage.data);
      if (lastMessage.data.complete) {
        setTimeout(() => setScanProgress(null), 3000);
      }
      clearLastMessage();
    }
  }, [lastMessage, clearLastMessage, prependItem, removeItemByFilename]);

  const handleFolderSelect = (folder) => {
    setCurrentFolder(folder);
    setFilter('subfolder', folder);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setFilter('search', searchQuery);
  };

  const handleItemClick = (item, index) => {
    setActiveItemIndex(index);
  };

  const handleOlder = useCallback(() => {
    if (activeItemIndex >= 0) {
      setActiveItemIndex(activeItemIndex + 1);
      // If we're near the end, load more
      if (activeItemIndex >= items.length - 3 && hasMore) {
        loadMore();
      }
    }
  }, [activeItemIndex, items.length, hasMore, loadMore]);

  const handleNewer = useCallback(() => {
    if (activeItemIndex > 0) {
      setActiveItemIndex(activeItemIndex - 1);
    }
  }, [activeItemIndex]);

  const closeViewer = useCallback(() => {
    setActiveItemIndex(-1);
  }, []);

  const activeItem = activeItemIndex >= 0 ? items[activeItemIndex] : null;

  // Action Handlers
  const handleDelete = async () => {
    if (!activeItem) return;
    try {
      await deleteMedia(activeItem.id);
      removeItem(activeItem.id);
      
      // If we deleted the very last item in the list, we need to go back one
      // Otherwise, the array shrinks and the next item automatically falls into activeItemIndex!
      setActiveItemIndex(prev => {
        if (prev >= items.length - 1) {
          return Math.max(0, prev - 1);
        }
        return prev;
      });
    } catch (err) {
      alert(`Error deleting: ${err.message}`);
    }
  };

  const handleFlagToggle = async () => {
    if (!activeItem) return;
    try {
      let res;
      if (activeItem.is_content_locked) {
        res = await unflagMedia(activeItem.id);
        updateItem(activeItem.id, { is_content_locked: false, subfolder: '', file_path: res.new_path || activeItem.file_path });
      } else {
        res = await flagMedia(activeItem.id);
        updateItem(activeItem.id, { is_content_locked: true, subfolder: 'NSFW', file_path: res.new_path || activeItem.file_path });
      }
    } catch (err) {
      alert(`Error toggling flag: ${err.message}`);
    }
  };

  const handleMarkSafe = async () => {
    if (!activeItem) return;
    try {
      let res;
      const isSafe = (activeItem.subfolder || '').toLowerCase().includes('safe');
      if (isSafe) {
        res = await unmarkSafe(activeItem.id);
        updateItem(activeItem.id, { subfolder: '', file_path: res.new_path || activeItem.file_path });
      } else {
        res = await markSafe(activeItem.id);
        updateItem(activeItem.id, { subfolder: 'SAFE', file_path: res.new_path || activeItem.file_path });
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

  const handleScanFolder = async () => {
    try {
      const res = await scanFolder(currentFolder);
      if (!res.success) {
        alert(res.error || "Failed to start scan");
      }
    } catch (err) {
      alert(`Error starting scan: ${err.message}`);
    }
  };

  useEffect(() => {
    const handleScanRequest = () => {
      handleScanFolder();
    };
    window.addEventListener('scan-folder-request', handleScanRequest);
    return () => window.removeEventListener('scan-folder-request', handleScanRequest);
  }, [currentFolder]);

  return (
    <div className={`gallery-page ${fullscreen ? 'fullscreen-mode' : ''}`}>
      {/* Top Toolbar */}
      {!fullscreen && (
        <div className="gallery-toolbar glass" style={{ paddingBottom: 0, borderBottom: 'none' }}>
          <FolderBrowser 
            currentFolder={currentFolder} 
            onFolderSelect={handleFolderSelect} 
          >
            <div className="slider-container" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Size:</label>
              <select 
                value={toggles.galleryThumbnailSize} 
                onChange={e => toggles.updateGalleryThumbnailSize(Number(e.target.value))}
                className="input"
                style={{ padding: '4px 8px' }}
              >
                {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            
            <form className="search-form" onSubmit={handleSearch} style={{ margin: 0, flexGrow: 1, minWidth: '150px' }}>
              <input 
                type="text" 
                className="input search-input" 
                placeholder="Search prompt, model..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ padding: '4px 8px', width: '100%' }}
              />
            </form>
            
            {scanProgress && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', flexGrow: 1, padding: '0 12px', color: 'var(--text-secondary)', minWidth: '250px', flexBasis: '250px' }}>
                <div style={{ flexGrow: 1, background: 'var(--bg-elevated)', height: '6px', borderRadius: '3px', overflow: 'hidden', minWidth: '100px' }}>
                  <div style={{ width: `${scanProgress.total ? (scanProgress.processed / scanProgress.total) * 100 : 0}%`, background: 'var(--primary)', height: '100%', transition: 'width 0.2s' }}></div>
                </div>
                <div style={{ whiteSpace: 'nowrap' }}>
                  {scanProgress.processed}/{scanProgress.total} checked • {scanProgress.moved} flagged
                </div>
              </div>
            )}
          </FolderBrowser>
        </div>
      )}

      {/* Main Content Area */}
      <div className={`gallery-content ${activeItem ? 'split-view' : ''}`}>
        {!fullscreen && (
          <div className="grid-section">
            <MediaGrid 
              items={items}
              loading={loading}
              hasMore={hasMore}
              onLoadMore={loadMore}
              onItemClick={handleItemClick}
              activeItemId={activeItem?.id}
              thumbnailSizeSetting={toggles.galleryThumbnailSize}
              aspectRatio={toggles.thumbnailAspectRatio}
            />
          </div>
        )}

        {activeItem && (
          <div className={`viewer-section glass fade-in ${fullscreen ? 'expanded' : ''}`}>
            {!fullscreen && <button className="close-viewer-btn" onClick={closeViewer}>✕</button>}
            
            <div className="hero-image-container" style={{ flex: 1, position: 'relative', overflow: 'hidden', minHeight: 0, minWidth: 0 }}>
              <HeroViewer 
                key={activeItem.id}
                item={activeItem} 
                onNext={handleOlder} 
                onPrev={handleNewer} 
                onClose={fullscreen ? () => setFullscreen(false) : closeViewer} 
              />
              {(activeItem.is_content_locked || activeItem.is_nsfw || (activeItem.subfolder || '').toLowerCase().includes('safe')) ? (
                <div className="media-badges" style={{ bottom: '16px', right: '16px', transform: 'scale(1.2)', transformOrigin: 'bottom right' }}>
                  {activeItem.is_content_locked ? <div className="nsfw-badge">NSFW</div> : null}
                  {activeItem.is_nsfw ? <div className="safemode-badge">Safe Mode</div> : null}
                  {(activeItem.subfolder || '').toLowerCase().includes('safe') ? <div className="safe-badge">SAFE</div> : null}
                </div>
              ) : null}
              <MetadataOverlay item={activeItem} showBottomPane={showMetadata} />
            </div>

            {/* Navigation and Action Controls Footer */}
            <div className="hero-controls glass">
              <button className="btn btn-primary flex-grow" onClick={handleNewer} disabled={activeItemIndex <= 0}>
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
                <button className={`btn-icon toggle-btn warning ${activeItem.is_content_locked ? 'active' : ''}`} onClick={handleFlagToggle} title={activeItem.is_content_locked ? "Unflag NSFW" : "Flag as NSFW"}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path>
                    <line x1="4" y1="22" x2="4" y2="15"></line>
                  </svg>
                </button>
                <button className={`btn-icon toggle-btn success ${(activeItem.subfolder || '').toLowerCase().includes('safe') ? 'active' : ''}`} onClick={handleMarkSafe} title="Mark Safe">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill={(activeItem.subfolder || '').toLowerCase().includes('safe') ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
              <button className="btn btn-outline-primary flex-grow" onClick={handleOlder} disabled={activeItemIndex >= items.length - 1 && !hasMore}>
                Previous ➡
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
