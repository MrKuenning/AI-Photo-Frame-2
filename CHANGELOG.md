# Changelog

All notable changes to the AI Photo Frame application will be documented in this file.

## [2.0.24] - 2026-08-14
### Added
- **Archive Current Folder & Archive All Actions**<br>
  Added dedicated "Archive Current Folder" and "Archive All" action buttons to the Gallery toolbar. "Archive Current Folder" moves and merges the active folder into `Archive/<currentFolder>`, preserving its full relative folder hierarchy while keeping other parent files intact. "Archive All" moves all root-adjacent folders and files into the `Archive/` directory.
- **Enable Archive Function Setting**<br>
  Added a new setting (`ENABLE_ARCHIVE_OPTION`) under the Settings Archive tab to toggle the visibility of the Archive buttons on the Gallery toolbar.
- **Gallery Folder Recursive Toggle**<br>
  Added a quick toggle button (`🌲 Recursive: ON` / `📁 Recursive: OFF`) directly in the folder browser row to seamlessly switch between viewing media recursively across all subfolders or only displaying immediate folder contents.
- **Right-Aligned Gallery Action Buttons**<br>
  Aligned the Content Scan, Archive, and progress action buttons cleanly to the far right side of the Gallery toolbar.

### Changed
- **Folder List Filtering for Hidden Archive**<br>
  When "Hide Archive" is toggled on in settings, the `Archive` folder is now hidden from the folder list across the backend API and frontend UI.

### Fixed
- **Real-Time Safe Only Filter Bypass**<br>
  Fixed an issue where newly generated media arriving over WebSocket was displayed in the Home and Gallery views even when the "Safe Only" toggle was enabled. Incoming real-time media now strictly adheres to active Safe Only and keyword filters.

---

## [2.0.23] - 2026-08-13
### Added
- **Header Toggle Enable/Disable Customization**<br>
  Added backend configuration options (`ENABLE_SAFE_ONLY_OPTION`, `ENABLE_KEYWORD_FILTER_OPTION`, `ENABLE_CONTENT_LOCK_OPTION`, `ENABLE_CONTENT_SCAN_OPTION`) allowing administrators to enable or disable individual header toggle buttons. Disabled buttons are completely hidden from the header interface.

### Changed
- **Gallery Toolbar Scan Button Relocation**<br>
  Moved the "Content Scan Current Folder" button out of the global top navigation header menu and placed it directly on the Gallery page toolbar, located to the far right of the search box.

### Documentation
- **Updated README & Release Documentation**<br>
  Updated `README.md` and `CHANGELOG.md` with complete documentation for Safe Only Mode, Keyword Filter renames, header toggle button customization options, and Gallery toolbar button layout updates.

---

## [2.0.22] - 2026-08-12
### Added
- **Safe Only Mode**<br>
  Added a new filtering mode that, when enabled, explicitly hides all media unless it has been marked as safe and moved to a SAFE folder.

### Changed
- **Keyword Filter Rename**<br>
  Renamed the original "Safe Mode" feature to "Keyword Filter" to more accurately reflect its function (filtering by NSFW keywords) and to differentiate it from the new Safe Only mode.
- **Settings UI Optimization**<br>
  Split the Settings modal into separate "Filtering" and "Scanning" tabs for better organization, and improved the layout and readability of the Filtering explanation box.
- **Header Toggles Layout**<br>
  Redesigned the All/Photos/Videos gallery header filters to use a unified pill-segmented control matching the rest of the interface. Centered the filter toggle for a more balanced layout.
- **Config Reorganization**<br>
  Grouped all settings in `config.ini` and `config-example.ini` into logical categories for improved readability.

### Fixed
- **Premature Video Playback Bug**<br>
  Fixed an issue where the Gallery would instantly attempt to load and play newly generated videos the exact moment the file was created. Since the AI tool was still actively writing the video stream, the browser would fail to read the incomplete file, resulting in an empty, broken media player. The server now patiently waits for the file lock to be released before notifying the frontend that a new file is available.
- **Hidden Passphrase Toggles Bug**<br>
  Fixed an issue where the Safe Only and Keyword Filter header toggles were incorrectly hidden if they required a passphrase. They now properly render and prompt for a passphrase on click, matching the behavior of other secure toggles.
- **Startup Defaults Override Bug**<br>
  Fixed an issue where "Enabled on startup" toggles incorrectly loaded state from local storage instead of honoring the backend configuration defaults upon starting a new session.

---

## [2.0.21] - 2026-08-10
### Added
- **Persisted Video Mute State**<br>
  Video playback logic has been modified to persist the mute state across different video clips. If a user mutes the current video, subsequent videos remain muted by default.

---

## [2.0.20] - 2026-08-10
### Added
- **Scan Video Files Setting**<br>
  Added a new setting to toggle scanning of video files. If disabled, video files are completely ignored by the content scanner to avoid locking them while external tools are writing to them.

### Fixed
- **Temporary File & File Locking Issues**<br>
  Fixed an issue where temporarily written files (e.g., `_tmp` or `_temp`) were being mistakenly scanned and locked. Improved file lock checking to patiently wait until tools finish writing the file before `ffprobe` attempts to extract metadata.
- **Duplicate Records Bug**<br>
  Ensured newly written or moved files correctly trigger a new image event, preventing duplicate references in the database.

---

## [2.0.19] - 2026-08-06
### Fixed
- **Mobile Video Player Layout**<br>
  Fixed the video progress bar appearing squished on mobile devices by adjusting the CSS flex layout to force the progress bar to its own full-width line above the controls.
- **Android Frame Stepping**<br>
  Fixed an issue on Android devices where the frame forward/backward buttons did not work. Increased the frame step delta from 33ms (1/30s) to 100ms (1/10s) to ensure Android's video decoder accurately registers the seek and repaints the frame, avoiding its keyframe-snapping optimization.
- **File Locking Race Condition (Windows)**<br>
  Fixed a severe issue where newly generated videos would disappear and be left stranded in the AI tool's (e.g. ComfyUI) temporary folder. The UI server's background scanning (`ffprobe`/`ffmpeg`) was eagerly locking newly created files on Windows, causing AI tools to crash with `PermissionError` when trying to write/move video data. Added a robust lock-checking loop (`os.rename`) to ensure the server patiently waits for the AI tool to finish writing before scanning.
- **Video Caching Bug**<br>
  Fixed a bug where overwritten video files required a manual browser refresh to display. Appended a dynamic cache-busting parameter (`?v=[mod_time]`) to thumbnail and hero video URLs.

---

## [2.0.18] - 2026-07-23
### Added
- **Custom Application Favicon**<br>
  Added `favicon.ico` to `frontend/public/` and updated `index.html` link tag to reference the custom favicon asset.

---

## [2.0.17] - 2026-07-23
### Added
- **Configurable Dev Server Port**<br>
  Updated `vite.config.js` to set the default frontend dev server port to `5001` (avoiding default 5173/5174 port switching).
- **Automatic Database Cleanup & Rescan**<br>
  - Integrated `/api/actions/rescan-media` into the **Refresh Media** button to automatically purge database records for files deleted or moved on disk outside the application.
  - Added automatic database purging on 404 file and thumbnail requests so missing media items are immediately cleaned up.
  - Added automatic database audit on server startup to remove stale records for deleted files.
  - Added automatic silent error handling in the frontend to remove broken image cards when a thumbnail fails to render.

### Fixed
- **Home Page Thumbnail Grid Cross-Browser Sizing**<br>
  Resolved a CSS Grid auto-track height collapse issue in Chrome and Safari by wrapping `.thumbnail-container` inside a `.thumbnail-wrapper` element. Grid items now maintain proper square aspect ratios on both Desktop PC (Chrome/Edge/Firefox) and iPad (Safari).

---

## [2.0.10] - 2026-07-23
### Fixed
- **Chrome Cyclic Height Percentage Resolution Fix**<br>
  Fixed an issue in Chrome Desktop where in-flow `<img>` elements with `height: 100%` inside an `aspect-ratio: 1 / 1` grid container resolved height against intrinsic image line-height (~25px), causing grid rows to collapse to 25px tall sliced cards. Restored `position: absolute; top: 0; left: 0; width: 100%; height: 100%` on thumbnails without `::before` pseudo-element conflicts, guaranteeing perfect square grid cards across Chrome, Safari, and Firefox.

---

## [2.0.9] - 2026-07-23
### Fixed
- **Cross-Browser & iPad Thumbnail Overlap**<br>
  Fixed an issue where thumbnails overlapped on iPad (Safari) and Desktop PC (Chrome). Implemented an in-flow `::before` pseudo-element with `aspect-ratio: 1 / 1` and `padding-bottom: 100%` on thumbnail containers to guarantee non-zero grid row track sizing across all browser layout engines.
- **iPad & Tablet Responsive Layout**<br>
  Improved header, sidebar, hero controls, and touch interface controls for iPad/tablet viewports (up to 1024px) and touch devices.

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


