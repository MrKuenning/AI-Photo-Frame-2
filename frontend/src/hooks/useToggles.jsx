import { useState, useEffect, createContext, useContext } from 'react';
import { fetchToggleStatus, toggleContentScan, toggleMetadataExtraction } from '../utils/api';
import { useAuth } from './useAuth';

const TogglesContext = createContext(null);

export function TogglesProvider({ children }) {
  const { authStatus } = useAuth();
  
  // Server-side toggles
  const [contentScan, setContentScan] = useState(false);
  
  // Client-side view toggles (persisted in localStorage or derived from auth defaults)
  const [safeMode, setSafeMode] = useState(false);
  const [contentLock, setContentLock] = useState(false);
  const [homeThumbnailColumns, setHomeThumbnailColumns] = useState(3);
  const [galleryThumbnailSize, setGalleryThumbnailSize] = useState(3);
  const [thumbnailAspectRatio, setThumbnailAspectRatio] = useState('square');

  // Load server toggle states
  useEffect(() => {
    fetchToggleStatus().then(status => {
      setContentScan(status.content_scan);
    }).catch(console.error);
  }, []);

  // Initialize client view toggles from auth defaults if not in localStorage
  useEffect(() => {
    if (authStatus && !authStatus.loading) {
      const initToggle = (key, defaultVal) => {
        const stored = localStorage.getItem(key);
        if (stored !== null) return stored === 'true';
        return defaultVal;
      };
      
      const initString = (key, defaultVal) => {
        const stored = localStorage.getItem(key);
        if (stored !== null) return stored;
        return defaultVal;
      };
      
      const initInt = (key, defaultVal) => {
        const stored = localStorage.getItem(key);
        if (stored !== null) return parseInt(stored, 10);
        return defaultVal;
      };

      setSafeMode(initToggle('safeMode', authStatus.safe_mode_default));
      setContentLock(initToggle('contentLock', authStatus.content_lock_default));
      setHomeThumbnailColumns(initInt('homeThumbnailColumns', authStatus.home_thumbnail_columns_default || 3));
      setGalleryThumbnailSize(initInt('galleryThumbnailSize', authStatus.gallery_thumbnail_size_default || 3));
      setThumbnailAspectRatio(initString('thumbnailAspectRatio', authStatus.thumbnail_aspect_ratio_default || 'square'));
    }
  }, [authStatus]);

  // Handlers for server-side toggles
  const toggleServerContentScan = async () => {
    try {
      const res = await toggleContentScan(!contentScan);
      setContentScan(res.enabled);
    } catch (err) {
      console.error('Failed to toggle content scan', err);
    }
  };

  // Handlers for client-side toggles
  const toggleSafeMode = () => {
    const newVal = !safeMode;
    setSafeMode(newVal);
    localStorage.setItem('safeMode', String(newVal));
  };

  const toggleContentLock = () => {
    const newVal = !contentLock;
    setContentLock(newVal);
    localStorage.setItem('contentLock', String(newVal));
  };
  
  const updateHomeThumbnailColumns = (cols) => {
    setHomeThumbnailColumns(cols);
    localStorage.setItem('homeThumbnailColumns', String(cols));
  };
  
  const updateGalleryThumbnailSize = (size) => {
    setGalleryThumbnailSize(size);
    localStorage.setItem('galleryThumbnailSize', String(size));
  };
  
  const updateThumbnailAspectRatio = (ratio) => {
    setThumbnailAspectRatio(ratio);
    localStorage.setItem('thumbnailAspectRatio', ratio);
  };

  return (
    <TogglesContext.Provider value={{
      contentScan,
      safeMode, contentLock,
      homeThumbnailColumns, galleryThumbnailSize, thumbnailAspectRatio,
      toggleServerContentScan,
      toggleSafeMode, toggleContentLock,
      updateHomeThumbnailColumns, updateGalleryThumbnailSize, updateThumbnailAspectRatio
    }}>
      {children}
    </TogglesContext.Provider>
  );
}

export function useToggles() {
  const context = useContext(TogglesContext);
  if (!context) {
    throw new Error('useToggles must be used within a TogglesProvider');
  }
  return context;
}
