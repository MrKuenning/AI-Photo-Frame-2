"""
Media API Router — Handles media listing, serving, thumbnails, and metadata.
"""

import os
import io
import mimetypes
from typing import Optional

from fastapi import APIRouter, Query, Response, HTTPException
from fastapi.responses import FileResponse, StreamingResponse
from PIL import Image

# Disable Pillow's decompression bomb protection for very large AI images
Image.MAX_IMAGE_PIXELS = None

from config import settings
import database as db
from metadata_extractor import extract_embedded_metadata

router = APIRouter(tags=["media"])


# ============================================
# Media Listing
# ============================================

@router.get("/media")
def get_media(
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    subfolder: Optional[str] = Query(None),
    recursive: bool = Query(True),
    media_type: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    safe_mode: bool = Query(False),
    content_lock: bool = Query(False),
    hide_archive: bool = Query(False),
):
    """Get paginated media list with filters"""
    # Override hide_archive if enabled in global settings
    if settings.get('HIDE_ARCHIVE', False):
        hide_archive = True

    items, total = db.get_media_page(
        offset=offset,
        limit=limit,
        subfolder=subfolder,
        recursive=recursive,
        media_type=media_type,
        search=search,
        safe_mode=safe_mode,
        content_lock=content_lock,
        hide_archive=hide_archive,
    )

    return {
        "items": items,
        "total": total,
        "offset": offset,
        "limit": limit,
        "has_more": offset + limit < total,
    }


@router.get("/media/latest")
def get_latest_media(
    safe_mode: bool = Query(False),
    content_lock: bool = Query(False),
    hide_archive: bool = Query(False),
    media_type: Optional[str] = Query(None),
):
    """Get the most recent media item"""
    item = db.get_latest(
        safe_mode=safe_mode,
        content_lock=content_lock,
        hide_archive=hide_archive,
        media_type=media_type,
    )
    if not item:
        return {"item": None}
    return {"item": item}


# ============================================
# Media Metadata
# ============================================

@router.get("/media/{media_id}/metadata")
def get_media_metadata(media_id: int):
    """Get metadata for a specific media item, extracting on-demand if needed"""
    item = db.get_by_id(media_id)
    if not item:
        raise HTTPException(status_code=404, detail="Media not found")

    # If metadata hasn't been extracted yet, do it now
    if not item.get('metadata_extracted'):
        try:
            embedded = extract_embedded_metadata(item['file_path'])
            if embedded and any(embedded.get(k) for k in ('prompt', 'seed', 'model')):
                db.update_metadata(
                    file_path=item['file_path'],
                    prompt=embedded.get('prompt'),
                    negative_prompt=embedded.get('negative_prompt'),
                    seed=embedded.get('seed'),
                    model=embedded.get('model'),
                    dimensions=embedded.get('dimensions'),
                    loras=embedded.get('loras'),
                )
                # Refresh the item from DB
                item = db.get_by_id(media_id)
        except Exception as e:
            print(f"[METADATA] On-demand extraction error: {e}")

    return {
        "prompt": item.get('prompt'),
        "negative_prompt": item.get('negative_prompt'),
        "seed": item.get('seed'),
        "model": item.get('model'),
        "dimensions": item.get('dimensions'),
        "loras": item.get('loras'),
        "filename": item.get('filename'),
        "subfolder": item.get('subfolder'),
    }


# ============================================
# File Serving
# ============================================

@router.get("/media/{media_id}/file")
def serve_media_file(media_id: int):
    """Serve the original media file with range request support for video"""
    item = db.get_by_id(media_id)
    if not item:
        raise HTTPException(status_code=404, detail="Media not found")

    file_path = item['file_path']
    if not os.path.exists(file_path):
        db.delete_by_id(media_id)
        raise HTTPException(status_code=404, detail="File not found on disk")

    # Determine MIME type
    mimetype, _ = mimetypes.guess_type(file_path)
    if not mimetype:
        ext = os.path.splitext(file_path)[1].lower()
        video_mimes = {
            '.mp4': 'video/mp4', '.webm': 'video/webm',
            '.mov': 'video/quicktime', '.avi': 'video/x-msvideo',
            '.mkv': 'video/x-matroska', '.m4v': 'video/x-m4v'
        }
        mimetype = video_mimes.get(ext, 'application/octet-stream')

    return FileResponse(
        file_path,
        media_type=mimetype,
        filename=item['filename'],
    )


# ============================================
# Thumbnail (in-memory resize, no disk writes)
# ============================================

@router.get("/media/{media_id}/thumb")
def serve_thumbnail(
    media_id: int,
    width: int = Query(300, ge=50, le=800),
    height: int = Query(300, ge=50, le=800),
):
    """
    Serve an in-memory resized thumbnail of an image.
    No files are written to disk — the resize happens in RAM.
    For videos, returns a placeholder or the first frame if possible.
    """
    item = db.get_by_id(media_id)
    if not item:
        raise HTTPException(status_code=404, detail="Media not found")

    file_path = item['file_path']
    if not os.path.exists(file_path):
        db.delete_by_id(media_id)
        raise HTTPException(status_code=404, detail="File not found on disk")

    # For videos, just serve the original (let the browser handle it)
    if item['media_type'] == 'video':
        return FileResponse(file_path, media_type='video/mp4')

    try:
        with Image.open(file_path) as img:
            # Convert to RGB if necessary (handles RGBA, P mode, etc.)
            if img.mode in ('RGBA', 'P', 'LA'):
                img = img.convert('RGB')

            # Resize maintaining aspect ratio
            img.thumbnail((width, height), Image.Resampling.LANCZOS)

            # Write to bytes buffer
            buffer = io.BytesIO()
            img.save(buffer, format='JPEG', quality=85)
            buffer.seek(0)

            return StreamingResponse(
                buffer,
                media_type='image/jpeg',
                headers={
                    'Cache-Control': 'public, max-age=86400',  # Cache for 24 hours
                }
            )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Thumbnail generation failed: {str(e)}")


# ============================================
# Folder Navigation
# ============================================

@router.get("/folders")
def get_folders(parent: str = Query('')):
    """Get folder listing for navigation"""
    folders = db.get_folders(parent)
    return {"folders": folders}


@router.get("/folders/siblings")
def get_sibling_folders(subfolder: str = Query('')):
    """Get sibling folders at the same level"""
    if not subfolder:
        return {"siblings": []}
    siblings = db.get_sibling_folders(subfolder)
    return {"siblings": siblings}


@router.get("/folders/children")
def get_child_folders(subfolder: str = Query('')):
    """Get immediate child folders"""
    children = db.get_folders(subfolder)
    return {"children": children}
