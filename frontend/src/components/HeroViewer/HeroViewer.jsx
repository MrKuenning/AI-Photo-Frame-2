import React, { useState, useEffect, useRef } from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { getMediaFileUrl } from '../../utils/api';
import './HeroViewer.css';
import VideoPlayer from '../VideoPlayer/VideoPlayer';

export default function HeroViewer({ item, onNext, onPrev, onClose }) {
  const [loading, setLoading] = useState(true);
  const containerRef = useRef(null);

  useEffect(() => {
    setLoading(true);
    
    // Auto-focus container for keyboard events
    if (containerRef.current) {
      containerRef.current.focus();
    }
  }, [item?.id]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowRight') onNext();
      if (e.key === 'ArrowLeft') onPrev();
      if (e.key === 'Escape') onClose();
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onNext, onPrev, onClose]);

  if (!item) return null;

  const isVideo = item.media_type === 'video';
  const url = getMediaFileUrl(item.id);

  return (
    <div className="hero-viewer-container" ref={containerRef} tabIndex="-1">
      {/* Navigation Controls */}
      <button className="nav-btn prev-btn glass" onClick={onPrev} title="Previous (Left Arrow)">
        ◀
      </button>
      <button className="nav-btn next-btn glass" onClick={onNext} title="Next (Right Arrow)">
        ▶
      </button>

      {/* Main Content */}
      <div className="hero-content">
        {loading && !isVideo && (
          <div className="hero-loader">
            <div className="spinner"></div>
          </div>
        )}

        {isVideo ? (
          <VideoPlayer url={url} item={item} onLoad={() => setLoading(false)} />
        ) : (
          <TransformWrapper
            initialScale={1}
            minScale={1}
            maxScale={5}
            centerOnInit
            wheel={{ step: 0.002 }}
            doubleClick={{ disabled: true }}
            panning={{ disabled: false }}
            pinch={{ disabled: false }}
          >
            {({ zoomIn, zoomOut, resetTransform }) => (
              <>
                <TransformComponent 
                  wrapperClass="hero-transform-wrapper" 
                  contentClass="hero-transform-content"
                  wrapperStyle={{ width: "100%", height: "100%" }}
                  contentStyle={{ width: "100%", height: "100%", display: "flex", justifyContent: "center", alignItems: "center" }}
                >
                  <div 
                    onDoubleClick={() => resetTransform(200, "easeOut")}
                    style={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
                  >
                    <img
                      src={url}
                      alt={item.filename}
                      className={`hero-image ${loading ? 'loading' : ''}`}
                      onLoad={() => setLoading(false)}
                      onError={() => setLoading(false)} // Handle errors gracefully
                    />
                  </div>
                </TransformComponent>
              </>
            )}
          </TransformWrapper>
        )}
      </div>
    </div>
  );
}
