/**
 * API client for Photo Frame 6 backend.
 * Centralizes all API calls with consistent error handling.
 */

const API_BASE = '/api';
const WS_BASE = `ws://${window.location.host}/ws`;

async function request(path, options = {}) {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(error.detail || error.error || `HTTP ${res.status}`);
  }

  return res.json();
}

// ============================================
// Media API
// ============================================

export function fetchMedia(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '') {
      query.set(key, String(value));
    }
  });
  return request(`/media?${query.toString()}`);
}

export function fetchLatest(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined) {
      query.set(key, String(value));
    }
  });
  return request(`/media/latest?${query.toString()}`);
}

export function fetchMetadata(mediaId) {
  return request(`/media/${mediaId}/metadata`);
}

export function getMediaFileUrl(mediaId) {
  return `${API_BASE}/media/${mediaId}/file`;
}

export function getThumbUrl(mediaId, width = 300, height = 300) {
  return `${API_BASE}/media/${mediaId}/thumb?width=${width}&height=${height}`;
}

// ============================================
// Folder API
// ============================================

export function fetchFolders(parent = '') {
  const query = parent ? `?parent=${encodeURIComponent(parent)}` : '';
  return request(`/folders${query}`);
}

export function fetchSiblingFolders(subfolder) {
  return request(`/folders/siblings?subfolder=${encodeURIComponent(subfolder)}`);
}

export function fetchChildFolders(subfolder) {
  return request(`/folders/children?subfolder=${encodeURIComponent(subfolder)}`);
}

// ============================================
// Auth API
// ============================================

export function fetchAuthStatus() {
  return request('/auth/status');
}

export function unlockAction(action, passphrase) {
  return request(`/auth/unlock/${action}`, {
    method: 'POST',
    body: JSON.stringify({ passphrase }),
  });
}

// ============================================
// Action API
// ============================================

export function deleteMedia(mediaId) {
  return request(`/actions/delete/${mediaId}`, { method: 'DELETE' });
}

export function flagMedia(mediaId) {
  return request(`/actions/flag/${mediaId}`, { method: 'POST' });
}

export function unflagMedia(mediaId) {
  return request(`/actions/unflag/${mediaId}`, { method: 'POST' });
}

export function markSafe(mediaId) {
  return request(`/actions/mark-safe/${mediaId}`, { method: 'POST' });
}

export function unmarkSafe(mediaId) {
  return request(`/actions/unmark-safe/${mediaId}`, { method: 'POST' });
}

export function saveFrame(mediaId, imageData) {
  return request('/actions/save-frame', {
    method: 'POST',
    body: JSON.stringify({ media_id: mediaId, image_data: imageData }),
  });
}

export function archiveMedia() {
  return request('/actions/archive', { method: 'POST' });
}

export function scanFolder(subfolder = '') {
  return request('/actions/scan-folder', {
    method: 'POST',
    body: JSON.stringify({ subfolder }),
  });
}

// ============================================
// Settings API
// ============================================

export function fetchSettings() {
  return request('/settings');
}

export function saveSettings(settingsObj) {
  return request('/settings', {
    method: 'POST',
    body: JSON.stringify({ settings: settingsObj }),
  });
}

export function toggleContentScan(enabled) {
  return request('/toggle/content-scan', {
    method: 'POST',
    body: JSON.stringify({ enabled }),
  });
}

export function toggleMetadataExtraction(enabled) {
  return request('/toggle/metadata-extraction', {
    method: 'POST',
    body: JSON.stringify({ enabled }),
  });
}

export function fetchToggleStatus() {
  return request('/toggle/status');
}

// ============================================
// WebSocket URL
// ============================================

export { WS_BASE };
