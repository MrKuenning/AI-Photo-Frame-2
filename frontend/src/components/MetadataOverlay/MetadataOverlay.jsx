import React, { useState, useEffect } from 'react';
import { fetchMetadata, getMediaFileUrl } from '../../utils/api';
import './MetadataOverlay.css';

const MetadataContent = ({ metadata, item, loading }) => {
  if (loading) {
    return (
      <div className="metadata-loader">
        <div className="spinner"></div>
      </div>
    );
  }

  if (!metadata) return null;

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text).catch(err => console.error('Copy failed', err));
  };

  return (
    <>
      {metadata.prompt && (
        <div className="meta-section">
          <div className="meta-section-header">
            <h4>Prompt</h4>
            <button className="btn-copy" onClick={() => handleCopy(metadata.prompt)} title="Copy Prompt">📋</button>
          </div>
          <p className="meta-text">{metadata.prompt}</p>
        </div>
      )}
      
      {metadata.negative_prompt && (
        <div className="meta-section">
          <div className="meta-section-header">
            <h4>Negative Prompt</h4>
            <button className="btn-copy" onClick={() => handleCopy(metadata.negative_prompt)} title="Copy Negative Prompt">📋</button>
          </div>
          <p className="meta-text">{metadata.negative_prompt}</p>
        </div>
      )}

      <div className="meta-grid">
        {metadata.model && (
          <div className="meta-item">
            <span className="meta-label">Model</span>
            <span className="meta-value">{metadata.model}</span>
          </div>
        )}
        {metadata.seed && (
          <div className="meta-item">
            <span className="meta-label">Seed</span>
            <span className="meta-value">{metadata.seed}</span>
          </div>
        )}
        {metadata.dimensions && (
          <div className="meta-item">
            <span className="meta-label">Size</span>
            <span className="meta-value">{metadata.dimensions}</span>
          </div>
        )}
        {item.file_size > 0 && (
          <div className="meta-item">
            <span className="meta-label">File Size</span>
            <span className="meta-value">{(item.file_size / (1024 * 1024)).toFixed(2)} MB</span>
          </div>
        )}
      </div>

      {metadata.loras && metadata.loras.length > 0 && (
        <div className="meta-section">
          <h4>LoRAs</h4>
          <div className="lora-tags">
            {metadata.loras.map((lora, i) => (
              <span key={i} className="lora-tag">
                {lora.name} <span className="lora-weight">({lora.weight})</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {!metadata.prompt && !metadata.model && (
        <div className="no-metadata">
          No embedded AI metadata found.
        </div>
      )}
    </>
  );
};

export default function MetadataOverlay({ item, showBottomPane }) {
  const [isOpen, setIsOpen] = useState(false);
  const [metadata, setMetadata] = useState(null);
  const [loading, setLoading] = useState(showBottomPane); // Start loading immediately if bottom pane is open
  const [lastFetchedId, setLastFetchedId] = useState(null);

  // If item changes, clear metadata immediately during render to prevent showing old data
  if (item && item.id !== lastFetchedId && metadata !== null) {
    setMetadata(null);
    setIsOpen(false);
    if (showBottomPane) setLoading(true);
  }

  useEffect(() => {
    // Fetch if either view is open and we haven't fetched this item yet
    if ((isOpen || showBottomPane) && item && item.id !== lastFetchedId) {
      setLoading(true);
      fetchMetadata(item.id)
        .then(data => {
          setMetadata(data);
          setLastFetchedId(item.id);
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [isOpen, showBottomPane, item, lastFetchedId]);

  if (!item) return null;

  const handleDownload = (e) => {
    e.stopPropagation();
    const downloadUrl = getMediaFileUrl(item.id);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = item.filename || 'download';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <>
      {/* Top Right Floating Popup View */}
      <div className={`metadata-overlay ${isOpen ? 'open' : ''}`}>
        <div className="top-action-buttons">
          <button 
            className="top-action-btn download-btn glass" 
            onClick={handleDownload}
            title="Download Media (Save original file)"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
          </button>

          <button 
            className="metadata-toggle top-action-btn glass" 
            onClick={() => setIsOpen(!isOpen)}
            title="Toggle Metadata Details (i)"
          >
            i
          </button>
        </div>

        {isOpen && (
          <div className="metadata-panel glass fade-in">
            <div className="metadata-header">
              <h3>Image Details</h3>
              <span className="file-info">{item.filename}</span>
            </div>

            <div className="metadata-content">
              <MetadataContent metadata={metadata} item={item} loading={loading} />
            </div>
          </div>
        )}
      </div>

      {/* Permanently Docked Bottom View */}
      {showBottomPane && (
        <div className="metadata-bottom-pane glass fade-in">
          <div className="metadata-bottom-content">
            <MetadataContent metadata={metadata} item={item} loading={loading} />
          </div>
        </div>
      )}
    </>
  );
}
