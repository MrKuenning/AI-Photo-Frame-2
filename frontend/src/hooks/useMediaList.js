import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchMedia } from '../utils/api';

/**
 * Hook for managing paginated media list with infinite scrolling
 */
export function useMediaList(initialFilters = {}) {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [filters, setFilters] = useState(initialFilters);
  
  const offsetRef = useRef(0);
  const loadingRef = useRef(false);
  const limitRef = useRef(null);
  const hasMoreRef = useRef(true);
  const reqIdRef = useRef(0);

  // Fetch a page of data
  const loadPage = useCallback(async (isInitial = false) => {
    if (!isInitial && loadingRef.current) return;
    if (!isInitial && !hasMoreRef.current) return;

    const currentReqId = ++reqIdRef.current;
    
    loadingRef.current = true;
    setLoading(true);
    setError(null);

    const currentOffset = isInitial ? 0 : offsetRef.current;

    try {
      if (!limitRef.current) {
        const { fetchSettings } = await import('../utils/api.js');
        const settings = await fetchSettings();
        limitRef.current = settings.max_initial_load || 50;
      }

      const data = await fetchMedia({
        ...filters,
        offset: currentOffset,
        limit: limitRef.current,
      });

      if (currentReqId !== reqIdRef.current) {
        return; // Stale request
      }

      setItems(prev => isInitial ? data.items : [...prev, ...data.items]);
      setTotal(data.total);
      setHasMore(data.has_more);
      hasMoreRef.current = data.has_more;
      offsetRef.current = currentOffset + data.items.length;
    } catch (err) {
      if (currentReqId === reqIdRef.current) {
        console.error('Error fetching media:', err);
        setError(err.message);
      }
    } finally {
      if (currentReqId === reqIdRef.current) {
        loadingRef.current = false;
        setLoading(false);
      }
    }
  }, [filters]);

  // Initial load when filters change
  useEffect(() => {
    loadPage(true);
  }, [loadPage]);

  // Load more trigger for infinite scroll
  const loadMore = useCallback(() => {
    loadPage(false);
  }, [loadPage]);

  // Update a single filter
  const setFilter = useCallback((key, value) => {
    setFilters(prev => {
      if (prev[key] === value) return prev;
      return { ...prev, [key]: value };
    });
  }, []);

  // Prepend a new item (e.g. from WebSocket)
  const prependItem = useCallback((newItem) => {
    // Quick filter check for subfolder
    if (filters.subfolder && !newItem.subfolder.startsWith(filters.subfolder)) {
      return;
    }
    // Filter check for media type
    if (filters.media_type && filters.media_type !== 'all' && 
        ((filters.media_type === 'photos' && newItem.media_type !== 'image') ||
         (filters.media_type === 'videos' && newItem.media_type !== 'video'))) {
      return;
    }
    
    // Convert ws payload to format matching API
    const item = {
      id: Date.now(), // Temporary ID until we reload
      filename: newItem.filename,
      subfolder: newItem.subfolder,
      media_type: newItem.media_type || 'image',
      file_path: newItem.subfolder ? `${newItem.subfolder}/${newItem.filename}` : newItem.filename
    };

    setItems(prev => [item, ...prev]);
    setTotal(t => t + 1);
    offsetRef.current += 1;
  }, [filters]);

  // Remove a single item (e.g. on error or delete)
  const removeItem = useCallback((id) => {
    setItems(prev => prev.filter(item => item.id !== id));
    setTotal(t => t - 1);
  }, []);

  return {
    items,
    total,
    loading,
    error,
    hasMore,
    filters,
    setFilter,
    setFilters,
    loadMore,
    prependItem,
    removeItem,
    refresh: () => loadPage(true)
  };
}
