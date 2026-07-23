import React, { useRef, useEffect } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { getThumbUrl } from '../../utils/api';
import './MediaGrid.css';

export default function MediaGrid({ 
  items, 
  loading, 
  hasMore, 
  onLoadMore, 
  onItemClick, 
  activeItemId,
  thumbnailSizeSetting = 3,
  aspectRatio = 'square'
}) {
  const parentRef = useRef(null);
  const [columns, setColumns] = React.useState(3);
  const [containerWidth, setContainerWidth] = React.useState(1000);

  useEffect(() => {
    if (!parentRef.current) return;
    
    const observer = new ResizeObserver(entries => {
      for (let entry of entries) {
        const width = entry.contentRect.width;
        if (width === 0) continue;
        
        setContainerWidth(width);
        
        // Calculate dynamic columns based on window-relative size
        // Setting 1-5 maps to ~ 8% - 24% of window width
        const pct = 0.08 + ((thumbnailSizeSetting || 3) - 1) * 0.04;
        const targetPx = window.innerWidth * pct;
        
        // Ensure at least 1 column, max out at realistic limits
        const newCols = Math.max(1, Math.floor((width + 16) / targetPx));
        setColumns(prev => (prev !== newCols ? newCols : prev));
      }
    });
    
    observer.observe(parentRef.current);
    return () => observer.disconnect();
  }, [thumbnailSizeSetting]);

  const rowCount = Math.ceil(items.length / columns);

  const rowVirtualizer = useVirtualizer({
    count: hasMore ? rowCount + 1 : rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => Math.floor(containerWidth / columns) + 16, // Estimate row height (thumbnail width + gap)
    overscan: 3,
  });

  // Trigger loadMore when scrolling near the bottom
  useEffect(() => {
    const [lastItem] = [...rowVirtualizer.getVirtualItems()].reverse();
    if (!lastItem) {
      return;
    }

    if (
      lastItem.index >= rowCount - 1 &&
      hasMore &&
      !loading
    ) {
      onLoadMore();
    }
  }, [
    hasMore,
    loading,
    onLoadMore,
    rowCount,
    rowVirtualizer.getVirtualItems(),
  ]);

  return (
    <div className={`media-grid-container aspect-${aspectRatio}`} ref={parentRef}>
      <div 
        className="media-grid-inner" 
        style={{ 
          height: `${rowVirtualizer.getTotalSize()}px`,
          position: 'relative',
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const isLoaderRow = virtualRow.index > rowCount - 1;
          
          if (isLoaderRow) {
            return (
              <div
                key={`loader-${virtualRow.index}`}
                className="grid-row loader-row"
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                <div className="spinner"></div>
              </div>
            );
          }

          // Calculate which items belong in this row
          const startIndex = virtualRow.index * columns;
          const rowItems = items.slice(startIndex, startIndex + columns);

          return (
            <div
              key={virtualRow.index}
              className="grid-row"
              data-index={virtualRow.index}
              ref={rowVirtualizer.measureElement}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualRow.start}px)`,
                display: 'grid',
                gridTemplateColumns: `repeat(${columns}, 1fr)`,
                gap: '16px',
                padding: '0 16px',
                paddingBottom: '16px'
              }}
            >
              {rowItems.map((item, idx) => {
                const isActive = activeItemId === item.id;
                
                return (
                  <div 
                    key={item.id} 
                    className={`media-thumb ${isActive ? 'active' : ''}`}
                    onClick={() => onItemClick(item, startIndex + idx)}
                  >
                    {/* Bulletproof aspect-ratio spacer: GIF has intrinsic pixel dimensions unlike SVG */}
                    <img src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" style={{ position: 'static', display: 'block', width: '100%', height: 'auto', visibility: 'hidden' }} alt="" />
                    {item.media_type === 'video' ? (
                      <video 
                        src={`${getThumbUrl(item.id)}#t=0.1`} 
                        preload="metadata" 
                        muted 
                        playsInline
                      />
                    ) : (
                      <img 
                        src={getThumbUrl(item.id)} 
                        alt={item.filename} 
                        loading="lazy" 
                      />
                    )}
                    {item.media_type === 'video' && (
                      <div className="video-badge">▶</div>
                    )}
                    {(item.is_content_locked || item.is_nsfw || (item.subfolder || '').toLowerCase().includes('safe')) ? (
                      <div className="media-badges">
                        {item.is_content_locked ? <div className="nsfw-badge">NSFW</div> : null}
                        {item.is_nsfw ? <div className="safemode-badge">Safe Mode</div> : null}
                        {(item.subfolder || '').toLowerCase().includes('safe') ? <div className="safe-badge">SAFE</div> : null}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
      
      {!loading && items.length === 0 && (
        <div className="empty-state fade-in">
          <div className="empty-icon">📁</div>
          <h3>No media found</h3>
          <p>Try adjusting your filters or wait for new files to arrive.</p>
        </div>
      )}
    </div>
  );
}
