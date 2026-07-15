"""
Actions API Router — Delete, flag, unflag, mark-safe, archive, save-frame, scan.
"""

import os
import base64
import glob
import shutil
import time
import threading
from typing import Optional

from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from config import settings
import database as db
import content_scanner
from routers.auth import has_action_permission

router = APIRouter(tags=["actions"])


# ============================================
# Models
# ============================================

class SaveFrameRequest(BaseModel):
    media_id: int
    image_data: str  # Base64 encoded image

class ScanFolderRequest(BaseModel):
    subfolder: str = ''


# ============================================
# Delete
# ============================================

@router.delete("/delete/{media_id}")
def delete_media(media_id: int, request: Request):
    """Delete a media file from disk and database"""
    if not has_action_permission(request, 'delete'):
        raise HTTPException(status_code=403, detail="Permission denied")

    item = db.get_by_id(media_id)
    if not item:
        raise HTTPException(status_code=404, detail="Media not found")

    file_path = item['file_path']
    if not os.path.exists(file_path):
        # File already gone, just clean up DB
        db.delete_by_id(media_id)
        return {"success": True, "message": "File already removed, database cleaned"}

    try:
        os.remove(file_path)
        db.delete_by_id(media_id)
        print(f"🗑️ [DELETE] Deleted: {item['filename']}")
        return {"success": True, "message": "File deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================
# Flag / Unflag NSFW
# ============================================

@router.post("/flag/{media_id}")
def flag_nsfw(media_id: int, request: Request):
    """Move a file to NSFW subfolder"""
    if not has_action_permission(request, 'flag'):
        raise HTTPException(status_code=403, detail="Permission denied")

    item = db.get_by_id(media_id)
    if not item:
        raise HTTPException(status_code=404, detail="Media not found")

    file_path = item['file_path']
    if content_scanner.is_in_nsfw_folder(file_path):
        return JSONResponse({"success": False, "error": "Already in NSFW folder"}, status_code=400)

    new_path = content_scanner.move_to_nsfw_folder(file_path)
    if new_path:
        # Update DB to keep the same ID
        db.update_media_path(
            old_path=file_path, 
            new_path=new_path, 
            filename=os.path.basename(new_path), 
            subfolder='NSFW', 
            is_nsfw=True, 
            is_content_locked=True
        )
        print(f"🟥 [FLAG] Moved to NSFW: {item['filename']}\n")
        return {"success": True, "message": "File moved to NSFW folder", "new_path": new_path}
    else:
        raise HTTPException(status_code=500, detail="Failed to move file")


@router.post("/unflag/{media_id}")
def unflag_nsfw(media_id: int, request: Request):
    """Move a file out of NSFW subfolder back to parent"""
    if not has_action_permission(request, 'flag'):
        raise HTTPException(status_code=403, detail="Permission denied")

    item = db.get_by_id(media_id)
    if not item:
        raise HTTPException(status_code=404, detail="Media not found")

    file_path = item['file_path']
    if not content_scanner.is_in_nsfw_folder(file_path):
        return JSONResponse({"success": False, "error": "File is not in NSFW folder"}, status_code=400)

    try:
        current_folder = os.path.dirname(file_path)
        parent_folder = os.path.dirname(current_folder)
        file_name = os.path.basename(file_path)
        dest_path = os.path.join(parent_folder, file_name)

        # Handle collision
        if os.path.exists(dest_path):
            base, ext = os.path.splitext(file_name)
            counter = 1
            while os.path.exists(dest_path):
                dest_path = os.path.join(parent_folder, f"{base}_{counter}{ext}")
                counter += 1

        shutil.move(file_path, dest_path)
        
        # Determine new subfolder
        new_subfolder = os.path.basename(parent_folder) if parent_folder != settings.get('IMAGE_FOLDER') else ''
        if new_subfolder == os.path.basename(settings.get('IMAGE_FOLDER')):
            new_subfolder = ''
            
        db.update_media_path(
            old_path=file_path,
            new_path=dest_path,
            filename=file_name,
            subfolder=new_subfolder,
            is_nsfw=False,
            is_content_locked=False
        )
        
        print(f"🟩 [UNFLAG] Moved out of NSFW: {file_name}\n")
        return {"success": True, "message": "File unflagged", "new_path": dest_path}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================
# Mark Safe
# ============================================

@router.post("/mark-safe/{media_id}")
def mark_safe(media_id: int, request: Request):
    """Move a file to SAFE folder"""
    if not has_action_permission(request, 'flag'):
        raise HTTPException(status_code=403, detail="Permission denied")

    item = db.get_by_id(media_id)
    if not item:
        raise HTTPException(status_code=404, detail="Media not found")

    file_path = item['file_path']
    if content_scanner.is_in_safe_folder(file_path):
        return JSONResponse({"success": False, "error": "Already in SAFE folder"}, status_code=400)

    new_path = content_scanner.move_to_safe_folder(file_path)
    if new_path:
        db.update_media_path(
            old_path=file_path,
            new_path=new_path,
            filename=os.path.basename(new_path),
            subfolder='SAFE',
            is_nsfw=False,
            is_content_locked=False
        )
        print(f"🟩 [MARK SAFE] Moved to SAFE: {item['filename']}\n")
        return {"success": True, "message": "File marked safe", "new_path": new_path}
    else:
        raise HTTPException(status_code=500, detail="Failed to move file")

@router.post("/unmark-safe/{media_id}")
def unmark_safe(media_id: int, request: Request):
    """Move a file out of SAFE subfolder back to parent"""
    if not has_action_permission(request, 'flag'):
        raise HTTPException(status_code=403, detail="Permission denied")

    item = db.get_by_id(media_id)
    if not item:
        raise HTTPException(status_code=404, detail="Media not found")

    file_path = item['file_path']
    if not content_scanner.is_in_safe_folder(file_path):
        return JSONResponse({"success": False, "error": "File is not in SAFE folder"}, status_code=400)

    try:
        current_folder = os.path.dirname(file_path)
        parent_folder = os.path.dirname(current_folder)
        file_name = os.path.basename(file_path)
        dest_path = os.path.join(parent_folder, file_name)

        # Handle collision
        if os.path.exists(dest_path):
            base, ext = os.path.splitext(file_name)
            counter = 1
            while os.path.exists(dest_path):
                dest_path = os.path.join(parent_folder, f"{base}_{counter}{ext}")
                counter += 1

        import shutil
        shutil.move(file_path, dest_path)
        
        # Determine new subfolder
        new_subfolder = os.path.basename(parent_folder) if parent_folder != settings.get('IMAGE_FOLDER') else ''
        if new_subfolder == os.path.basename(settings.get('IMAGE_FOLDER')):
            new_subfolder = ''
            
        db.update_media_path(
            old_path=file_path,
            new_path=dest_path,
            filename=file_name,
            subfolder=new_subfolder,
            is_nsfw=item['is_nsfw'],
            is_content_locked=item['is_content_locked']
        )
        
        print(f"🟥 [UNMARK SAFE] Moved out of SAFE: {file_name}\n")
        return {"success": True, "message": "File unmarked safe", "new_path": dest_path}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================
# Save Video Frame
# ============================================

@router.post("/save-frame")
def save_frame(body: SaveFrameRequest):
    """Save current video frame as a JPEG image"""
    item = db.get_by_id(body.media_id)
    if not item:
        raise HTTPException(status_code=404, detail="Media not found")

    file_path = item['file_path']
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Video file not found")

    try:
        video_dir = os.path.dirname(file_path)
        base_name = item['filename']

        # Find next available frame number
        pattern = os.path.join(video_dir, f"{base_name}-*.jpg")
        existing_frames = glob.glob(pattern)

        max_num = 0
        for frame_path in existing_frames:
            try:
                frame_name = os.path.basename(frame_path)
                num_str = frame_name.replace(f"{base_name}-", "").replace(".jpg", "")
                num = int(num_str)
                max_num = max(max_num, num)
            except ValueError:
                continue

        next_num = max_num + 1
        new_filename = f"{base_name}-{next_num:05d}.jpg"
        new_path = os.path.join(video_dir, new_filename)

        # Decode and save
        image_data = body.image_data
        if ',' in image_data:
            image_data = image_data.split(',')[1]

        image_bytes = base64.b64decode(image_data)
        with open(new_path, 'wb') as f:
            f.write(image_bytes)

        # Copy video's modification time to the saved frame
        video_stat = os.stat(file_path)
        os.utime(new_path, (video_stat.st_atime, video_stat.st_mtime))

        print(f"📸 [SAVE FRAME] Saved: {new_filename}")
        return {"success": True, "filename": new_filename, "path": new_path}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================
# Archive
# ============================================

@router.post("/archive")
def archive_files(request: Request):
    """Move all content from output folder (except Archive) into Archive folder"""
    if not has_action_permission(request, 'archive'):
        raise HTTPException(status_code=403, detail="Permission denied")

    image_folder = settings.get('IMAGE_FOLDER')
    archive_folder = os.path.join(image_folder, 'Archive')
    os.makedirs(archive_folder, exist_ok=True)

    folders_to_archive = []
    files_to_archive = []

    for item in os.listdir(image_folder):
        item_path = os.path.join(image_folder, item)
        if item.lower() == 'archive':
            continue
        if os.path.isdir(item_path):
            folders_to_archive.append(item)
        elif os.path.isfile(item_path):
            files_to_archive.append(item)

    total = len(folders_to_archive) + len(files_to_archive)
    if total == 0:
        return {"success": False, "error": "No content to archive"}

    # Run archive in background
    def run_archive():
        moved = 0
        for folder_name in folders_to_archive:
            src = os.path.join(image_folder, folder_name)
            dst = os.path.join(archive_folder, folder_name)
            try:
                if os.path.exists(dst):
                    _merge_folders(src, dst)
                    try:
                        shutil.rmtree(src)
                    except Exception:
                        pass
                else:
                    shutil.move(src, dst)
                moved += 1
            except Exception as e:
                print(f"[Archive] Error: {e}")

        for file_name in files_to_archive:
            src = os.path.join(image_folder, file_name)
            dst = os.path.join(archive_folder, file_name)
            try:
                if os.path.exists(dst):
                    base, ext = os.path.splitext(file_name)
                    dst = os.path.join(archive_folder, f"{base}_{int(time.time())}{ext}")
                shutil.move(src, dst)
                moved += 1
            except Exception as e:
                print(f"[Archive] Error: {e}")

        print(f"📦 [Archive] Complete! Moved {moved}/{total} items")

    threading.Thread(target=run_archive, daemon=True).start()
    return {"success": True, "message": f"Archiving {total} items..."}


def _merge_folders(src: str, dst: str):
    """Recursively merge src directory into dst"""
    os.makedirs(dst, exist_ok=True)
    for item in os.listdir(src):
        s = os.path.join(src, item)
        d = os.path.join(dst, item)
        if os.path.isdir(s):
            if os.path.exists(d):
                _merge_folders(s, d)
            else:
                shutil.move(s, d)
        else:
            if os.path.exists(d):
                base, ext = os.path.splitext(item)
                d = os.path.join(dst, f"{base}_{int(time.time())}{ext}")
            shutil.move(s, d)


# ============================================
# Content Scan
# ============================================

@router.post("/scan-folder")
def scan_folder(body: ScanFolderRequest, request: Request):
    """Start NSFW scanning on a folder"""
    image_folder = settings.get('IMAGE_FOLDER')
    if body.subfolder:
        folder_path = os.path.join(image_folder, body.subfolder)
    else:
        folder_path = image_folder

    if not os.path.exists(folder_path):
        raise HTTPException(status_code=404, detail="Folder not found")

    def run_scan():
        from metadata_extractor import extract_embedded_metadata
        from main import ws_manager
        
        # ANSI colors for console output
        C_CYAN = "\033[96m"
        C_RESET = "\033[0m"
        folder_name = os.path.basename(folder_path) if folder_path != image_folder else 'All'
        print(f"\n{C_CYAN}[Manual Scan Started on {folder_name}]{C_RESET}")
        
        skip_archive = not body.subfolder
        for progress in content_scanner.scan_folder_batch(
            folder_path, batch_size=20,
            get_metadata_func=lambda fp: extract_embedded_metadata(fp),
            skip_archive=skip_archive
        ):
            ws_manager.broadcast_sync({
                "type": "scan_progress",
                "data": progress
            })
        print(f"[Scan] Complete for {body.subfolder or 'All'}")

    threading.Thread(target=run_scan, daemon=True).start()
    return {"success": True, "message": f"Scan started for: {body.subfolder or 'All'}"}
