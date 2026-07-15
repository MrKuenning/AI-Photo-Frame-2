"""
Photo Frame 6 — Main FastAPI Application
Entry point for the backend server with WebSocket support,
file system monitoring, and static file serving.
"""

import os
import sys
import asyncio
import threading
import json
import time
from contextlib import asynccontextmanager
from typing import Set

import uvicorn
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from config import settings
import database as db
import watcher
import content_scanner

# ============================================
# Windows asyncio Workaround for WebSocket
# ============================================
# Silences the "WinError 10054" exception when clients forcefully disconnect
if sys.platform == "win32":
    from asyncio.proactor_events import _ProactorBasePipeTransport
    from functools import wraps
    
    _original_call_connection_lost = _ProactorBasePipeTransport._call_connection_lost

    @wraps(_original_call_connection_lost)
    def _silence_connection_reset(self, exc):
        try:
            _original_call_connection_lost(self, exc)
        except ConnectionResetError as e:
            if e.winerror == 10054:
                pass
            else:
                raise
                
    _ProactorBasePipeTransport._call_connection_lost = _silence_connection_reset

# ============================================
# WebSocket Connection Manager
# ============================================

class ConnectionManager:
    """Manages active WebSocket connections for broadcasting events"""

    def __init__(self):
        self.active_connections: Set[WebSocket] = set()
        self._lock = threading.Lock()

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        with self._lock:
            self.active_connections.add(websocket)
        print(f"[WebSocket] Client connected ({len(self.active_connections)} total)")

    def disconnect(self, websocket: WebSocket):
        with self._lock:
            self.active_connections.discard(websocket)
        print(f"[WebSocket] Client disconnected ({len(self.active_connections)} total)")

    async def broadcast(self, message: dict):
        """Send a message to all connected clients"""
        with self._lock:
            connections = list(self.active_connections)

        disconnected = []
        for connection in connections:
            try:
                await connection.send_json(message)
            except Exception:
                disconnected.append(connection)

        # Clean up disconnected clients
        if disconnected:
            with self._lock:
                for conn in disconnected:
                    self.active_connections.discard(conn)

    def broadcast_sync(self, message: dict):
        """Thread-safe broadcast from non-async contexts (watchdog, scanner)"""
        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                asyncio.ensure_future(self.broadcast(message))
            else:
                loop.run_until_complete(self.broadcast(message))
        except RuntimeError:
            # No event loop available - create a new one for this thread
            loop = asyncio.new_event_loop()
            loop.run_until_complete(self.broadcast(message))
            loop.close()


ws_manager = ConnectionManager()


# ============================================
# Application Lifespan (startup/shutdown)
# ============================================

# Global reference to the file observer
_observer = None
# Toggle states (server-side, shared across all clients)
toggle_states = {
    'content_scan': False,
}


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown logic"""
    global _observer

    # --- STARTUP ---
    print("=" * 60)
    print("  Photo Frame 6 — Starting up...")
    print("=" * 60)

    # Load configuration
    settings.load()

    # Initialize toggle states from config defaults
    toggle_states['content_scan'] = settings.get('CONTENT_SCAN_DEFAULT', False)

    # Initialize database
    db_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'media_index.db')
    db.init(db_path)
    print(f"[OK] Database initialized at {db_path}")

    # Initialize content scanner
    content_scanner.set_config(
        settings.get('NSFW_KEYWORDS', []),
        settings.get('NUDITY_THRESHOLD', 0.5),
        settings.get('NSFW_LABELS', []),
        settings.get('SAFE_FOLDERS', ['SAFE']),
        logging_level=settings.get('LOGGING_LEVEL', 'basic')
    )

    # Index the image folder
    image_folder = settings.get('IMAGE_FOLDER')
    existing_count = db.get_total_count()
    if existing_count == 0:
        print("[INDEX] First run — performing full index...")
        watcher.index_folder(image_folder)
    else:
        print(f"[INDEX] Database has {existing_count} records. Running incremental sync...")
        # Quick incremental: just index, upsert handles duplicates
        threading.Thread(
            target=watcher.index_folder,
            args=(image_folder,),
            daemon=True
        ).start()

    # Start background metadata enrichment
    threading.Thread(
        target=_metadata_enrichment_loop,
        daemon=True
    ).start()

    # Set up WebSocket broadcast callback for the watcher
    watcher.set_ws_broadcast(ws_manager.broadcast_sync)

    # Set up content scan callback
    def on_new_file_scan(file_path):
        if toggle_states.get('content_scan', False):
            if not content_scanner.should_skip_scanning(file_path):
                if not _is_archived(file_path):
                    try:
                        from metadata_extractor import extract_embedded_metadata
                        metadata = extract_embedded_metadata(file_path)
                        if content_scanner.scan_single_file(file_path, metadata):
                            pass
                    except Exception as e:
                        print(f"[ContentScan] Error: {e}")

    watcher.set_content_scan_callback(on_new_file_scan)

    # Start file system observer
    _observer = watcher.start_observer(image_folder)

    port = settings.get('PORT', 5000)
    print(f"🚀 Server ready on http://0.0.0.0:{port}")
    print("=" * 60)

    yield  # App is running

    # --- SHUTDOWN ---
    print("\n[Shutdown] Stopping file system observer...")
    if _observer:
        _observer.stop()
        _observer.join()
    print("[Shutdown] Complete.")


def _is_archived(file_path: str) -> bool:
    """Check if file is in an archive folder"""
    return 'archive' in file_path.replace('\\', '/').lower().split('/')


def _metadata_enrichment_loop():
    """Background loop that continuously enriches metadata for un-processed files"""
    time.sleep(3)  # Wait for initial indexing to settle
    while True:
        try:
            if settings.get('METADATA_EXTRACTION', True):
                watcher.enrich_metadata_background(batch_size=50)
        except Exception as e:
            print(f"[METADATA] Background enrichment error: {e}")
        time.sleep(5)  # Check every 5 seconds for new un-extracted files


# ============================================
# FastAPI App
# ============================================

app = FastAPI(
    title="Photo Frame 6",
    description="AI-generated media viewer with real-time updates",
    version="6.0.0",
    lifespan=lifespan,
)

# CORS — allow React dev server on any local network IP
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex="https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================
# WebSocket Endpoint
# ============================================

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time updates"""
    await ws_manager.connect(websocket)
    try:
        while True:
            # Keep connection alive, listen for client messages
            data = await websocket.receive_text()
            # Client can send pings or other messages
            if data == "ping":
                await websocket.send_json({"type": "pong"})
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception:
        ws_manager.disconnect(websocket)


# ============================================
# Import and mount routers
# ============================================

from routers import media, auth, actions, settings_router

app.include_router(media.router, prefix="/api")
app.include_router(auth.router, prefix="/api/auth")
app.include_router(actions.router, prefix="/api/actions")
app.include_router(settings_router.router, prefix="/api")


# ============================================
# Serve React frontend (production)
# ============================================

# Check if the frontend build exists and mount it
frontend_build = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'frontend', 'dist')
if os.path.isdir(frontend_build):
    app.mount("/", StaticFiles(directory=frontend_build, html=True), name="frontend")
    print(f"[OK] Serving frontend from {frontend_build}")


# ============================================
# Entry Point
# ============================================

if __name__ == "__main__":
    import psutil

    # Load config early to get port
    settings.load()
    port = settings.get('PORT', 5000)

    # Check for port conflict
    try:
        conflict_pid = None
        conflict_name = None
        for conn in psutil.net_connections(kind='inet'):
            if conn.laddr.port == port and conn.status == 'LISTEN':
                conflict_pid = conn.pid
                try:
                    conflict_name = psutil.Process(conflict_pid).name()
                except psutil.NoSuchProcess:
                    conflict_name = "Unknown"
                break

        if conflict_pid:
            print(f"\n[⚠️ PORT CONFLICT] Port {port} is in use by PID {conflict_pid} ({conflict_name}).")
            user_input = input(f"Force close this process to start the server? [y/N]: ")
            if user_input.lower().strip() == 'y':
                print(f"🔄 Terminating PID {conflict_pid}...")
                try:
                    psutil.Process(conflict_pid).terminate()
                    psutil.Process(conflict_pid).wait(timeout=5)
                    print(f"✅ Terminated PID {conflict_pid}.")
                    time.sleep(1)
                except Exception as e:
                    print(f"❌ Failed: {e}")
            else:
                print("Proceeding anyway...")
    except Exception as e:
        if settings.get('LOGGING_LEVEL') == 'debug':
            print(f"[DEBUG] Port check error: {e}")

    # Start Uvicorn
    show_logs = settings.get('LOGGING_LEVEL', 'basic') != 'basic'
    log_level = "info" if show_logs else "warning"

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        reload=False,
        log_level=log_level,
    )
