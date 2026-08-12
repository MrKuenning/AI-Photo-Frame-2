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
          <button className={`tab-btn ${activeTab === 'filtering' ? 'active' : ''}`} onClick={() => setActiveTab('filtering')}>Filtering</button>
          <button className={`tab-btn ${activeTab === 'scanning' ? 'active' : ''}`} onClick={() => setActiveTab('scanning')}>Scanning</button>
          <button className={`tab-btn ${activeTab === 'archive' ? 'active' : ''}`} onClick={() => setActiveTab('archive')}>Archive</button>
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
                    <label>Default Thumbnail Columns - Home</label>
                    <input type="range" name="HOME_THUMBNAIL_COLUMNS_DEFAULT" className="input" value={settings.HOME_THUMBNAIL_COLUMNS_DEFAULT || 3} onChange={handleChange} min="1" max="4" style={{ width: '100%' }} />
                    <small>Default number of columns on the home page (1=Fewest, 4=Most)</small>
                  </div>

                  <div className="form-group">
                    <label>Default Thumbnail Size - Gallery</label>
                    <input type="range" name="GALLERY_THUMBNAIL_SIZE_DEFAULT" className="input" value={settings.GALLERY_THUMBNAIL_SIZE_DEFAULT || 3} onChange={handleChange} min="1" max="5" style={{ width: '100%' }} />
                    <small>Default thumbnail size on the gallery page (1=Smallest, 5=Largest)</small>
                  </div>

                  <div className="form-group">
                    <label>Initial Thumbnail Load</label>
                    <input type="number" name="MAX_INITIAL_LOAD" className="input" value={settings.MAX_INITIAL_LOAD || 100} onChange={handleChange} />
                    <small>Thumbnail images to load at a time</small>
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
                    { label: 'Unflag Files', key: 'FLAG' },
                    { label: 'Archive Files', key: 'ARCHIVE' },
                    { label: 'Content Scan Toggle', key: 'TOGGLE_CONTENT_SCAN' },
                    { label: 'Keyword Filter Toggle', key: 'TOGGLE_KEYWORD_FILTER' },
                    { label: 'Safe Only Toggle', key: 'TOGGLE_SAFE_ONLY' },
                    { label: 'Folder Lock Toggle', key: 'TOGGLE_CONTENT_LOCK' }
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

            {activeTab === 'filtering' && (
              <>
                <div className="settings-section">
                  <h3 className="section-title-blue"><span className="icon">📂</span> Media Filtering Overview</h3>

                  <div className="info-box info-box-blue mb-4">
                    <strong>Manual & Automatic Categorization</strong><br />
                    AI Photo Frame provides several ways to filter your media content. In the media viewer, you can use the action buttons to organize files:
                    <ul style={{ margin: '8px 0 0 20px', padding: 0 }}>
                      <li className="mb-1"><strong>Delete:</strong> Permanently removes the file.</li>
                      <li className="mb-1"><strong>Flag NSFW:</strong> Moves the media into a subfolder called <em>NSFW</em>.</li>
                      <li><strong>Mark Safe:</strong> Moves the media into a subfolder called <em>SAFE</em>.</li>
                    </ul>
                  </div>

                  <div className="mb-3">
                    <h4 className="section-subtitle" style={{ fontSize: '1.1em', marginBottom: '4px' }}>Custom Folder Definitions</h4>
                    <p className="text-muted" style={{ fontSize: '0.9em', margin: 0 }}>
                      You can define additional folder names for the Gallery to automatically treat as NSFW or SAFE.
                    </p>
                  </div>

                  <div className="form-group mb-4">
                    <label className="section-subtitle">NSFW Folders</label>
                    <input type="text" name="NSFW_FOLDERS" className="input mt-2" value={settings.NSFW_FOLDERS || ''} onChange={handleChange} />
                    <small>Comma-separated folder names where flagged content is moved - In addition to NSFW. Hidden by content lock.</small>
                  </div>

                  <div className="form-group mb-4">
                    <label className="section-subtitle">Safe Folders</label>
                    <input type="text" name="SAFE_FOLDERS" className="input mt-2" value={settings.SAFE_FOLDERS || ''} onChange={handleChange} />
                    <small>Comma-separated folder names that skip further content scanning - In addition to SAFE</small>
                  </div>
                </div>

                <div className="settings-section">
                  <h3 className="section-title-blue"><span className="icon">✅</span> Safe Only Toggle Settings</h3>
                  <div className="info-box info-box-blue mb-4">
                    Content Scan adds a toggle that when enabled will only displays content that has been marked as safe and moved to the SAFE folder.
                  </div>

                  <div className="form-row mb-4">
                    <div className="toggle-container half mb-0" style={{ flex: 1 }}>
                      <label className="toggle-switch form-group-inline mb-0">
                        <input type="checkbox" name="ENABLE_SAFE_ONLY_OPTION" checked={settings.ENABLE_SAFE_ONLY_OPTION ?? true} onChange={handleChange} />
                        <span className="toggle-track"></span>
                        <div className="toggle-label-content">
                          <strong>Show Safe Folder Toggle in Header</strong>
                          <small>Show the Safe Folder toggle in the header</small>
                        </div>
                      </label>
                    </div>

                    <div className="toggle-container half mb-0" style={{ flex: 1 }}>
                      <label className="toggle-switch form-group-inline mb-0">
                        <input type="checkbox" name="SAFE_ONLY_DEFAULT" checked={!!settings.SAFE_ONLY_DEFAULT} onChange={handleChange} />
                        <span className="toggle-track"></span>
                        <div className="toggle-label-content">
                          <strong>Safe Toggle Enabled on Startup</strong>
                          <small>Only show safe files by default</small>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="settings-section">
                  <h3 className="section-title-blue"><span className="icon">🔒</span> Folder Lock Toggle Settings</h3>
                  <div className="info-box info-box-blue mb-4">
                    Folder Lock is a toggle that when enabled will hide files in NSFW folders.
                  </div>

                  <div className="form-row mb-4">
                    <div className="toggle-container half mb-0" style={{ flex: 1 }}>
                      <label className="toggle-switch form-group-inline mb-0">
                        <input type="checkbox" name="ENABLE_CONTENT_LOCK_OPTION" checked={settings.ENABLE_CONTENT_LOCK_OPTION ?? true} onChange={handleChange} />
                        <span className="toggle-track"></span>
                        <div className="toggle-label-content">
                          <strong>Show Folder Lock Toggle in Header</strong>
                          <small>Show the Folder Lock toggle in the header</small>
                        </div>
                      </label>
                    </div>

                    <div className="toggle-container half mb-0" style={{ flex: 1 }}>
                      <label className="toggle-switch form-group-inline mb-0">
                        <input type="checkbox" name="CONTENT_LOCK_DEFAULT" checked={!!settings.CONTENT_LOCK_DEFAULT} onChange={handleChange} />
                        <span className="toggle-track"></span>
                        <div className="toggle-label-content">
                          <strong>Folder Toggle Enabled on Startup</strong>
                          <small>Hide specific folders by default</small>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="settings-section">
                  <h3 className="section-title-blue"><span className="icon">🛡️</span> Keyword Filter Toggle Settings</h3>
                  <div className="info-box info-box-blue mb-4">
                    (Adds a toggle to the header that when enabled will filter / hide media based on a user defined Keywords list.)
                  </div>

                  <div className="form-row mb-4">
                    <div className="toggle-container half mb-0" style={{ flex: 1 }}>
                      <label className="toggle-switch form-group-inline mb-0">
                        <input type="checkbox" name="ENABLE_KEYWORD_FILTER_OPTION" checked={settings.ENABLE_KEYWORD_FILTER_OPTION ?? true} onChange={handleChange} />
                        <span className="toggle-track"></span>
                        <div className="toggle-label-content">
                          <strong>Show Keyword Filter Toggle in Header</strong>
                          <small>Show the Keyword Filter toggle in the header</small>
                        </div>
                      </label>
                    </div>

                    <div className="toggle-container half mb-0" style={{ flex: 1 }}>
                      <label className="toggle-switch form-group-inline mb-0">
                        <input type="checkbox" name="KEYWORD_FILTER_DEFAULT" checked={!!settings.KEYWORD_FILTER_DEFAULT} onChange={handleChange} />
                        <span className="toggle-track"></span>
                        <div className="toggle-label-content">
                          <strong>Keyword Toggle enabled on Startup</strong>
                          <small>Hide flagged/NSFW files by default</small>
                        </div>
                      </label>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="section-subtitle">Keywords</label>
                    <textarea name="NSFW_KEYWORDS" className="input textarea mt-2" rows="3" value={settings.NSFW_KEYWORDS || ''} onChange={handleChange} placeholder="adult, bikini, nude..."></textarea>
                    <small>Comma-separated keywords checked in media metadata</small>
                  </div>
                </div>
              </>
            )}

            {activeTab === 'scanning' && (
              <>
                <div className="settings-section">
                  <h3 className="section-title-blue"><span className="icon">👁️</span> Content Scan Settings</h3>

                  <div className="info-box info-box-yellow mb-4">
                    Content Scan adds a toggle that when enabled automatically detects and flags new files. It uses an AI-based NudeNet to scan incoming media. Media can also be manually flagged as NSFW. Flagged files are moved to NSFW folders.
                  </div>

                  <div className="form-row mb-4">
                    <div className="toggle-container half mb-0" style={{ flex: 1 }}>
                      <label className="toggle-switch form-group-inline mb-0">
                        <input type="checkbox" name="ENABLE_CONTENT_SCAN_OPTION" checked={settings.ENABLE_CONTENT_SCAN_OPTION ?? true} onChange={handleChange} />
                        <span className="toggle-track"></span>
                        <div className="toggle-label-content">
                          <strong>Show Content Scan Toggle in Header</strong>
                          <small>Show the Content Scan toggle in the header</small>
                        </div>
                      </label>
                    </div>

                    <div className="toggle-container half mb-0" style={{ flex: 1 }}>
                      <label className="toggle-switch form-group-inline mb-0">
                        <input type="checkbox" name="CONTENT_SCAN_DEFAULT" checked={!!settings.CONTENT_SCAN_DEFAULT} onChange={handleChange} />
                        <span className="toggle-track"></span>
                        <div className="toggle-label-content">
                          <strong>Content Scan Toggle Enabled on Startup</strong>
                          <small>Auto-detect & flag new files by default</small>
                        </div>
                      </label>
                    </div>
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
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        name="SCAN_VIDEO_FILES"
                        checked={settings.SCAN_VIDEO_FILES ?? true}
                        onChange={handleChange}
                      />
                      <span>Scan Video Files</span>
                    </label>
                    <small className="d-block mt-1">If disabled, completely ignores content scanning for video files to avoid locking them.</small>
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

            {activeTab === 'archive' && (
              <>
                <div className="settings-section">
                  <h3><span className="icon">📦</span> Archive Settings</h3>

                  <label className="toggle-switch form-group-inline">
                    <input type="checkbox" name="HIDE_ARCHIVE" checked={!!settings.HIDE_ARCHIVE} onChange={handleChange} />
                    <span className="toggle-track"></span>
                    <div className="toggle-label-content">
                      <strong>Hide Archive</strong>
                      <small>Hide archived content globally</small>
                    </div>
                  </label>
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
