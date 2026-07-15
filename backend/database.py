"""
SQLite database module for Photo Frame 6.
Provides an indexed media catalog with full-text search for instant
filtering, searching, and pagination without scanning the filesystem.
"""

import os
import sqlite3
import json
import threading
from typing import List, Optional, Dict, Any, Tuple


# Thread-local storage for connections
_local = threading.local()
_db_path = None


def init(db_path: str):
    """Initialize the database path and create schema if needed"""
    global _db_path
    _db_path = db_path
    conn = _get_connection()
    _create_schema(conn)
    conn.close()
    # Reset thread-local so next call creates fresh connection
    _local.connection = None


def _get_connection() -> sqlite3.Connection:
    """Get a thread-local database connection"""
    if not hasattr(_local, 'connection') or _local.connection is None:
        _local.connection = sqlite3.connect(_db_path, timeout=10)
        _local.connection.row_factory = sqlite3.Row
        _local.connection.execute("PRAGMA journal_mode=WAL")
        _local.connection.execute("PRAGMA synchronous=NORMAL")
        _local.connection.execute("PRAGMA cache_size=-8000")  # 8MB cache
    return _local.connection


def _create_schema(conn: sqlite3.Connection):
    """Create database tables and indexes"""
    conn.executescript("""
        -- Main media table
        CREATE TABLE IF NOT EXISTS media (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            file_path TEXT UNIQUE NOT NULL,
            filename TEXT NOT NULL,
            subfolder TEXT DEFAULT '',
            top_folder TEXT DEFAULT '',
            media_type TEXT CHECK(media_type IN ('image', 'video')) NOT NULL,
            mod_time REAL NOT NULL,
            file_size INTEGER DEFAULT 0,
            -- Metadata (populated by background enrichment)
            prompt TEXT,
            negative_prompt TEXT,
            seed TEXT,
            model TEXT,
            dimensions TEXT,
            loras TEXT,
            -- Flags
            is_nsfw INTEGER DEFAULT 0,
            is_content_locked INTEGER DEFAULT 0,
            is_archived INTEGER DEFAULT 0,
            -- Tracking
            metadata_extracted INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        -- Performance indexes
        CREATE INDEX IF NOT EXISTS idx_media_subfolder ON media(subfolder);
        CREATE INDEX IF NOT EXISTS idx_media_mod_time ON media(mod_time DESC);
        CREATE INDEX IF NOT EXISTS idx_media_type ON media(media_type);
        CREATE INDEX IF NOT EXISTS idx_media_top_folder ON media(top_folder);
        CREATE INDEX IF NOT EXISTS idx_media_file_path ON media(file_path);

        -- Full-text search index for instant search
        CREATE VIRTUAL TABLE IF NOT EXISTS media_fts USING fts5(
            filename,
            prompt,
            model,
            seed,
            content='media',
            content_rowid='id',
            tokenize='unicode61'
        );

        -- Triggers to keep FTS in sync with media table
        CREATE TRIGGER IF NOT EXISTS media_ai AFTER INSERT ON media BEGIN
            INSERT INTO media_fts(rowid, filename, prompt, model, seed)
            VALUES (new.id, new.filename, new.prompt, new.model, new.seed);
        END;

        CREATE TRIGGER IF NOT EXISTS media_ad AFTER DELETE ON media BEGIN
            INSERT INTO media_fts(media_fts, rowid, filename, prompt, model, seed)
            VALUES ('delete', old.id, old.filename, old.prompt, old.model, old.seed);
        END;

        CREATE TRIGGER IF NOT EXISTS media_au AFTER UPDATE ON media BEGIN
            INSERT INTO media_fts(media_fts, rowid, filename, prompt, model, seed)
            VALUES ('delete', old.id, old.filename, old.prompt, old.model, old.seed);
            INSERT INTO media_fts(rowid, filename, prompt, model, seed)
            VALUES (new.id, new.filename, new.prompt, new.model, new.seed);
        END;
    """)
    conn.commit()


# ============================================
# CRUD Operations
# ============================================

def upsert_media(
    file_path: str,
    filename: str,
    subfolder: str,
    top_folder: str,
    media_type: str,
    mod_time: float,
    file_size: int = 0,
    is_nsfw: bool = False,
    is_content_locked: bool = False,
    is_archived: bool = False,
) -> int:
    """Insert or update a media record. Returns the row id."""
    conn = _get_connection()
    cursor = conn.execute("""
        INSERT INTO media (file_path, filename, subfolder, top_folder, media_type,
                          mod_time, file_size, is_nsfw, is_content_locked, is_archived)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(file_path) DO UPDATE SET
            filename = excluded.filename,
            subfolder = excluded.subfolder,
            top_folder = excluded.top_folder,
            media_type = excluded.media_type,
            mod_time = excluded.mod_time,
            file_size = excluded.file_size,
            is_nsfw = excluded.is_nsfw,
            is_content_locked = excluded.is_content_locked,
            is_archived = excluded.is_archived
    """, (file_path, filename, subfolder, top_folder, media_type,
          mod_time, file_size, int(is_nsfw), int(is_content_locked), int(is_archived)))
    conn.commit()
    return cursor.lastrowid


def update_metadata(
    file_path: str,
    prompt: Optional[str] = None,
    negative_prompt: Optional[str] = None,
    seed: Optional[str] = None,
    model: Optional[str] = None,
    dimensions: Optional[str] = None,
    loras: Optional[list] = None,
):
    """Update metadata fields for a media record"""
    conn = _get_connection()
    loras_json = json.dumps(loras) if loras else None
    conn.execute("""
        UPDATE media SET
            prompt = COALESCE(?, prompt),
            negative_prompt = COALESCE(?, negative_prompt),
            seed = COALESCE(?, seed),
            model = COALESCE(?, model),
            dimensions = COALESCE(?, dimensions),
            loras = COALESCE(?, loras),
            metadata_extracted = 1
        WHERE file_path = ?
    """, (prompt, negative_prompt, seed, model, dimensions, loras_json, file_path))
    conn.commit()


def update_media_path(old_path: str, new_path: str, filename: str, subfolder: str, is_nsfw: bool = False, is_content_locked: bool = False):
    """Update file path and location info without changing ID"""
    conn = _get_connection()
    conn.execute("""
        UPDATE media SET
            file_path = ?,
            filename = ?,
            subfolder = ?,
            is_nsfw = ?,
            is_content_locked = ?
        WHERE file_path = ?
    """, (new_path, filename, subfolder, int(is_nsfw), int(is_content_locked), old_path))
    conn.commit()


def delete_media(file_path: str):
    """Remove a media record from the database"""
    conn = _get_connection()
    conn.execute("DELETE FROM media WHERE file_path = ?", (file_path,))
    conn.commit()


def delete_by_id(media_id: int):
    """Remove a media record by ID"""
    conn = _get_connection()
    conn.execute("DELETE FROM media WHERE id = ?", (media_id,))
    conn.commit()


def get_by_id(media_id: int) -> Optional[Dict[str, Any]]:
    """Get a single media record by ID"""
    conn = _get_connection()
    row = conn.execute("SELECT * FROM media WHERE id = ?", (media_id,)).fetchone()
    return _row_to_dict(row) if row else None


def get_by_path(file_path: str) -> Optional[Dict[str, Any]]:
    """Get a single media record by file path"""
    conn = _get_connection()
    row = conn.execute("SELECT * FROM media WHERE file_path = ?", (file_path,)).fetchone()
    return _row_to_dict(row) if row else None


# ============================================
# Query Operations
# ============================================

def get_media_page(
    offset: int = 0,
    limit: int = 50,
    subfolder: Optional[str] = None,
    recursive: bool = True,
    media_type: Optional[str] = None,
    search: Optional[str] = None,
    safe_mode: bool = False,
    content_lock: bool = False,
    hide_archive: bool = False,
    nsfw_keywords: Optional[List[str]] = None,
) -> Tuple[List[Dict[str, Any]], int]:
    """
    Get a paginated list of media with filters applied.
    Returns (list_of_media, total_count).
    """
    conn = _get_connection()
    conditions = []
    params = []

    # Subfolder filter
    if subfolder:
        if recursive:
            conditions.append("(subfolder = ? OR subfolder LIKE ?)")
            params.extend([subfolder, subfolder + '/%'])
        else:
            conditions.append("subfolder = ?")
            params.append(subfolder)

    # Media type filter
    if media_type and media_type != 'all':
        if media_type == 'photos':
            conditions.append("media_type = 'image'")
        elif media_type == 'videos':
            conditions.append("media_type = 'video'")

    # Content lock: hide files in NSFW folders
    if content_lock:
        conditions.append("is_content_locked = 0")

    # Safe mode: hide keyword-matched NSFW
    if safe_mode:
        conditions.append("is_nsfw = 0")

    # Hide archive
    if hide_archive:
        conditions.append("is_archived = 0")

    # Full-text search
    if search and search.strip():
        search_term = search.strip()
        # Use FTS5 for search
        conditions.append("id IN (SELECT rowid FROM media_fts WHERE media_fts MATCH ?)")
        # Escape special FTS characters and add prefix matching
        safe_search = search_term.replace('"', '""')
        params.append(f'"{safe_search}"*')

    where_clause = " AND ".join(conditions) if conditions else "1=1"

    # Get total count
    count_sql = f"SELECT COUNT(*) FROM media WHERE {where_clause}"
    total = conn.execute(count_sql, params).fetchone()[0]

    # Get page
    query_sql = f"""
        SELECT * FROM media
        WHERE {where_clause}
        ORDER BY mod_time DESC
        LIMIT ? OFFSET ?
    """
    rows = conn.execute(query_sql, params + [limit, offset]).fetchall()

    return [_row_to_dict(row) for row in rows], total


def get_latest(
    safe_mode: bool = False,
    content_lock: bool = False,
    hide_archive: bool = False,
    media_type: Optional[str] = None,
) -> Optional[Dict[str, Any]]:
    """Get the most recent media item, respecting filters"""
    conn = _get_connection()
    conditions = []

    if safe_mode:
        conditions.append("is_nsfw = 0")
    if content_lock:
        conditions.append("is_content_locked = 0")
    if hide_archive:
        conditions.append("is_archived = 0")
    if media_type and media_type != 'all':
        if media_type == 'photos':
            conditions.append("media_type = 'image'")
        elif media_type == 'videos':
            conditions.append("media_type = 'video'")

    where_clause = " AND ".join(conditions) if conditions else "1=1"

    row = conn.execute(
        f"SELECT * FROM media WHERE {where_clause} ORDER BY mod_time DESC LIMIT 1"
    ).fetchone()

    return _row_to_dict(row) if row else None


def get_folders(parent: str = '') -> List[str]:
    """Get immediate child folder names under a parent path"""
    conn = _get_connection()

    if not parent:
        # Get top-level folders
        rows = conn.execute(
            "SELECT DISTINCT top_folder FROM media WHERE top_folder != '' ORDER BY top_folder"
        ).fetchall()
        return [row['top_folder'] for row in rows]
    else:
        # Get child folders under parent
        rows = conn.execute(
            "SELECT DISTINCT subfolder FROM media WHERE subfolder LIKE ? ORDER BY subfolder",
            (parent + '/%',)
        ).fetchall()

        children = set()
        parent_depth = parent.count('/') + 1
        for row in rows:
            parts = row['subfolder'].split('/')
            if len(parts) > parent_depth:
                children.add(parts[parent_depth])
        return sorted(children)


def get_sibling_folders(subfolder: str) -> List[str]:
    """Get sibling folders at the same level as the given subfolder"""
    conn = _get_connection()

    if '/' in subfolder:
        parent = '/'.join(subfolder.split('/')[:-1])
        pattern = parent + '/%'
    else:
        parent = ''
        pattern = '%'

    rows = conn.execute(
        "SELECT DISTINCT subfolder FROM media WHERE subfolder LIKE ? ORDER BY subfolder",
        (pattern,)
    ).fetchall()

    siblings = set()
    target_depth = subfolder.count('/')
    for row in rows:
        sf = row['subfolder']
        parts = sf.split('/')
        if parent:
            # Get the part right after the parent
            parent_depth = parent.count('/') + 1
            if len(parts) > parent_depth:
                siblings.add(parts[parent_depth])
        else:
            if parts and parts[0]:
                siblings.add(parts[0])

    return sorted(siblings)


def get_unextracted_media(limit: int = 100, skip_archived: bool = True) -> List[Dict[str, Any]]:
    """Get media records that haven't had metadata extracted yet"""
    conn = _get_connection()
    conditions = ["metadata_extracted = 0"]
    if skip_archived:
        conditions.append("is_archived = 0")

    where_clause = " AND ".join(conditions)
    rows = conn.execute(
        f"SELECT * FROM media WHERE {where_clause} ORDER BY mod_time DESC LIMIT ?",
        (limit,)
    ).fetchall()
    return [_row_to_dict(row) for row in rows]


def get_total_count() -> int:
    """Get total number of media records"""
    conn = _get_connection()
    return conn.execute("SELECT COUNT(*) FROM media").fetchone()[0]


def update_flags(file_path: str, **flags):
    """Update flag fields (is_nsfw, is_content_locked, is_archived)"""
    conn = _get_connection()
    set_clauses = []
    params = []
    for key, value in flags.items():
        if key in ('is_nsfw', 'is_content_locked', 'is_archived'):
            set_clauses.append(f"{key} = ?")
            params.append(int(value))

    if set_clauses:
        params.append(file_path)
        conn.execute(
            f"UPDATE media SET {', '.join(set_clauses)} WHERE file_path = ?",
            params
        )
        conn.commit()


def update_file_path(old_path: str, new_path: str, new_subfolder: str = None, new_top_folder: str = None):
    """Update the file path of a media record (after move/rename)"""
    conn = _get_connection()
    new_filename = os.path.basename(new_path)
    params = [new_path, new_filename]
    set_clause = "file_path = ?, filename = ?"

    if new_subfolder is not None:
        set_clause += ", subfolder = ?"
        params.append(new_subfolder)
    if new_top_folder is not None:
        set_clause += ", top_folder = ?"
        params.append(new_top_folder)

    params.append(old_path)
    conn.execute(f"UPDATE media SET {set_clause} WHERE file_path = ?", params)
    conn.commit()


def clear_all():
    """Clear all media records (for full re-index)"""
    conn = _get_connection()
    conn.execute("DELETE FROM media")
    conn.execute("DELETE FROM media_fts")
    conn.commit()


# ============================================
# Helpers
# ============================================

def _row_to_dict(row: sqlite3.Row) -> Dict[str, Any]:
    """Convert a sqlite3.Row to a dictionary with proper type handling"""
    d = dict(row)
    # Parse loras JSON
    if d.get('loras'):
        try:
            d['loras'] = json.loads(d['loras'])
        except (json.JSONDecodeError, TypeError):
            d['loras'] = None
    # Convert integer flags to booleans
    for flag in ('is_nsfw', 'is_content_locked', 'is_archived', 'metadata_extracted'):
        if flag in d:
            d[flag] = bool(d[flag])
    return d
