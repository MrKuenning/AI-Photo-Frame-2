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
    if (!newItem) return;
    
    // Only prepend if it matches the current filters (e.g. subfolder)
    if (filters.subfolder && newItem.subfolder !== filters.subfolder) return;
    if (filters.media_type && filters.media_type !== 'all' && newItem.media_type !== filters.media_type) return;

    // We now receive the full item from the database via WebSocket, including its real ID!
    setItems(prev => {
      // Prevent duplicates if already inserted
      if (prev.find(i => i.id === newItem.id)) return prev;
      return [newItem, ...prev];
    });
    setTotal(t => t + 1);
    offsetRef.current += 1;
  }, [filters]);

  // Remove a single item (e.g. on error or delete)
  const removeItem = useCallback((id) => {
    setItems(prev => prev.filter(item => item.id !== id));
    setTotal(t => t - 1);
  }, []);

  const removeItemByFilename = useCallback((filename) => {
    setItems(prev => {
      const filtered = prev.filter(item => item.filename !== filename);
      if (filtered.length !== prev.length) setTotal(t => Math.max(0, t - 1));
      return filtered;
    });
  }, []);

  // Update a single item in place
  const updateItem = useCallback((id, updates) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
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
    removeItemByFilename,
    updateItem,
    refresh: () => loadPage(true)
  };
}
