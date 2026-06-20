from __future__ import annotations
import asyncio
import json
import logging
import uuid
from typing import Optional

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, status

from services.auth_service import decode_access_token, get_user_profile
from services.redis_service import redis_service
from services.matchmaking import (
    add_to_queue, remove_from_queue, find_match,
    create_session, end_session, get_queue_count,
    get_random_ice_breaker, get_common_interests, make_public_profile,
)

router = APIRouter()
logger = logging.getLogger(__name__)

# Global connection registry: uid → WebSocket
# For multi-instance deployments, replace with Redis Pub/Sub
active_connections: dict[str, WebSocket] = {}


async def send_json(ws: WebSocket, data: dict) -> None:
    """Safe JSON send — silently ignores closed connections."""
    try:
        await ws.send_json(data)
    except Exception:
        pass


async def send_to_user(uid: str, data: dict) -> None:
    ws = active_connections.get(uid)
    if ws:
        await send_json(ws, data)


async def broadcast_queue_count() -> None:
    """Push queue size update to all searching users."""
    count = await get_queue_count()
    members = await redis_service.get_queue_members()
    for uid in members:
        await send_to_user(uid, {"type": "queue_update", "count": count})


# ── WebSocket Handler ──────────────────────────────────────
@router.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    token: str = Query(...),
):
    # 1. Authenticate
    uid = decode_access_token(token)
    if not uid:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    profile = await get_user_profile(uid)
    if not profile:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    await websocket.accept()
    active_connections[uid] = websocket
    await redis_service.set_online(uid)
    logger.info(f"WS connected: {uid}")

    # Send welcome
    await send_json(websocket, {
        "type": "connected",
        "user": profile.model_dump(),
        "online_count": await redis_service.online_count(),
    })

    # State for this connection
    current_session_id: Optional[str] = None
    partner_uid: Optional[str] = None
    searching: bool = False
    heartbeat_task: Optional[asyncio.Task] = None

    async def heartbeat():
        while True:
            await asyncio.sleep(20)
            await redis_service.set_online(uid)
            await send_json(websocket, {"type": "pong"})

    heartbeat_task = asyncio.create_task(heartbeat())

    try:
        while True:
            raw = await websocket.receive_text()
            try:
                data = json.loads(raw)
            except json.JSONDecodeError:
                await send_json(websocket, {"type": "error", "message": "Invalid JSON"})
                continue

            msg_type: str = data.get("type", "")

            # ── Ping ──────────────────────────────────────
            if msg_type == "ping":
                await send_json(websocket, {"type": "pong"})

            # ── Find Match ────────────────────────────────
            elif msg_type == "find_match":
                if current_session_id:
                    await send_json(websocket, {"type": "error", "message": "Already in a chat"})
                    continue

                searching = True
                my_interests = profile.interests or []
                await add_to_queue(uid, my_interests)
                count = await get_queue_count()
                await send_json(websocket, {"type": "searching", "queue_count": count})
                await broadcast_queue_count()

                # Try to find a match immediately
                match_uid = await find_match(uid, my_interests)
                if match_uid:
                    session = await create_session(uid, match_uid)
                    current_session_id = session.session_id
                    partner_uid = match_uid
                    searching = False

                    # Load partner profile
                    partner_profile = await get_user_profile(match_uid)
                    common = get_common_interests(my_interests, partner_profile.interests if partner_profile else [])
                    ice = get_random_ice_breaker()
                    partner_public = make_public_profile(partner_profile).model_dump() if partner_profile else {}

                    match_payload = {
                        "type": "matched",
                        "session_id": session.session_id,
                        "partner": partner_public,
                        "common_interests": common,
                        "ice_breaker": ice,
                    }

                    # Notify both
                    await send_json(websocket, match_payload)
                    await send_to_user(match_uid, {
                        **match_payload,
                        "partner": make_public_profile(profile).model_dump(),
                    })
                    await broadcast_queue_count()

            # ── Cancel Match ──────────────────────────────
            elif msg_type == "cancel_match":
                searching = False
                await remove_from_queue(uid)
                await send_json(websocket, {"type": "cancelled"})
                await broadcast_queue_count()

            # ── Chat Message ──────────────────────────────
            elif msg_type == "message":
                if not current_session_id or not partner_uid:
                    await send_json(websocket, {"type": "error", "message": "Not in a session"})
                    continue

                text = str(data.get("text", "")).strip()
                if not text:
                    continue

                msg_id = str(uuid.uuid4())
                import time
                timestamp = time.time()

                message_data = {
                    "id": msg_id,
                    "session_id": current_session_id,
                    "text": text,
                    "timestamp": timestamp,
                }

                # Save to Postgres
                from services.db_service import db_service
                await db_service.save_message(current_session_id, {
                    **message_data,
                    "sender_uid": uid,
                })

                # Send to sender (as "me")
                await send_json(websocket, {**message_data, "type": "message", "sender": "me"})

                # Send to partner (as "stranger")
                await send_to_user(partner_uid, {**message_data, "type": "message", "sender": "stranger"})

            # ── Typing ────────────────────────────────────
            elif msg_type == "typing":
                if not current_session_id or not partner_uid:
                    continue
                is_typing: bool = bool(data.get("is_typing", False))
                await redis_service.set_typing(current_session_id, uid, is_typing)
                await send_to_user(partner_uid, {"type": "typing", "is_typing": is_typing})

            # ── Emoji Reaction ────────────────────────────
            elif msg_type == "react":
                if not current_session_id or not partner_uid:
                    continue
                msg_id = data.get("message_id", "")
                reaction = data.get("reaction", "")
                if msg_id and reaction:
                    payload = {"type": "reaction", "message_id": msg_id, "reaction": reaction}
                    await send_json(websocket, payload)
                    await send_to_user(partner_uid, payload)

            # ── End Chat ──────────────────────────────────
            elif msg_type == "end_chat":
                if current_session_id and partner_uid:
                    await end_session(current_session_id)
                    await send_json(websocket, {"type": "chat_ended"})
                    await send_to_user(partner_uid, {"type": "partner_left"})
                    current_session_id = None
                    partner_uid = None
                searching = False
                await remove_from_queue(uid)

            else:
                await send_json(websocket, {"type": "error", "message": f"Unknown type: {msg_type}"})

    except WebSocketDisconnect:
        logger.info(f"WS disconnected: {uid}")
    except Exception as e:
        logger.exception(f"WS error for {uid}: {e}")
    finally:
        # Cleanup
        if heartbeat_task:
            heartbeat_task.cancel()
        active_connections.pop(uid, None)
        await redis_service.set_offline(uid)
        await remove_from_queue(uid)

        if current_session_id and partner_uid:
            await end_session(current_session_id)
            await send_to_user(partner_uid, {"type": "partner_left"})

        await broadcast_queue_count()
        logger.info(f"WS cleanup done: {uid}")
