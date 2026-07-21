import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { fetchMedia, fetchSettings } from '../utils/api';

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
    if (!newItem) return false;
    
    // Only prepend if it matches the current filters (e.g. subfolder)
    if (filters.subfolder && newItem.subfolder !== filters.subfolder) return false;
    if (filters.media_type && filters.media_type !== 'all' && newItem.media_type !== filters.media_type) return false;
    if (filters.safe_mode && newItem.is_nsfw) return false;
    if (filters.content_lock && newItem.is_content_locked) return false;

    let wasInserted = false;
    let isOlderThanAll = false;

    setItems(prev => {
      // Prevent duplicates if already inserted
      if (prev.find(i => i.id === newItem.id)) return prev;
      
      const newItems = [...prev];
      const insertIndex = newItems.findIndex(item => newItem.mod_time >= item.mod_time);
      
      if (insertIndex !== -1) {
          newItems.splice(insertIndex, 0, newItem);
      } else {
          isOlderThanAll = true;
          // It's older than everything currently loaded.
          if (!hasMoreRef.current) {
              newItems.push(newItem);
              wasInserted = true;
          } else {
              return prev; // Ignore, it will be loaded later when scrolling
          }
      }
      return newItems;
    });
    
    // Total count in the database increased
    setTotal(t => t + 1);
    
    // If the item is older than all currently loaded items, and we haven't loaded everything,
    // it was inserted AFTER our current offset, so we shouldn't increase the offset.
    // Otherwise, we increase it because everything after it shifts down.
    if (!isOlderThanAll || !hasMoreRef.current) {
      offsetRef.current += 1;
    }
    
    return true; // Accepted and prepended
  }, [filters]);

  // Remove a single item (e.g. on error or delete)
  const removeItem = useCallback((id) => {
    setItems(prev => {
      const filtered = prev.filter(item => item.id !== id);
      if (filtered.length !== prev.length) {
        setTotal(t => Math.max(0, t - 1));
        offsetRef.current = Math.max(0, offsetRef.current - 1);
      }
      return filtered;
    });
  }, []);

  const removeItemByFilename = useCallback((filename) => {
    setItems(prev => {
      const filtered = prev.filter(item => item.filename !== filename);
      if (filtered.length !== prev.length) {
        setTotal(t => Math.max(0, t - 1));
        offsetRef.current = Math.max(0, offsetRef.current - 1);
      }
      return filtered;
    });
  }, []);

  // Update a single item in place
  const updateItem = useCallback((id, updates) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
  }, []);

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      if (filters.media_type && filters.media_type !== 'all' && item.media_type !== filters.media_type) return false;
      if (filters.subfolder && item.subfolder !== filters.subfolder) return false;
      if (filters.safe_mode && item.is_nsfw) return false;
      if (filters.content_lock && item.is_content_locked) return false;
      return true;
    });
  }, [items, filters]);

  return {
    items: filteredItems,
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
