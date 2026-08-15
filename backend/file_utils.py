"""
File Utilities for Photo Frame 6 backend.
Provides Windows-safe shared file opening (FILE_SHARE_DELETE) so media files can be
streamed, played back, or thumbnail-served without locking disk files against move/rename/delete operations.
"""

import os
import sys
import time
import shutil
import ctypes
from typing import Optional
from fastapi import Request
from fastapi.responses import StreamingResponse

# ============================================
# Windows Shared File Handle Opener
# ============================================

def open_shared_read(path: str):
    """
    Open file for reading on Windows with FILE_SHARE_READ | FILE_SHARE_WRITE | FILE_SHARE_DELETE.
    This prevents Windows mandatory file locking while Python streams the file, allowing
    files to be flagged, moved, renamed, or deleted by this process or external AI tools.
    Gracefully falls back to standard open() if FILE_SHARE_DELETE is rejected (common on UNC/SMB network shares).
    """
    if sys.platform == 'win32':
        try:
            from ctypes import wintypes
            
            GENERIC_READ = 0x80000000
            FILE_SHARE_READ = 0x00000001
            FILE_SHARE_WRITE = 0x00000002
            FILE_SHARE_DELETE = 0x00000004
            OPEN_EXISTING = 3
            FILE_ATTRIBUTE_NORMAL = 0x00000080
            
            kernel32 = ctypes.windll.kernel32
            try:
                ucrt = ctypes.CDLL('ucrtbase', use_errno=True)
            except Exception:
                ucrt = ctypes.cdll.msvcrt
            
            kernel32.CreateFileW.argtypes = [
                wintypes.LPCWSTR, wintypes.DWORD, wintypes.DWORD,
                ctypes.c_void_p, wintypes.DWORD, wintypes.DWORD, ctypes.c_void_p
            ]
            kernel32.CreateFileW.restype = ctypes.c_ssize_t
            
            # Primary attempt: open with full delete-sharing
            handle = kernel32.CreateFileW(
                str(path),
                GENERIC_READ,
                FILE_SHARE_READ | FILE_SHARE_WRITE | FILE_SHARE_DELETE,
                None,
                OPEN_EXISTING,
                FILE_ATTRIBUTE_NORMAL,
                None
            )
            
            # Secondary attempt (for SMB / UNC network shares that disallow FILE_SHARE_DELETE):
            if handle == -1 or handle == (1 << 64) - 1 or handle == 0:
                handle = kernel32.CreateFileW(
                    str(path),
                    GENERIC_READ,
                    FILE_SHARE_READ | FILE_SHARE_WRITE,
                    None,
                    OPEN_EXISTING,
                    FILE_ATTRIBUTE_NORMAL,
                    None
                )
            
            if handle == -1 or handle == (1 << 64) - 1 or handle == 0:
                # Direct fallback to standard Python open for network paths
                return open(path, 'rb')
                
            ucrt._open_osfhandle.argtypes = [ctypes.c_ssize_t, ctypes.c_int]
            ucrt._open_osfhandle.restype = ctypes.c_int
            
            fd = ucrt._open_osfhandle(handle, os.O_RDONLY | os.O_BINARY)
            if fd == -1:
                kernel32.CloseHandle(handle)
                return open(path, 'rb')
                
            return open(fd, 'rb')
        except Exception:
            return open(path, 'rb')
    else:
        return open(path, 'rb')


# ============================================
# Resilient File Moving
# ============================================

def safe_move_file(src: str, dst: str, max_retries: int = 5, delay: float = 0.2) -> bool:
    """
    Move a file from src to dst with retries to handle brief transient locks.
    Returns True if successful, False otherwise.
    """
    if not os.path.exists(src):
        return False

    dst_dir = os.path.dirname(dst)
    if dst_dir:
        os.makedirs(dst_dir, exist_ok=True)
    
    last_error = None
    for attempt in range(max_retries):
        try:
            shutil.move(src, dst)
            return True
        except Exception as e:
            last_error = e
            time.sleep(delay)
            
    print(f"[FileUtil] ❌ Failed to move {src} -> {dst} after {max_retries} attempts: {last_error}")
    return False


# ============================================
# Non-blocking Range Streaming File Response
# ============================================

def create_shared_file_response(
    file_path: str,
    media_type: str,
    filename: Optional[str] = None,
    range_header: Optional[str] = None,
    chunk_size: int = 64 * 1024
) -> StreamingResponse:
    """
    Create a StreamingResponse for media/video files using open_shared_read.
    Fully supports HTTP Range requests (206 Partial Content) for browser video streaming,
    while opening files with FILE_SHARE_DELETE so files are never locked on Windows disk.
    """
    file_size = os.path.getsize(file_path)
    start = 0
    end = file_size - 1
    status_code = 200

    headers = {
        'Accept-Ranges': 'bytes',
        'Content-Type': media_type,
    }

    if filename:
        headers['Content-Disposition'] = f'inline; filename="{filename}"'

    # Handle Range header (e.g., "bytes=0-" or "bytes=100-500")
    if range_header and range_header.startswith('bytes='):
        try:
            bytes_range = range_header.replace('bytes=', '').strip()
            parts = bytes_range.split('-')
            
            if parts[0]:
                start = int(parts[0])
            if len(parts) > 1 and parts[1]:
                end = int(parts[1])
                
            if start < file_size:
                end = min(end, file_size - 1)
                status_code = 206
                content_length = end - start + 1
                headers['Content-Range'] = f'bytes {start}-{end}/{file_size}'
            else:
                start = 0
                end = file_size - 1
                content_length = file_size
        except Exception:
            start = 0
            end = file_size - 1
            content_length = file_size
    else:
        content_length = file_size

    headers['Content-Length'] = str(content_length)

    def file_stream():
        f = None
        try:
            f = open_shared_read(file_path)
            f.seek(start)
            bytes_remaining = content_length
            
            while bytes_remaining > 0:
                read_bytes = min(chunk_size, bytes_remaining)
                chunk = f.read(read_bytes)
                if not chunk:
                    break
                bytes_remaining -= len(chunk)
                yield chunk
        except Exception as e:
            print(f"[STREAM] Warning reading {file_path}: {e}")
        finally:
            if f:
                try:
                    f.close()
                except Exception:
                    pass

    return StreamingResponse(
        file_stream(),
        status_code=status_code,
        headers=headers,
        media_type=media_type
    )
