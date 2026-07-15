import React, { createContext, useContext, useState, useCallback } from 'react';

const MediaFilterContext = createContext(null);

export function MediaFilterProvider({ children }) {
  const [filterType, setFilterType] = useState('all');
  const [refreshKey, setRefreshKey] = useState(0);
  
  const triggerRefresh = useCallback(() => {
    setRefreshKey(prev => prev + 1);
  }, []);

  return (
    <MediaFilterContext.Provider value={{ filterType, setFilterType, refreshKey, triggerRefresh }}>
      {children}
    </MediaFilterContext.Provider>
  );
}

export function useMediaFilter() {
  const context = useContext(MediaFilterContext);
  if (!context) {
    throw new Error('useMediaFilter must be used within a MediaFilterProvider');
  }
  return context;
}
