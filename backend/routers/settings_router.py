"""
Settings API Router — Get/save config, toggle endpoints.
"""

import threading

from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Dict, Any, Optional

from config import settings
import content_scanner
from routers.auth import has_action_permission

router = APIRouter(tags=["settings"])


# ============================================
# Models
# ============================================

class ToggleRequest(BaseModel):
    enabled: bool

class SettingsUpdateRequest(BaseModel):
    settings: Dict[str, Any]


# ============================================
# Settings CRUD
# ============================================

@router.get("/settings")
def get_settings(request: Request):
    """
    Get all current settings.
    Requires settings unlock if SETTINGS_PASSPHRASE is configured.
    """
    if not has_action_permission(request, 'settings'):
        raise HTTPException(status_code=403, detail="Settings are locked. Passphrase required.")

    # Return safe subset of settings
    current_settings = {
        # Global
        "PORT": settings.get('PORT', 5000),
        "IMAGE_FOLDER": settings.get('IMAGE_FOLDER', ''),
        "MAX_INITIAL_LOAD": settings.get('MAX_INITIAL_LOAD', 100),
        "LOGGING_LEVEL": settings.get('LOGGING_LEVEL', 'basic'),
        
        # Passphrase Overrides
        "DELETE_PASSPHRASE": settings.get('DELETE_PASSPHRASE', ''),
        "FLAG_PASSPHRASE": settings.get('FLAG_PASSPHRASE', ''),
        "ARCHIVE_PASSPHRASE": settings.get('ARCHIVE_PASSPHRASE', ''),
        "SETTINGS_PASSPHRASE": settings.get('SETTINGS_PASSPHRASE', ''),
        "TOGGLE_CONTENT_SCAN_PASSPHRASE": settings.get('TOGGLE_CONTENT_SCAN_PASSPHRASE', ''),
        "TOGGLE_METADATA_EXTRACTION_PASSPHRASE": settings.get('TOGGLE_METADATA_EXTRACTION_PASSPHRASE', ''),
        "TOGGLE_CONTENT_LOCK_PASSPHRASE": settings.get('TOGGLE_CONTENT_LOCK_PASSPHRASE', ''),
        "TOGGLE_KEYWORD_FILTER_PASSPHRASE": settings.get('TOGGLE_KEYWORD_FILTER_PASSPHRASE', ''),
        "TOGGLE_SAFE_ONLY_PASSPHRASE": settings.get('TOGGLE_SAFE_ONLY_PASSPHRASE', ''),
        
        # Defaults (Now just settings)
        "KEYWORD_FILTER_DEFAULT": settings.get('KEYWORD_FILTER_DEFAULT', False),
        "SAFE_ONLY_DEFAULT": settings.get('SAFE_ONLY_DEFAULT', False),
        "CONTENT_SCAN_DEFAULT": settings.get('CONTENT_SCAN_DEFAULT', False),
        "METADATA_EXTRACTION": settings.get('METADATA_EXTRACTION', True),
        "CONTENT_LOCK_DEFAULT": settings.get('CONTENT_LOCK_DEFAULT', False),
        "ENABLE_KEYWORD_FILTER_OPTION": settings.get('ENABLE_KEYWORD_FILTER_OPTION', True),
        "ENABLE_SAFE_ONLY_OPTION": settings.get('ENABLE_SAFE_ONLY_OPTION', True),
        "ENABLE_CONTENT_SCAN_OPTION": settings.get('ENABLE_CONTENT_SCAN_OPTION', True),
        "ENABLE_CONTENT_LOCK_OPTION": settings.get('ENABLE_CONTENT_LOCK_OPTION', True),
        "ENABLE_ARCHIVE_OPTION": settings.get('ENABLE_ARCHIVE_OPTION', True),
        "HIDE_ARCHIVE": settings.get('HIDE_ARCHIVE', False),
        "SCAN_VIDEO_FILES": settings.get('SCAN_VIDEO_FILES', True),
        "THUMBNAIL_ASPECT_RATIO": settings.get('THUMBNAIL_ASPECT_RATIO', 'square'),
        "HOME_THUMBNAIL_COLUMNS_DEFAULT": settings.get('HOME_THUMBNAIL_COLUMNS_DEFAULT', 3),
        "GALLERY_THUMBNAIL_SIZE_DEFAULT": settings.get('GALLERY_THUMBNAIL_SIZE_DEFAULT', 3),
        
        # Scanning
        "NSFW_KEYWORDS": ', '.join(settings.get('NSFW_KEYWORDS', [])),
        "NSFW_FOLDERS": ', '.join(settings.get('NSFW_FOLDERS', [])),
        "SAFE_FOLDERS": ', '.join(settings.get('SAFE_FOLDERS', [])),
        "CONTENT_SCAN_OFFSET": settings.get('CONTENT_SCAN_OFFSET', 0),
        "NUDITY_THRESHOLD": settings.get('NUDITY_THRESHOLD', 0.5),
        "NSFW_LABELS": ', '.join(settings.get('NSFW_LABELS', [])),
    }
    
    return {"success": True, "settings": current_settings}

@router.post("/settings")
def update_settings(body: SettingsUpdateRequest, request: Request):
    """
    Update application settings.
    Requires settings unlock if SETTINGS_PASSPHRASE is configured.
    """
    if not has_action_permission(request, 'settings'):
        raise HTTPException(status_code=403, detail="Settings are locked. Passphrase required.")

    try:
        new_settings = body.settings
            
        settings.update_from_dict(new_settings)
        
        try:
            import content_scanner
            content_scanner.set_config(
                settings.get('NSFW_KEYWORDS', []),
                settings.get('NUDITY_THRESHOLD', 0.5),
                settings.get('NSFW_LABELS', []),
                settings.get('SAFE_FOLDERS', ['SAFE']),
                logging_level=settings.get('LOGGING_LEVEL', 'basic'),
                scan_video_files=settings.get('SCAN_VIDEO_FILES', True)
            )
        except Exception as ex:
            print(f"[Settings] Error updating content scanner config: {ex}")

        return {"success": True, "message": "Settings updated"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================
# Toggle Endpoints
# ============================================

@router.post("/toggle/content-scan")
def toggle_content_scan(body: ToggleRequest, request: Request):
    """Toggle content scanning on/off"""
    from main import toggle_states
    toggle_states['content_scan'] = body.enabled
    status = "enabled" if body.enabled else "disabled"
    print(f"[Toggle] Content scanning {status}")
    return {"success": True, "enabled": body.enabled}


@router.get("/toggle/status")
def get_toggle_status():
    """Get current toggle states"""
    from main import toggle_states
    return {
        "content_scan": toggle_states.get('content_scan', False),
    }
