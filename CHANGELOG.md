# Changelog

All notable changes to the AI Photo Frame application will be documented in this file.

---

## [2.0.8] - 2026-07-20
### Fixed
- **Database Path Mismatches on Windows**<br>
  Fixed a major bug where Windows file path casing differences caused the SQLite database to lose track of files when they were moved (e.g. by the content scanner), resulting in duplicate "ghost" records and preventing the UI from hiding the moved images. Added `COLLATE NOCASE` to ensure paths match seamlessly.
- **Websocket Message Dropping**<br>
  Fixed a React batching issue where back-to-back websocket messages (e.g., deleting an old image then adding a new one) caused the frontend to drop the first instruction.
- **Auto-Jump to New Media**<br>
  Restored the frontend logic that automatically jumps your view to the newest image whenever a brand new file is generated and successfully passes your filters.
- **Content Scanner Metadata Crashes**<br>
  Added safety checks to the background content scanner so it no longer crashes with a `NoneType` error when trying to extract prompt keywords from an image that lacks metadata.



## [2.0.7] - 2026-07-20
### Fixed
- **Bouncing Images Bug**<br>
  Fixed an issue where the background content scanner would cause older images to jump to the top of the home page grid when moved. Moved files now maintain their original ID and chronological order, and the UI inserts newly discovered items properly by date rather than always prepending them.
- **Missing Database Columns**<br>
  Added an automatic database schema migration script. The server will now automatically append newly tracked fields (like `is_archived` and `top_folder`) to older local databases on startup, preventing "Internal Server Error" crashes when interacting with files.

### Changed
- **Security Passphrase Requirements**<br>
  Adjusted the security logic so that users only need a passphrase when making the system *less* secure. For instance, flagging an image as adult content or turning on Safe Mode no longer requires a passphrase, but revealing adult content or turning Safe Mode off still does.



## [2.0.6] - 2026-07-16
### Changed
- **View Settings Redesign**<br>
  Cleaned up the View Settings tab for better visual consistency. Renamed settings for clarity and updated both column and size controls to utilize uniform slider interfaces.

### Fixed
- **Action Passphrase UI**<br>
  Fixed an issue where media actions (Delete, Flag, Mark Safe) would fail with a generic "Permission Denied" error if a passphrase was required. Lifted the Passphrase Modal into the global Auth Context so any component can seamlessly trigger a PIN prompt and resume its action upon success.
- **Settings Sync Fix**<br>
  Fixed a bug where "View Settings" (Grid Layout preferences) were not correctly fetching their defaults from the configuration file on load, causing the modal to fall back to hardcoded defaults.

## [2.0.5] - 2026-07-15
### Changed
- **Mobile Gallery Redesign**<br>
  Fully optimized the Gallery toolbar for mobile devices. Reduced the height of the home page thumbnail area to prioritize the Hero viewer. Converted the thumbnail size slider into a native `<select>` dropdown for smoother touch interactions. Condensed the Action Bar icons on mobile to fit perfectly without wrapping. Made the child folder buttons a horizontal, swipeable list rather than wrapping onto multiple lines. Regrouped the breadcrumbs, size selector, and search bar so they flow sequentially next to each other. Increased the maximum thumbnail size setting to 8.
- **Header Hamburger Menu**<br>
  Moved the "Scan Folder" action out of the gallery toolbar and into the global Hamburger menu (only visible when on the Gallery page) to reduce clutter.
- **Icon Overhaul**<br>
  Replaced default system emojis throughout the header and gallery folder browser with clean, monotone SVG icons for a sleek and modern UI.
- **Frame View Controls**<br>
  Revamped the Frame page overlay. Removed bottom action buttons and moved controls to a top-right overlay, adding a Home navigation button and a native Full Screen toggle.

## [2.0.4] - 2026-07-15
### Added
- **Advanced Video Player**<br>
  Complete custom UI for video playback featuring: Frame-by-frame navigation (First, Previous, Next, Last), Realtime scrubbing across the progress bar, Frame Capture (📸) that exports the exact frame as a JPG via backend API, and Fullscreen and responsive `object-fit: contain` scaling.

### Changed
- **Global App Status**<br>
  Moved the WebSocket "Live" connection status and build number version to the main Header underneath the logo for global visibility.
- **Same-Origin Proxy**<br>
  React development server now cleanly proxies backend API and WebSocket connections, solving cross-origin canvas tainting issues when capturing video frames.

### Fixed
- **Gallery Deletion Flow**<br>
  When deleting an image while the Hero Viewer is open, the viewer no longer abruptly closes. It now seamlessly auto-loads the next image in the sequence.
- **Metadata Overlay Flicker**<br>
  Fixed visual flickering and stale data when rapidly navigating between media items; metadata now resets synchronously on image change.
- **WebSocket New Image Bug**<br>
  Fixed a bug where newly generated images were failing to populate on the Home page because they lacked real database IDs; the backend now broadcasts full objects to the frontend.

## [2.0.2] - 2026-07-15
### Added
- **Content Scanner Offset**<br>
  Configurable offset allows scanning to delay until `n` newer images exist, preventing read errors on partially written files by external generators.
- **Manual Scan with Progress UI**<br>
  Gallery page now includes a "Scan Folder" button with a real-time progress bar powered by WebSocket events.
- **Dynamic App Versioning**<br>
  The sidebar now automatically reflects the active app version directly from `package.json`.

### Changed
- **In-Place UI State**<br>
  Improved the media grid handling so that flagging, unflagging, marking safe, or deleting images performs in-place state updates. The page no longer loses scroll position or executes full list reloads.
- **Console Log Aesthetics**<br>
  Completely revamped backend terminal output for Content Scanning with distinct ANSI colors, line breaks, and clear emojis for easy reading of FLAG/UNFLAG actions.
- **App Name**<br>
  Renamed the UI title to "Photo Frame 2".

### Fixed
- **WebSocket Render Loops**<br>
  Fixed an issue where background background jobs like `media_deleted` and `new_image` caused the frontend list to jump to the top and reset.

## [2.0.1] - 2026-07-14
### Added
- **Modern Web Framework Transition**<br>
  Completely migrated the application from the legacy architecture to a modern stack utilizing a Vite + React frontend and a FastAPI backend. This provides vastly improved performance, a modular component architecture, and rapid hot-module reloading during development.
- **Permanent Metadata Viewer**<br>
  Added a new bottom pane for metadata viewing that can remain permanently open while browsing.
- **Quick Metadata Viewer**<br>
  Retained the floating top-right metadata button, ensuring it is always available for quick peeks.
- **Clipboard Support**<br>
  Both metadata views now include a convenient "copy to clipboard" button for the prompt.
- **View Settings Tab**<br>
  Created a dedicated tab in the Settings Modal for customizing layout and UI preferences.
- **Thumbnail Aspect Ratio Setting**<br>
  Added the ability to choose between `Square (1:1 Crop)` or `Original Aspect Ratio` for thumbnail displays globally.
- **Dynamic Gallery Grid**<br>
  The gallery now calculates how many thumbnails fit into the view based on the window width and requested size setting. Thumbnails will stay exactly the same size when the hero viewer slides open/closed!
- **Mobile Responsive Header**<br>
  Implemented a hamburger menu and converted the logo to a compact icon for mobile views.
- **Pill-Style Toggles**<br>
  Redesigned the Safe Mode, Folder Lock, and Content Scan switches into illuminated pill buttons that clearly indicate their active state.
- **Manual Safe Mode Exclusions**<br>
  Added a "Mark Safe" (Shield Check) button in the Hero Viewer. This physically moves files into a `/SAFE` directory, guaranteeing they are excluded from future NudeNet content scans.
- **Dynamic Content Badges**<br>
  Introduced a unified stacking badge system on thumbnails:
  - **NSFW (Red)**: Indicates the file is actively residing in an NSFW folder.
  - **Safe Mode (Yellow)**: Indicates the image would be filtered by AI/keyword settings.
  - **SAFE (Green)**: Indicates the image has been manually whitelisted in a SAFE folder.

### Changed
- **Home Grid Layout**<br>
  Constrained the max slider limit for the Home page to 4 columns to prevent overcrowding, while allowing vertical heights to flex cleanly.
- **Gallery Grid Settings**<br>
  Replaced `Gallery Default Columns` with a fluid `Gallery Thumbnail Size` scale (1-5), allowing the grid to auto-reflow rather than forcing a specific number of columns.
- **Max Initial Load**<br>
  Moved the "Max Initial Load" configuration field from the Global settings tab to the View settings tab.
- **Image Grid Styles**<br>
  Modified the `.aspect-original` CSS classes on both the Home and Gallery pages to perfectly center uncropped images within a unified square padding box without distortion.
- **Settings State Synchronization**<br>
  Linked settings save actions to directly trigger immediate UI updates via `useToggles` hooks without requiring a page refresh.
- **Settings Modal Consolidation**<br>
  Relocated `Metadata Extraction` and `Hide Archive` to the new View tab. Standardized modal heights to eliminate vertical layout jumps when switching tabs.
- **Hero Viewer Navigation**<br>
  Swapped, widened, and standardized the Next/Previous buttons across Home and Gallery views. The left button ("⬅ Next") now consistently navigates to newer files, while the right button ("Previous ➡") navigates to older files.
- **Flag Button Behavior**<br>
  Wired the NSFW Flag button to explicitly check and toggle physical file paths, ensuring flagged images are cleanly moved in and out of the designated `/NSFW` directory.

### Fixed
- **JSX Errors**<br>
  Fixed UI breaking syntax errors in `SettingsModal.jsx`.
- **Thumbnail Heights**<br>
  Standardized thumbnail container sizing so rows line up cleanly.

### Removed
- **Unused Configurations**<br>
  Purged legacy unused configurations from `config.py` and backend logic, including `HOME_THUMBNAIL_SIZE`, `GALLERY_THUMBNAIL_SIZE`, `GALLERY_PREVIEW_SIZE`, and `PER_PAGE` (replaced entirely by `MAX_INITIAL_LOAD`).


