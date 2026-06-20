from __future__ import annotations
import logging
from datetime import datetime, timedelta, timezone
from typing import Optional

import httpx
from jose import JWTError, jwt
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

from config import get_settings
from models.user import UserProfile
from services.redis_service import redis_service
import bcrypt

logger = logging.getLogger(__name__)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))
    except Exception:
        return False

def get_password_hash(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')


def _settings():
    return get_settings()


# ── Google Token Verification ──────────────────────────────
async def verify_google_token(credential: str) -> dict:
    """Verify Google ID token and return its claims."""
    settings = _settings()
    try:
        info = id_token.verify_oauth2_token(
            credential,
            google_requests.Request(),
            settings.google_client_id,
            clock_skew_in_seconds=3600  # 1 hour tolerance for local VM clock skews
        )
        return info
    except Exception as e:
        logger.error(f"Google token verification failed: {e}")
        raise ValueError(f"Invalid Google credential: {e}")


# ── JWT Helpers ────────────────────────────────────────────
def create_access_token(uid: str) -> str:
    settings = _settings()
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.jwt_expire_minutes)
    payload = {"sub": uid, "exp": expire, "iat": datetime.now(timezone.utc)}
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> Optional[str]:
    """Return uid from JWT, or None if invalid."""
    settings = _settings()
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
        uid: Optional[str] = payload.get("sub")
        return uid
    except JWTError:
        return None


# ── User Management ────────────────────────────────────────
async def get_or_create_user(google_info: dict) -> UserProfile:
    uid: str = google_info["sub"]
    from services.db_service import db_service
    existing = await db_service.get_user(uid)

    if existing:
        profile = UserProfile(**existing)
    else:
        profile = UserProfile(
            uid=uid,
            email=google_info.get("email", ""),
            display_name=google_info.get("name", ""),
            photo_url=google_info.get("picture", ""),
        )
        await db_service.save_user(uid, profile.model_dump())

    return profile


async def get_user_profile(uid: str) -> Optional[UserProfile]:
    from services.db_service import db_service
    data = await db_service.get_user(uid)
    if not data:
        return None
    try:
        return UserProfile(**data)
    except Exception as e:
        logger.error(f"Failed to parse UserProfile: {e} | data={data}")
        return None
