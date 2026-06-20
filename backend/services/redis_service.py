from __future__ import annotations
import json
import logging
from typing import Any, Optional
import redis.asyncio as aioredis
from config import get_settings

logger = logging.getLogger(__name__)

# Try real Redis first; fall back to in-memory fakeredis for local dev
def _make_client(url: str) -> aioredis.Redis:
    try:
        return aioredis.from_url(url, encoding="utf-8", decode_responses=True)
    except Exception:
        logger.warning("Could not create real Redis client — falling back to fakeredis")
        import fakeredis.aioredis as fakeredis  # type: ignore
        return fakeredis.FakeRedis(encoding="utf-8", decode_responses=True)


class RedisService:
    """Async Redis wrapper with typed helpers for AnonConnect."""

    def __init__(self) -> None:
        self._client: Optional[aioredis.Redis] = None

    async def connect(self) -> None:
        settings = get_settings()
        try:
            self._client = aioredis.from_url(
                settings.redis_url,
                encoding="utf-8",
                decode_responses=True,
                socket_connect_timeout=2,
            )
            await self._client.ping()
            logger.info("✅ Redis connected at %s", settings.redis_url)
        except Exception as e:
            logger.warning("⚠️  Real Redis unavailable (%s) — using in-memory fakeredis", e)
            import fakeredis.aioredis as _fakeredis  # type: ignore
            self._client = _fakeredis.FakeRedis(encoding="utf-8", decode_responses=True)
            logger.info("✅ fakeredis ready (dev mode — data resets on restart)")

    async def disconnect(self) -> None:
        if self._client:
            await self._client.aclose()
            logger.info("Redis disconnected")

    @property
    def client(self) -> aioredis.Redis:
        if not self._client:
            raise RuntimeError("Redis not connected — call connect() first")
        return self._client

    # ── User Profile ───────────────────────────────────────
    async def save_user(self, uid: str, data: dict[str, Any]) -> None:
        key = f"user:{uid}"
        flat: dict[str, str] = {}
        for k, v in data.items():
            if v is None:
                continue
            flat[k] = json.dumps(v) if isinstance(v, (list, dict, bool)) else str(v)
        await self.client.hset(key, mapping=flat)
        email = data.get("email")
        if email:
            await self.client.set(f"email_idx:{str(email).lower()}", uid)

    async def get_uid_by_email(self, email: str) -> Optional[str]:
        return await self.client.get(f"email_idx:{email.lower()}")

    async def get_user(self, uid: str) -> Optional[dict[str, Any]]:
        key = f"user:{uid}"
        raw = await self.client.hgetall(key)
        if not raw:
            return None
        result: dict[str, Any] = {}
        for k, v in raw.items():
            if v == "None":
                continue
            try:
                result[k] = json.loads(v)
            except (json.JSONDecodeError, ValueError):
                result[k] = v
        return result

    async def update_user(self, uid: str, fields: dict[str, Any]) -> None:
        key = f"user:{uid}"
        flat: dict[str, str] = {}
        for k, v in fields.items():
            if v is None:
                continue
            flat[k] = json.dumps(v) if isinstance(v, (list, dict, bool)) else str(v)
        if flat:
            await self.client.hset(key, mapping=flat)

    # ── Matchmaking Queue ──────────────────────────────────
    async def join_queue(self, uid: str, profile_data: dict[str, Any]) -> None:
        import time
        pipe = self.client.pipeline()
        pipe.zadd("queue", {uid: time.time()})
        pipe.set(f"queue_profile:{uid}", json.dumps(profile_data), ex=300)
        await pipe.execute()

    async def leave_queue(self, uid: str) -> None:
        pipe = self.client.pipeline()
        pipe.zrem("queue", uid)
        pipe.delete(f"queue_profile:{uid}")
        await pipe.execute()

    async def get_queue_members_with_scores(self) -> list[tuple[str, float]]:
        return await self.client.zrangebyscore("queue", "-inf", "+inf", withscores=True)

    async def queue_count(self) -> int:
        return await self.client.zcard("queue")

    async def get_queue_profile(self, uid: str) -> dict[str, Any]:
        raw = await self.client.get(f"queue_profile:{uid}")
        return json.loads(raw) if raw else {}

    # ── Sessions ───────────────────────────────────────────
    async def create_session(self, session_id: str, uid1: str, uid2: str) -> None:
        import time
        data = {
            "session_id": session_id,
            "uid1": uid1,
            "uid2": uid2,
            "created_at": str(time.time()),
            "active": "true",
        }
        pipe = self.client.pipeline()
        pipe.hset(f"session:{session_id}", mapping=data)
        pipe.expire(f"session:{session_id}", 86400)  # 24 hours TTL
        pipe.set(f"user_session:{uid1}", session_id, ex=86400)
        pipe.set(f"user_session:{uid2}", session_id, ex=86400)
        await pipe.execute()

    async def get_session(self, session_id: str) -> Optional[dict[str, Any]]:
        return await self.client.hgetall(f"session:{session_id}") or None

    async def end_session(self, session_id: str, uid1: str, uid2: str) -> None:
        pipe = self.client.pipeline()
        pipe.hset(f"session:{session_id}", "active", "false")
        pipe.delete(f"user_session:{uid1}")
        pipe.delete(f"user_session:{uid2}")
        await pipe.execute()

    async def get_user_session(self, uid: str) -> Optional[str]:
        return await self.client.get(f"user_session:{uid}")

    # ── Messages ───────────────────────────────────────────
    async def save_message(self, session_id: str, message: dict[str, Any]) -> None:
        key = f"messages:{session_id}"
        await self.client.lpush(key, json.dumps(message))
        await self.client.ltrim(key, 0, 99)  # Keep last 100
        await self.client.expire(key, 3600)

    async def get_messages(self, session_id: str) -> list[dict[str, Any]]:
        raw_list = await self.client.lrange(f"messages:{session_id}", 0, -1)
        msgs = [json.loads(r) for r in raw_list]
        return sorted(msgs, key=lambda m: m.get("timestamp", 0))

    # ── Typing Indicators ──────────────────────────────────
    async def set_typing(self, session_id: str, uid: str, is_typing: bool) -> None:
        key = f"typing:{session_id}:{uid}"
        if is_typing:
            await self.client.set(key, "1", ex=4)
        else:
            await self.client.delete(key)

    async def is_typing(self, session_id: str, uid: str) -> bool:
        return bool(await self.client.exists(f"typing:{session_id}:{uid}"))

    # ── Online Presence ────────────────────────────────────
    async def set_online(self, uid: str) -> None:
        await self.client.set(f"online:{uid}", "1", ex=30)

    async def set_offline(self, uid: str) -> None:
        await self.client.delete(f"online:{uid}")

    async def online_count(self) -> int:
        keys = await self.client.keys("online:*")
        return len(keys)


redis_service = RedisService()
