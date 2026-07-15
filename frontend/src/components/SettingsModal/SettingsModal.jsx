import React, { useState, useEffect } from 'react';
import { fetchSettings, saveSettings } from '../../utils/api';
import { useToggles } from '../../hooks/useToggles';
import './SettingsModal.css';

const NUDENET_LABELS = [
  { id: 'FEMALE_BREAST_EXPOSED', label: 'Female Breast' },
  { id: 'FEMALE_GENITALIA_EXPOSED', label: 'Female Genitalia' },
  { id: 'MALE_GENITALIA_EXPOSED', label: 'Male Genitalia' },
  { id: 'BUTTOCKS_EXPOSED', label: 'Buttocks' },
  { id: 'ANUS_EXPOSED', label: 'Anus' },
  { id: 'BELLY_EXPOSED', label: 'Belly' },
  { id: 'FEMALE_BREAST_COVERED', label: 'Female Breast (Covered)' },
  { id: 'BUTTOCKS_COVERED', label: 'Buttocks (Covered)' },
];

export default function SettingsModal({ onClose }) {
  const toggles = useToggles();
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('global');

  useEffect(() => {
    fetchSettings()
      .then(data => {
        setSettings(data.settings);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message || 'Failed to load settings');
        setLoading(false);
      });
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    let finalValue = type === 'checkbox' ? checked : value;
    
    if (type === 'number' || type === 'range') {
        finalValue = Number(value);
    }

    setSettings(prev => ({
      ...prev,
      [name]: finalValue
    }));
  };

  const handleCheckboxListChange = (name, value, isChecked) => {
     let currentList = settings[name] ? settings[name].split(',').map(s => s.trim()).filter(Boolean) : [];
     if (isChecked) {
         if (!currentList.includes(value)) currentList.push(value);
     } else {
         currentList = currentList.filter(item => item !== value);
     }
     setSettings(prev => ({
         ...prev,
         [name]: currentList.join(', ')
     }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await saveSettings(settings);
      
      if (settings.HOME_THUMBNAIL_COLUMNS_DEFAULT !== undefined) {
        toggles.updateHomeThumbnailColumns(parseInt(settings.HOME_THUMBNAIL_COLUMNS_DEFAULT, 10));
      }
      if (settings.GALLERY_THUMBNAIL_SIZE_DEFAULT !== undefined) {
        toggles.updateGalleryThumbnailSize(parseInt(settings.GALLERY_THUMBNAIL_SIZE_DEFAULT, 10));
      }
      if (settings.THUMBNAIL_ASPECT_RATIO !== undefined) {
        toggles.updateThumbnailAspectRatio(settings.THUMBNAIL_ASPECT_RATIO);
      }
      
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save settings');
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content glass" onClick={e => e.stopPropagation()}>
          <div className="modal-body text-center p-5">
            <div className="spinner"></div>
            <p className="mt-3">Loading settings...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error && !settings) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content glass" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <h2>⚙️ Settings</h2>
            <button className="btn-close" onClick={onClose}>×</button>
          </div>
          <div className="modal-body p-5">
            <div className="alert alert-danger">{error}</div>
          </div>
        </div>
      </div>
    );
  }

  const nsfwLabelsSelected = settings.NSFW_LABELS ? settings.NSFW_LABELS.split(',').map(s => s.trim()) : [];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content glass settings-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>⚙️ Settings</h2>
          <button className="btn-close" onClick={onClose}>×</button>
        </div>
        <div className="settings-tabs">
          <button className={`tab-btn ${activeTab === 'global' ? 'active' : ''}`} onClick={() => setActiveTab('global')}>Global</button>
          <button className={`tab-btn ${activeTab === 'view' ? 'active' : ''}`} onClick={() => setActiveTab('view')}>View</button>
          <button className={`tab-btn ${activeTab === 'security' ? 'active' : ''}`} onClick={() => setActiveTab('security')}>Security</button>
          <button className={`tab-btn ${activeTab === 'scanning' ? 'active' : ''}`} onClick={() => setActiveTab('scanning')}>Scanning</button>
        </div>
        <div className="modal-body">
          {error && <div className="alert alert-danger mb-4">{error}</div>}

          <form id="settings-form" onSubmit={handleSave} className="settings-form-body">
            
            {activeTab === 'global' && (
              <>
                {/* Global Settings */}
                <div className="settings-section">
                  <h3><span className="icon">📁</span> Global Settings</h3>
                  
                  <div className="form-group">
                    <label>Server Port</label>
                    <input type="number" name="PORT" className="input" value={settings.PORT || 5000} onChange={handleChange} min="1024" max="65535" />
                    <small>Port number the web server runs on (requires restart)</small>
                  </div>
                  
                  <div className="form-group">
                    <label>Image Folder Path</label>
                    <input type="text" name="IMAGE_FOLDER" className="input" value={settings.IMAGE_FOLDER || ''} onChange={handleChange} />
                    <small>Path to the main image folder to monitor</small>
                  </div>

                  <div className="form-group">
                    <label>Console Logging Level</label>
                    <select name="LOGGING_LEVEL" className="input" value={settings.LOGGING_LEVEL || 'basic'} onChange={handleChange}>
                      <option value="basic">Basic (Errors only)</option>
                      <option value="detailed">Detailed</option>
                      <option value="debug">Debug</option>
                    </select>
                    <small>Controls the amount of background information printed</small>
                  </div>
                  <label className="toggle-switch form-group-inline" style={{ marginBottom: '10px', marginTop: '1rem' }}>
                    <input type="checkbox" name="METADATA_EXTRACTION" checked={!!settings.METADATA_EXTRACTION} onChange={handleChange} />
                    <span className="toggle-track"></span>
                    <div className="toggle-label-content">
                      <strong>Metadata Extraction</strong>
                      <small>Load advanced metadata (requires restart to apply fully)</small>
                    </div>
                  </label>

                  <label className="toggle-switch form-group-inline">
                    <input type="checkbox" name="HIDE_ARCHIVE" checked={!!settings.HIDE_ARCHIVE} onChange={handleChange} />
                    <span className="toggle-track"></span>
                    <div className="toggle-label-content">
                      <strong>Hide Archive</strong>
                      <small>Hide archived content globally</small>
                    </div>
                  </label>
                </div>

                {/* Startup Defaults */}
                <div className="settings-section">
                  <h3><span className="icon">⚡</span> Startup Defaults</h3>
                  
                  <label className="toggle-switch form-group-inline">
                    <input type="checkbox" name="SAFE_MODE_DEFAULT" checked={!!settings.SAFE_MODE_DEFAULT} onChange={handleChange} />
                    <span className="toggle-track"></span>
                    <div className="toggle-label-content">
                      <strong>Safe Mode</strong>
                      <small>Hide flagged/NSFW files</small>
                    </div>
                  </label>

                  <label className="toggle-switch form-group-inline">
                    <input type="checkbox" name="CONTENT_SCAN_DEFAULT" checked={!!settings.CONTENT_SCAN_DEFAULT} onChange={handleChange} />
                    <span className="toggle-track"></span>
                    <div className="toggle-label-content">
                      <strong>Content Scan</strong>
                      <small>Auto-detect & flag new files</small>
                    </div>
                  </label>

                  <label className="toggle-switch form-group-inline">
                    <input type="checkbox" name="CONTENT_LOCK_DEFAULT" checked={!!settings.CONTENT_LOCK_DEFAULT} onChange={handleChange} />
                    <span className="toggle-track"></span>
                    <div className="toggle-label-content">
                      <strong>Content Lock</strong>
                      <small>Hide specific folders</small>
                    </div>
                  </label>
                </div>
              </>
            )}

            {activeTab === 'view' && (
              <>
                <div className="settings-section">
                  <h3><span className="icon">🖼️</span> Grid Settings</h3>
                  
                  <div className="form-group">
                    <label>Thumbnail Aspect Ratio</label>
                    <select name="THUMBNAIL_ASPECT_RATIO" className="input" value={settings.THUMBNAIL_ASPECT_RATIO || 'square'} onChange={handleChange}>
                      <option value="square">Square (1:1 Crop)</option>
                      <option value="original">Original Aspect Ratio</option>
                    </select>
                    <small>How thumbnails should be cropped in grid views</small>
                  </div>
                  
                  <div className="form-group">
                    <label>Home Default Columns</label>
                    <input type="number" name="HOME_THUMBNAIL_COLUMNS_DEFAULT" className="input" value={settings.HOME_THUMBNAIL_COLUMNS_DEFAULT || 3} onChange={handleChange} min="1" max="4" />
                    <small>Default number of columns on the home page (1-4)</small>
                  </div>

                  <div className="form-group">
                    <label>Gallery Thumbnail Size</label>
                    <input type="range" name="GALLERY_THUMBNAIL_SIZE_DEFAULT" className="input" value={settings.GALLERY_THUMBNAIL_SIZE_DEFAULT || 3} onChange={handleChange} min="1" max="5" style={{width: '100%'}} />
                    <small>Default thumbnail size on the gallery page (1=Smallest, 5=Largest)</small>
                  </div>
                  
                  <div className="form-group">
                    <label>Max Initial Load</label>
                    <input type="number" name="MAX_INITIAL_LOAD" className="input" value={settings.MAX_INITIAL_LOAD || 100} onChange={handleChange} />
                    <small>Maximum images to load initially on the grid</small>
                  </div>
                </div>
              </>
            )}

            {activeTab === 'security' && (
              <>
                {/* Permissions / Locking */}
                <div className="settings-section">
                  <h3><span className="icon">🛡️</span> Feature Locking</h3>
                  <small className="section-desc mb-3 block">Set a passphrase to lock a feature. Leave blank to leave it unlocked.</small>
                  
                  {[
                    { label: 'Settings Menu', key: 'SETTINGS' },
                    { label: 'Delete Files', key: 'DELETE' },
                    { label: 'Flag/Unflag Files', key: 'FLAG' },
                    { label: 'Archive Files', key: 'ARCHIVE' },
                    { label: 'Content Scan Toggle', key: 'TOGGLE_CONTENT_SCAN' },
                    { label: 'Content Lock Toggle', key: 'TOGGLE_CONTENT_LOCK' },
                    { label: 'Safe Mode Toggle', key: 'TOGGLE_SAFEMODE' }
                  ].map(perm => (
                    <div className="permission-row" key={perm.key} style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem', gap: '1rem' }}>
                      <div className="perm-label" style={{ width: '200px' }}>{perm.label}</div>
                      <div className="perm-pass" style={{ flex: 1 }}>
                        <input type="password" name={`${perm.key}_PASSPHRASE`} className="input" placeholder="Passphrase to lock..." value={settings[`${perm.key}_PASSPHRASE`] || ''} onChange={handleChange} />
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {activeTab === 'scanning' && (
              <>
                {/* Safe Mode Settings */}
                <div className="settings-section">
                  <h3 className="section-title-blue"><span className="icon">🛡️</span> Safe Mode Settings</h3>
                  <div className="info-box info-box-blue mb-4">
                    <strong>Safe Mode</strong> uses NSFW Keywords to identify what to hide.
                  </div>
                  <div className="form-group">
                    <label className="section-subtitle">NSFW Keywords</label>
                    <textarea name="NSFW_KEYWORDS" className="input textarea mt-2" rows="3" value={settings.NSFW_KEYWORDS || ''} onChange={handleChange} placeholder="adult, bikini, nude..."></textarea>
                    <small>Comma-separated keywords checked in image metadata</small>
                  </div>
                </div>

                {/* Content Scan Settings */}
                <div className="settings-section">
                  <h3 className="section-title-blue"><span className="icon">👁️</span> Content Scan Settings</h3>
                  
                  <div className="info-box info-box-yellow mb-4">
                    <strong>Content Scan</strong> automatically detects and flags new files. It uses an AI-based NudeNet to scan incoming images. Flagged files are moved to NSFW folders.
                  </div>
                  
                  <div className="form-group">
                    <label className="section-subtitle">NSFW Folders</label>
                    <input type="text" name="NSFW_FOLDERS" className="input mt-2" value={settings.NSFW_FOLDERS || ''} onChange={handleChange} />
                    <small>Comma-separated folder names where flagged content is moved - In addition to NSFW. Hidden by content lock.</small>
                  </div>

                  <div className="form-group mt-3">
                    <label className="section-subtitle">Safe Folders</label>
                    <input type="text" name="SAFE_FOLDERS" className="input mt-2" value={settings.SAFE_FOLDERS || ''} onChange={handleChange} />
                    <small>Comma-separated folder names that skip further content scanning - In addition to SAFE</small>
                  </div>

                  <div className="form-row mt-4 align-items-end">
                    <div className="form-group half mb-0">
                      <label className="section-subtitle">Scan Offset</label>
                      <input type="number" name="CONTENT_SCAN_OFFSET" className="input mt-2" value={settings.CONTENT_SCAN_OFFSET || 0} onChange={handleChange} />
                      <small>Skip N newest images before scanning</small>
                    </div>
                    <div className="form-group half mb-0">
                      <label className="section-subtitle">Nudity Threshold</label>
                      <input type="range" name="NUDITY_THRESHOLD" className="mt-2 w-100 slider-blue" min="0" max="1" step="0.05" value={settings.NUDITY_THRESHOLD || 0.5} onChange={handleChange} />
                      <small>Lower = more sensitive ({settings.NUDITY_THRESHOLD || 0.5})</small>
                    </div>
                  </div>

                  <div className="form-group mt-4">
                    <label className="section-subtitle">NSFW Labels (NudeNet)</label>
                    <small className="mb-2 block">AI-detected body parts that trigger NSFW flagging</small>
                    
                    <div className="nudenet-grid-container mt-3">
                      <div className="nudenet-panel nudenet-exposed">
                        <h4 className="panel-title text-warning">Exposed (High Priority)</h4>
                        <div className="panel-content">
                          {[
                            { id: 'FEMALE_BREAST_EXPOSED', label: 'Female Breast' },
                            { id: 'FEMALE_GENITALIA_EXPOSED', label: 'Female Genitalia' },
                            { id: 'MALE_GENITALIA_EXPOSED', label: 'Male Genitalia' },
                            { id: 'BUTTOCKS_EXPOSED', label: 'Buttocks' },
                            { id: 'ANUS_EXPOSED', label: 'Anus' },
                            { id: 'BELLY_EXPOSED', label: 'Belly' }
                          ].map(lbl => (
                            <label key={lbl.id} className="checkbox-label mb-2">
                              <input type="checkbox" checked={nsfwLabelsSelected.includes(lbl.id)} onChange={(e) => handleCheckboxListChange('NSFW_LABELS', lbl.id, e.target.checked)} />
                              <span>{lbl.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                      
                      <div className="nudenet-panel nudenet-covered">
                        <h4 className="panel-title text-info">Covered (Lower Priority)</h4>
                        <div className="panel-content">
                          {[
                            { id: 'FEMALE_BREAST_COVERED', label: 'Female Breast' },
                            { id: 'FEMALE_GENITALIA_COVERED', label: 'Female Genitalia' },
                            { id: 'MALE_GENITALIA_COVERED', label: 'Male Genitalia' },
                            { id: 'BUTTOCKS_COVERED', label: 'Buttocks' },
                            { id: 'ANUS_COVERED', label: 'Anus' },
                            { id: 'BELLY_COVERED', label: 'Belly' }
                          ].map(lbl => (
                            <label key={lbl.id} className="checkbox-label mb-2">
                              <input type="checkbox" checked={nsfwLabelsSelected.includes(lbl.id)} onChange={(e) => handleCheckboxListChange('NSFW_LABELS', lbl.id, e.target.checked)} />
                              <span>{lbl.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      <div className="nudenet-panel nudenet-others full-width">
                        <h4 className="panel-title text-muted">Other Labels</h4>
                        <div className="panel-content grid-4-cols">
                          {[
                            { id: 'FEET_EXPOSED', label: 'Feet Exposed' },
                            { id: 'FEET_COVERED', label: 'Feet Covered' },
                            { id: 'ARMPITS_EXPOSED', label: 'Armpits Exposed' },
                            { id: 'ARMPITS_COVERED', label: 'Armpits Covered' },
                            { id: 'FACE_FEMALE', label: 'Face Female' },
                            { id: 'FACE_MALE', label: 'Face Male' }
                          ].map(lbl => (
                            <label key={lbl.id} className="checkbox-label mb-2">
                              <input type="checkbox" checked={nsfwLabelsSelected.includes(lbl.id)} onChange={(e) => handleCheckboxListChange('NSFW_LABELS', lbl.id, e.target.checked)} />
                              <span>{lbl.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

          </form>
        </div>
        <div className="modal-footer glass">
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={saving}>Cancel</button>
          <button type="submit" form="settings-form" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
