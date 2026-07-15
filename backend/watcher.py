"""
File system watcher for Photo Frame 6.
Uses watchdog to monitor the image folder for new/modified/moved files
and updates the SQLite database + pushes WebSocket events.
"""

import os
import time
import threading
from typing import Callable, Optional
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

from config import settings
import database as db
from metadata_extractor import extract_embedded_metadata

# Supported file extensions
IMAGE_EXTENSIONS = ('.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp')
VIDEO_EXTENSIONS = ('.mp4', '.webm', '.mov', '.avi', '.mkv', '.m4v')
MEDIA_EXTENSIONS = IMAGE_EXTENSIONS + VIDEO_EXTENSIONS

# Callback for pushing WebSocket events (set by main.py)
_ws_broadcast: Optional[Callable] = None

# Content scan callback (set by main.py)
_content_scan_callback: Optional[Callable] = None


def set_ws_broadcast(callback: Callable):
    """Set the WebSocket broadcast callback"""
    global _ws_broadcast
    _ws_broadcast = callback


def set_content_scan_callback(callback: Callable):
    """Set the content scan callback for new files"""
    global _content_scan_callback
    _content_scan_callback = callback


def _classify_file(file_path: str) -> dict:
    """
    Classify a file and extract basic info for DB insertion.
    Returns dict with filename, subfolder, top_folder, media_type, etc.
    """
    image_folder = settings.get('IMAGE_FOLDER')
    filename = os.path.basename(file_path)
    ext = os.path.splitext(filename)[1].lower()

    # Determine media type
    if ext in IMAGE_EXTENSIONS:
        media_type = 'image'
    elif ext in VIDEO_EXTENSIONS:
        media_type = 'video'
    else:
        return None

    # Get relative path from image folder
    rel_path = os.path.relpath(os.path.dirname(file_path), image_folder)
    if rel_path == '.':
        subfolder = ''
        top_folder = ''
    else:
        subfolder = rel_path.replace('\\', '/')
        top_folder = subfolder.split('/')[0]

    # Check folder-based flags
    path_parts = subfolder.lower().split('/') if subfolder else []
    nsfw_folders = [f.lower() for f in settings.get('NSFW_FOLDERS', [])]
    is_content_locked = 'nsfw' in path_parts or any(f in path_parts for f in nsfw_folders)
    is_archived = 'archive' in path_parts

    # Check keyword-based NSFW (from filename)
    is_nsfw = False
    nsfw_keywords = settings.get('NSFW_KEYWORDS', [])
    filename_lower = filename.lower()
    for keyword in nsfw_keywords:
        if keyword in filename_lower:
            is_nsfw = True
            break

    try:
        mod_time = os.path.getmtime(file_path)
        file_size = os.path.getsize(file_path)
    except OSError:
        return None

    return {
        'file_path': file_path,
        'filename': filename,
        'subfolder': subfolder,
        'top_folder': top_folder,
        'media_type': media_type,
        'mod_time': mod_time,
        'file_size': file_size,
        'is_nsfw': is_nsfw,
        'is_content_locked': is_content_locked,
        'is_archived': is_archived,
    }


def _process_new_file(file_path: str, event_type: str = 'new_image'):
    """Process a new or modified file: insert into DB and notify clients"""
    info = _classify_file(file_path)
    if not info:
        return

    # Upsert into database
    db.upsert_media(**info)

    log_level = settings.get('LOGGING_LEVEL', 'basic')

    if event_type == 'new_image':
        print(f"✨ New media detected: {info['filename']}")
    elif log_level in ('detailed', 'debug'):
        print(f"📝 Media updated: {info['filename']}")

    # Push WebSocket event to all clients
    if _ws_broadcast:
        _ws_broadcast({
            'type': event_type,
            'filename': info['filename'],
            'subfolder': info['subfolder'],
            'media_type': info['media_type'],
        })

    # Trigger content scan in background if enabled
    if _content_scan_callback:
        threading.Thread(
            target=_content_scan_callback,
            args=(file_path,),
            daemon=True
        ).start()

    # Extract metadata in background
    threading.Thread(
        target=_extract_metadata_for_file,
        args=(file_path,),
        daemon=True
    ).start()


def _extract_metadata_for_file(file_path: str):
    """Extract and store metadata for a single file"""
    try:
        # Small delay to ensure file is fully written
        time.sleep(0.3)

        if not os.path.exists(file_path):
            return

        embedded = extract_embedded_metadata(file_path)
        if embedded and any(embedded.get(k) for k in ('prompt', 'seed', 'model')):
            db.update_metadata(
                file_path=file_path,
                prompt=embedded.get('prompt'),
                negative_prompt=embedded.get('negative_prompt'),
                seed=embedded.get('seed'),
                model=embedded.get('model'),
                dimensions=embedded.get('dimensions'),
                loras=embedded.get('loras'),
            )

            # Re-check NSFW keywords against prompt
            prompt = (embedded.get('prompt') or '').lower()
            nsfw_keywords = settings.get('NSFW_KEYWORDS', [])
            for keyword in nsfw_keywords:
                if keyword in prompt:
                    db.update_flags(file_path, is_nsfw=True)
                    break

    except Exception as e:
        log_level = settings.get('LOGGING_LEVEL', 'basic')
        if log_level in ('detailed', 'debug'):
            print(f"[METADATA] Error extracting for {os.path.basename(file_path)}: {e}")


class MediaChangeHandler(FileSystemEventHandler):
    """Watchdog handler for file system events"""

    # Debounce tracking to avoid duplicate events
    _recent_events = {}
    _debounce_lock = threading.Lock()
    DEBOUNCE_SECONDS = 1.0

    def _should_process(self, path: str) -> bool:
        """Check if we should process this event (debounce duplicates)"""
        now = time.time()
        with self._debounce_lock:
            last_time = self._recent_events.get(path, 0)
            if now - last_time < self.DEBOUNCE_SECONDS:
                return False
            self._recent_events[path] = now

            # Cleanup old entries periodically
            if len(self._recent_events) > 1000:
                cutoff = now - 10
                self._recent_events = {
                    k: v for k, v in self._recent_events.items() if v > cutoff
                }
        return True

    def on_created(self, event):
        if not event.is_directory and event.src_path.lower().endswith(MEDIA_EXTENSIONS):
            if self._should_process(event.src_path):
                # Small delay to let file finish writing
                threading.Timer(0.5, _process_new_file, args=(event.src_path, 'new_image')).start()

    def on_modified(self, event):
        if not event.is_directory and event.src_path.lower().endswith(MEDIA_EXTENSIONS):
            if self._should_process(event.src_path):
                threading.Timer(0.5, _process_new_file, args=(event.src_path, 'media_updated')).start()

    def on_moved(self, event):
        if not event.is_directory and event.dest_path.lower().endswith(MEDIA_EXTENSIONS):
            # Remove old record, add new one
            db.delete_media(event.src_path)
            _process_new_file(event.dest_path, 'new_image')

    def on_deleted(self, event):
        if not event.is_directory and event.src_path.lower().endswith(MEDIA_EXTENSIONS):
            db.delete_media(event.src_path)
            log_level = settings.get('LOGGING_LEVEL', 'basic')
            if log_level in ('detailed', 'debug'):
                print(f"🗑️ Media deleted: {os.path.basename(event.src_path)}")

            if _ws_broadcast:
                _ws_broadcast({
                    'type': 'media_deleted',
                    'filename': os.path.basename(event.src_path),
                })


def index_folder(image_folder: str, progress_callback: Optional[Callable] = None):
    """
    Full index of the image folder into the database.
    Called on startup to build the initial catalog.
    """
    print(f"🗂️ [INDEX] Starting full index of {image_folder}...")
    start_time = time.time()
    count = 0
    errors = 0

    for root, dirs, files in os.walk(image_folder):
        for filename in files:
            if filename.lower().endswith(MEDIA_EXTENSIONS):
                file_path = os.path.join(root, filename)
                info = _classify_file(file_path)
                if info:
                    try:
                        db.upsert_media(**info)
                        count += 1
                    except Exception as e:
                        errors += 1
                        if settings.get('LOGGING_LEVEL') in ('detailed', 'debug'):
                            print(f"[INDEX] Error indexing {filename}: {e}")

                    if progress_callback and count % 500 == 0:
                        progress_callback(count)

    elapsed = time.time() - start_time
    print(f"🗂️ [INDEX] Complete! Indexed {count} media files in {elapsed:.1f}s ({errors} errors)")
    return count


def enrich_metadata_background(batch_size: int = 50):
    """
    Background task: extract embedded metadata for files that haven't been processed yet.
    Skips archived files to save resources.
    """
    if not settings.get('METADATA_EXTRACTION', True):
        return

    items = db.get_unextracted_media(limit=batch_size, skip_archived=True)
    if not items:
        return

    updated = 0
    for item in items:
        try:
            time.sleep(0.01)  # Yield to other threads
            _extract_metadata_for_file(item['file_path'])
            updated += 1
        except Exception:
            pass

    if updated > 0 and settings.get('LOGGING_LEVEL') in ('detailed', 'debug'):
        print(f"🏷️ [METADATA] Enriched {updated} files with embedded metadata")


def start_observer(image_folder: str) -> Observer:
    """Start the watchdog file system observer"""
    event_handler = MediaChangeHandler()
    observer = Observer()
    observer.schedule(event_handler, image_folder, recursive=True)
    observer.start()
    print(f"👁️ Started recursive monitoring of {image_folder}")
    return observer
