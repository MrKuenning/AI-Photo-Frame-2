"""
Authentication API Router — Passphrase unlocking and session management.
"""

import time
from fastapi import APIRouter, Request, Response
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from itsdangerous import URLSafeTimedSerializer, BadSignature, SignatureExpired

from config import settings

router = APIRouter(tags=["auth"])

# Session management
SECRET_KEY = 'photo-frame-6-secret-key-change-me'
session_serializer = URLSafeTimedSerializer(SECRET_KEY)
SESSION_MAX_AGE = 30 * 24 * 60 * 60  # 30 days


# ============================================
# Models
# ============================================

class UnlockRequest(BaseModel):
    passphrase: str


# ============================================
# Session Helpers
# ============================================

def _get_session(request: Request) -> dict:
    """Get and verify session from cookie"""
    session_cookie = request.cookies.get('auth_session')
    if not session_cookie:
        return {}
    try:
        return session_serializer.loads(session_cookie, max_age=SESSION_MAX_AGE)
    except (BadSignature, SignatureExpired):
        return {}


def has_action_permission(request: Request, action: str) -> bool:
    """
    Check if user has permission for a specific action.
    If no passphrase is set, permission is granted.
    If passphrase is set, permission is granted only if unlocked in session.
    """
    passphrase_keys = {
        'delete': 'DELETE_PASSPHRASE',
        'flag': 'FLAG_PASSPHRASE',
        'archive': 'ARCHIVE_PASSPHRASE',
        'settings': 'SETTINGS_PASSPHRASE',
        'content_scan': 'TOGGLE_CONTENT_SCAN_PASSPHRASE',
        'metadata_extraction': 'TOGGLE_METADATA_EXTRACTION_PASSPHRASE',
        'content_lock': 'TOGGLE_CONTENT_LOCK_PASSPHRASE',
        'hide_archive': 'TOGGLE_ARCHIVE_PASSPHRASE',
        'safemode': 'TOGGLE_SAFEMODE_PASSPHRASE',
    }
    
    config_key = passphrase_keys.get(action)
    if not config_key:
        return True # Default allow if unknown action
        
    config_pass = settings.get(config_key, '')
    if not config_pass:
        return True # No passphrase set, allowed
        
    session = _get_session(request)
    return session.get(f'{action}_unlocked', False)


# ============================================
# Routes
# ============================================

@router.get("/status")
def auth_status(request: Request):
    """Get current auth status and all permissions"""
    
    return {
        "logging_level": settings.get('LOGGING_LEVEL', 'basic'),
        # Action permissions
        "can_delete": has_action_permission(request, 'delete'),
        "can_flag": has_action_permission(request, 'flag'),
        "can_archive": has_action_permission(request, 'archive'),
        "can_mark_safe": has_action_permission(request, 'flag'),
        "can_access_settings": has_action_permission(request, 'settings'),
        
        # Action passphrase requirements
        "delete_passphrase_required": bool(settings.get('DELETE_PASSPHRASE')) and not has_action_permission(request, 'delete'),
        "flag_passphrase_required": bool(settings.get('FLAG_PASSPHRASE')) and not has_action_permission(request, 'flag'),
        "archive_passphrase_required": bool(settings.get('ARCHIVE_PASSPHRASE')) and not has_action_permission(request, 'archive'),
        "settings_passphrase_required": bool(settings.get('SETTINGS_PASSPHRASE')) and not has_action_permission(request, 'settings'),
        
        # Toggle permissions
        "can_toggle_content_scan": has_action_permission(request, 'content_scan'),
        "can_toggle_content_lock": has_action_permission(request, 'content_lock'),
        "can_toggle_safemode": has_action_permission(request, 'safemode'),
        
        # Toggle passphrase requirements
        "content_scan_passphrase_required": bool(settings.get('TOGGLE_CONTENT_SCAN_PASSPHRASE')) and not has_action_permission(request, 'content_scan'),
        "content_lock_passphrase_required": bool(settings.get('TOGGLE_CONTENT_LOCK_PASSPHRASE')) and not has_action_permission(request, 'content_lock'),
        "safemode_passphrase_required": bool(settings.get('TOGGLE_SAFEMODE_PASSPHRASE')) and not has_action_permission(request, 'safemode'),
        
        # Defaults
        "safe_mode_default": settings.get('SAFE_MODE_DEFAULT', False),
        "content_scan_default": settings.get('CONTENT_SCAN_DEFAULT', False),
        "content_lock_default": settings.get('CONTENT_LOCK_DEFAULT', False),
        "home_thumbnail_columns_default": settings.get('HOME_THUMBNAIL_COLUMNS_DEFAULT', 3),
        "gallery_thumbnail_size_default": settings.get('GALLERY_THUMBNAIL_SIZE_DEFAULT', 3),
        "thumbnail_aspect_ratio_default": settings.get('THUMBNAIL_ASPECT_RATIO', 'square'),
    }


@router.post("/unlock/{action}")
def unlock_action(action: str, body: UnlockRequest, request: Request):
    """Unlock a specific action or toggle for this session"""
    passphrase = body.passphrase.strip()

    # Map action names to config keys
    passphrase_keys = {
        'delete': 'DELETE_PASSPHRASE',
        'flag': 'FLAG_PASSPHRASE',
        'archive': 'ARCHIVE_PASSPHRASE',
        'settings': 'SETTINGS_PASSPHRASE',
        'content_scan': 'TOGGLE_CONTENT_SCAN_PASSPHRASE',
        'content_lock': 'TOGGLE_CONTENT_LOCK_PASSPHRASE',
        'safemode': 'TOGGLE_SAFEMODE_PASSPHRASE',
    }

    config_key = passphrase_keys.get(action)
    if not config_key:
        return JSONResponse({"success": False, "error": f"Unknown action: {action}"}, status_code=400)

    config_pass = settings.get(config_key, '')
    if not config_pass:
        return JSONResponse({"success": False, "error": f"No passphrase configured for {action}"})

    if passphrase == config_pass:
        session = _get_session(request)
        session[f'{action}_unlocked'] = True
        session['created'] = time.time()
        token = session_serializer.dumps(session)
        resp = JSONResponse({"success": True})
        resp.set_cookie('auth_session', token, max_age=SESSION_MAX_AGE, httponly=True, samesite='lax')
        return resp
    else:
        return JSONResponse({"success": False, "error": "Invalid passphrase"})

