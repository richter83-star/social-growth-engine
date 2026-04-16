"""
Instagrapi FastAPI Microservice
================================
Wraps the instagrapi library to provide a simple HTTP API for the Node.js backend.
Runs on port 8001 by default.

Endpoints:
  GET  /health                          - liveness probe
  POST /login                           - login with username/password (optional 2FA code)
  DELETE /logout/{username}             - logout and clear session
  GET  /user/{username}                 - get profile info (requires logged_in_as param)
  GET  /user/{username}/posts           - get recent posts
  GET  /media/{media_id}/insights       - get media insights (own posts only)
"""

import os
import json
import logging
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, HTTPException, Header, Depends, Query
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from instagrapi import Client
from instagrapi.exceptions import (
    LoginRequired,
    TwoFactorRequired,
    BadPassword,
    UserNotFound,
    ChallengeRequired,
)

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
API_KEY = os.environ.get("INSTAGRAPI_API_KEY", "instagrapi-internal-key")
SESSION_DIR = Path(os.environ.get("INSTAGRAPI_SESSION_DIR", "/tmp/instagrapi-sessions"))
SESSION_DIR.mkdir(parents=True, exist_ok=True)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("instagrapi-service")

app = FastAPI(title="Instagrapi Service", version="1.0.0")

# In-memory client pool: username -> Client instance
_clients: dict[str, Client] = {}


# ---------------------------------------------------------------------------
# Auth dependency
# ---------------------------------------------------------------------------
def require_api_key(x_api_key: str = Header(...)):
    if x_api_key != API_KEY:
        raise HTTPException(status_code=401, detail="Invalid API key")


# ---------------------------------------------------------------------------
# Session helpers
# ---------------------------------------------------------------------------
def _session_path(username: str) -> Path:
    return SESSION_DIR / f"{username}.json"


def _save_session(cl: Client, username: str):
    path = _session_path(username)
    path.write_text(json.dumps(cl.get_settings()))
    logger.info(f"Session saved for {username}")


def _load_session(username: str) -> Optional[dict]:
    path = _session_path(username)
    if path.exists():
        try:
            return json.loads(path.read_text())
        except Exception:
            return None
    return None


def _get_client(username: str) -> Client:
    """Return a logged-in Client for username, or raise 401."""
    if username in _clients:
        return _clients[username]
    # Try to restore from saved session
    settings = _load_session(username)
    if settings:
        cl = Client()
        cl.set_settings(settings)
        try:
            cl.get_timeline_feed()  # lightweight check
            _clients[username] = cl
            logger.info(f"Session restored for {username}")
            return cl
        except Exception:
            logger.warning(f"Saved session for {username} is stale, removing")
            _session_path(username).unlink(missing_ok=True)
    raise HTTPException(status_code=401, detail=f"Not logged in as {username}. Call /login first.")


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------
class LoginRequest(BaseModel):
    username: str
    password: str
    verification_code: Optional[str] = None


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------
@app.get("/health")
def health():
    return {"status": "ok", "sessions": list(_clients.keys())}


@app.post("/login", dependencies=[Depends(require_api_key)])
def login(req: LoginRequest):
    cl = Client()

    # Try to restore existing session first
    settings = _load_session(req.username)
    if settings:
        cl.set_settings(settings)
        try:
            cl.get_timeline_feed()
            _clients[req.username] = cl
            logger.info(f"Reused existing session for {req.username}")
            return {"success": True, "username": req.username, "requires_2fa": False, "message": "Session reused"}
        except Exception:
            logger.info(f"Stale session for {req.username}, re-logging in")
            cl = Client()

    try:
        if req.verification_code:
            # 2FA login
            cl.login(req.username, req.password, verification_code=req.verification_code)
        else:
            cl.login(req.username, req.password)

        _clients[req.username] = cl
        _save_session(cl, req.username)
        return {"success": True, "username": req.username, "requires_2fa": False, "message": "Logged in successfully"}

    except TwoFactorRequired:
        logger.info(f"2FA required for {req.username}")
        # Store partial client for 2FA completion
        _clients[f"__2fa_{req.username}"] = cl
        return {"success": False, "username": req.username, "requires_2fa": True, "message": "2FA verification required"}

    except BadPassword:
        raise HTTPException(status_code=401, detail="Invalid username or password")

    except ChallengeRequired as e:
        raise HTTPException(status_code=403, detail=f"Instagram challenge required: {e}")

    except Exception as e:
        logger.error(f"Login error for {req.username}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/logout/{username}", dependencies=[Depends(require_api_key)])
def logout(username: str):
    cl = _clients.pop(username, None)
    _clients.pop(f"__2fa_{username}", None)
    _session_path(username).unlink(missing_ok=True)
    if cl:
        try:
            cl.logout()
        except Exception:
            pass
    return {"success": True}


@app.get("/user/{username}", dependencies=[Depends(require_api_key)])
def get_user_info(username: str, logged_in_as: str = Query(...)):
    cl = _get_client(logged_in_as)
    try:
        user = cl.user_info_by_username(username)
        return {
            "username": user.username,
            "full_name": user.full_name,
            "biography": user.biography or "",
            "follower_count": user.follower_count,
            "following_count": user.following_count,
            "media_count": user.media_count,
            "profile_pic_url": str(user.profile_pic_url) if user.profile_pic_url else "",
            "is_private": user.is_private,
            "is_verified": user.is_verified,
            "external_url": str(user.external_url) if user.external_url else "",
        }
    except UserNotFound:
        raise HTTPException(status_code=404, detail=f"User {username} not found")
    except LoginRequired:
        _clients.pop(logged_in_as, None)
        raise HTTPException(status_code=401, detail=f"Session expired for {logged_in_as}")
    except Exception as e:
        logger.error(f"get_user_info error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/user/{username}/posts", dependencies=[Depends(require_api_key)])
def get_user_posts(username: str, logged_in_as: str = Query(...), limit: int = Query(12)):
    cl = _get_client(logged_in_as)
    try:
        user_id = cl.user_id_from_username(username)
        medias = cl.user_medias(user_id, amount=limit)
        result = []
        for m in medias:
            result.append({
                "id": str(m.pk),
                "media_type": m.media_type,
                "thumbnail_url": str(m.thumbnail_url) if m.thumbnail_url else (str(m.resources[0].thumbnail_url) if m.resources else ""),
                "caption": m.caption_text or "",
                "like_count": m.like_count,
                "comment_count": m.comment_count,
                "taken_at": m.taken_at.isoformat() if m.taken_at else "",
                "play_count": getattr(m, "play_count", None),
            })
        return result
    except LoginRequired:
        _clients.pop(logged_in_as, None)
        raise HTTPException(status_code=401, detail=f"Session expired for {logged_in_as}")
    except Exception as e:
        logger.error(f"get_user_posts error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/media/{media_id}/insights", dependencies=[Depends(require_api_key)])
def get_media_insights(media_id: str, logged_in_as: str = Query(...)):
    cl = _get_client(logged_in_as)
    try:
        insights = cl.insights_media_feed_all(media_id)
        # insights is a dict from instagrapi
        return {
            "media_id": media_id,
            "like_count": insights.get("likes", 0),
            "comment_count": insights.get("comments", 0),
            "play_count": insights.get("plays"),
            "reach": insights.get("reach"),
            "impressions": insights.get("impressions"),
            "saved": insights.get("saved"),
        }
    except LoginRequired:
        _clients.pop(logged_in_as, None)
        raise HTTPException(status_code=401, detail=f"Session expired for {logged_in_as}")
    except Exception as e:
        logger.error(f"get_media_insights error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("INSTAGRAPI_PORT", 8001))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)
