import React, { useState, useEffect } from 'react';
import { fetchMetadata } from '../../utils/api';
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
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Fetch if either view is open
    if ((isOpen || showBottomPane) && item && !metadata) {
      setLoading(true);
      fetchMetadata(item.id)
        .then(setMetadata)
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [isOpen, showBottomPane, item, metadata]);

  // Reset when item changes
  useEffect(() => {
    setMetadata(null);
    setIsOpen(false);
  }, [item]);

  if (!item) return null;

  return (
    <>
      {/* Top Right Floating Popup View */}
      <div className={`metadata-overlay ${isOpen ? 'open' : ''}`}>
        <button 
          className="metadata-toggle glass" 
          onClick={() => setIsOpen(!isOpen)}
          title="Toggle Metadata Details (i)"
        >
          i
        </button>

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
