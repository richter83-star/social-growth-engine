"""
Instagrapi FastAPI Microservice
Wraps the instagrapi library to provide Instagram data via HTTP API.
Runs on port 8001 alongside the main Node.js server.
"""

import os
import json
import logging
from pathlib import Path
from typing import Optional
from fastapi import FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from instagrapi import Client
from instagrapi.exceptions import (
    LoginRequired, BadPassword, InvalidMediaId,
    UserNotFound, ClientError, TwoFactorRequired
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Instagrapi Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Internal API key for service-to-service auth
INTERNAL_API_KEY = os.environ.get("INSTAGRAPI_API_KEY", "instagrapi-internal-key")

# Session cache directory
SESSION_DIR = Path("/tmp/instagrapi_sessions")
SESSION_DIR.mkdir(exist_ok=True)

# In-memory client cache: username -> Client instance
_clients: dict[str, Client] = {}


def _session_path(username: str) -> Path:
    return SESSION_DIR / f"{username}.json"


def _get_or_create_client(username: str) -> Optional[Client]:
    """Return a cached authenticated client for the given username, or None if not logged in."""
    if username in _clients:
        return _clients[username]
    
    session_file = _session_path(username)
    if session_file.exists():
        try:
            cl = Client()
            cl.load_settings(str(session_file))
            # Verify the session is still valid
            cl.get_timeline_feed()
            _clients[username] = cl
            logger.info(f"[instagrapi] Restored session for {username}")
            return cl
        except Exception as e:
            logger.warning(f"[instagrapi] Session restore failed for {username}: {e}")
            session_file.unlink(missing_ok=True)
    
    return None


def _verify_key(x_api_key: Optional[str]):
    if x_api_key != INTERNAL_API_KEY:
        raise HTTPException(status_code=401, detail="Unauthorized")


# --- Request/Response Models ---

class LoginRequest(BaseModel):
    username: str
    password: str
    verification_code: Optional[str] = None  # For 2FA


class LoginResponse(BaseModel):
    success: bool
    username: str
    requires_2fa: bool = False
    message: str = ""


class UserInfo(BaseModel):
    username: str
    full_name: str
    biography: str
    follower_count: int
    following_count: int
    media_count: int
    profile_pic_url: str
    is_private: bool
    is_verified: bool
    external_url: str


class MediaItem(BaseModel):
    id: str
    media_type: int  # 1=photo, 2=video, 8=album
    thumbnail_url: str
    caption: str
    like_count: int
    comment_count: int
    taken_at: str
    play_count: Optional[int] = None


class MediaInsights(BaseModel):
    media_id: str
    like_count: int
    comment_count: int
    play_count: Optional[int] = None
    reach: Optional[int] = None
    impressions: Optional[int] = None
    saved: Optional[int] = None


# --- Endpoints ---

@app.get("/health")
def health():
    return {"status": "ok", "service": "instagrapi"}


@app.post("/login", response_model=LoginResponse)
def login(req: LoginRequest, x_api_key: Optional[str] = Header(None)):
    _verify_key(x_api_key)
    
    cl = Client()
    
    # Load existing session if available to avoid re-login
    session_file = _session_path(req.username)
    if session_file.exists():
        try:
            cl.load_settings(str(session_file))
            cl.login(req.username, req.password)
            cl.dump_settings(str(session_file))
            _clients[req.username] = cl
            logger.info(f"[instagrapi] Re-authenticated {req.username} with existing session")
            return LoginResponse(success=True, username=req.username, message="Logged in (session reused)")
        except Exception:
            session_file.unlink(missing_ok=True)
    
    try:
        if req.verification_code:
            # Complete 2FA login
            cl.login(req.username, req.password, verification_code=req.verification_code)
        else:
            cl.login(req.username, req.password)
        
        cl.dump_settings(str(session_file))
        _clients[req.username] = cl
        logger.info(f"[instagrapi] Logged in {req.username}")
        return LoginResponse(success=True, username=req.username, message="Logged in successfully")
    
    except TwoFactorRequired:
        return LoginResponse(success=False, username=req.username, requires_2fa=True, message="2FA required")
    
    except BadPassword:
        raise HTTPException(status_code=401, detail="Invalid username or password")
    
    except ClientError as e:
        logger.error(f"[instagrapi] Login error for {req.username}: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@app.delete("/logout/{username}")
def logout(username: str, x_api_key: Optional[str] = Header(None)):
    _verify_key(x_api_key)
    
    if username in _clients:
        try:
            _clients[username].logout()
        except Exception:
            pass
        del _clients[username]
    
    session_file = _session_path(username)
    session_file.unlink(missing_ok=True)
    
    return {"success": True, "message": f"Logged out {username}"}


@app.get("/user/{username}", response_model=UserInfo)
def get_user_info(username: str, logged_in_as: str, x_api_key: Optional[str] = Header(None)):
    """Get public profile info for any Instagram user. logged_in_as is the authenticated account username."""
    _verify_key(x_api_key)
    
    cl = _get_or_create_client(logged_in_as)
    if not cl:
        raise HTTPException(status_code=401, detail=f"Not logged in as {logged_in_as}. Call /login first.")
    
    try:
        user = cl.user_info_by_username(username)
        return UserInfo(
            username=user.username,
            full_name=user.full_name or "",
            biography=user.biography or "",
            follower_count=user.follower_count or 0,
            following_count=user.following_count or 0,
            media_count=user.media_count or 0,
            profile_pic_url=str(user.profile_pic_url) if user.profile_pic_url else "",
            is_private=user.is_private or False,
            is_verified=user.is_verified or False,
            external_url=str(user.external_url) if user.external_url else "",
        )
    except UserNotFound:
        raise HTTPException(status_code=404, detail=f"User {username} not found")
    except LoginRequired:
        # Session expired — remove from cache
        _clients.pop(logged_in_as, None)
        raise HTTPException(status_code=401, detail="Session expired. Please re-login.")
    except Exception as e:
        logger.error(f"[instagrapi] get_user_info error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/user/{username}/posts", response_model=list[MediaItem])
def get_user_posts(username: str, logged_in_as: str, limit: int = 12, x_api_key: Optional[str] = Header(None)):
    """Get recent posts for a user."""
    _verify_key(x_api_key)
    
    cl = _get_or_create_client(logged_in_as)
    if not cl:
        raise HTTPException(status_code=401, detail=f"Not logged in as {logged_in_as}. Call /login first.")
    
    try:
        user_id = cl.user_id_from_username(username)
        medias = cl.user_medias(user_id, amount=min(limit, 20))
        
        result = []
        for m in medias:
            thumbnail = ""
            if m.thumbnail_url:
                thumbnail = str(m.thumbnail_url)
            elif m.resources and m.resources[0].thumbnail_url:
                thumbnail = str(m.resources[0].thumbnail_url)
            
            result.append(MediaItem(
                id=str(m.id),
                media_type=m.media_type.value if hasattr(m.media_type, 'value') else int(m.media_type),
                thumbnail_url=thumbnail,
                caption=m.caption_text or "",
                like_count=m.like_count or 0,
                comment_count=m.comment_count or 0,
                taken_at=m.taken_at.isoformat() if m.taken_at else "",
                play_count=m.play_count if hasattr(m, 'play_count') else None,
            ))
        return result
    
    except LoginRequired:
        _clients.pop(logged_in_as, None)
        raise HTTPException(status_code=401, detail="Session expired. Please re-login.")
    except Exception as e:
        logger.error(f"[instagrapi] get_user_posts error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/media/{media_id}/insights", response_model=MediaInsights)
def get_media_insights(media_id: str, logged_in_as: str, x_api_key: Optional[str] = Header(None)):
    """Get insights for a specific media post (only works for your own posts)."""
    _verify_key(x_api_key)
    
    cl = _get_or_create_client(logged_in_as)
    if not cl:
        raise HTTPException(status_code=401, detail=f"Not logged in as {logged_in_as}. Call /login first.")
    
    try:
        insights = cl.insights_media_feed_all(media_id)
        return MediaInsights(
            media_id=media_id,
            like_count=insights.get("like_count", 0),
            comment_count=insights.get("comment_count", 0),
            play_count=insights.get("play_count"),
            reach=insights.get("reach"),
            impressions=insights.get("impressions"),
            saved=insights.get("saved"),
        )
    except InvalidMediaId:
        raise HTTPException(status_code=404, detail="Media not found")
    except LoginRequired:
        _clients.pop(logged_in_as, None)
        raise HTTPException(status_code=401, detail="Session expired. Please re-login.")
    except Exception as e:
        logger.error(f"[instagrapi] get_media_insights error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/sessions")
def list_sessions(x_api_key: Optional[str] = Header(None)):
    """List all active sessions."""
    _verify_key(x_api_key)
    active = list(_clients.keys())
    cached = [f.stem for f in SESSION_DIR.glob("*.json")]
    return {"active_in_memory": active, "cached_on_disk": cached}


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("INSTAGRAPI_PORT", 8001))
    uvicorn.run(app, host="0.0.0.0", port=port, log_level="info")
