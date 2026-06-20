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
    try_create_session, end_session, get_queue_count,
    get_random_ice_breaker, get_common_interests, make_public_profile,
)

router = APIRouter()
logger = logging.getLogger(__name__)

# Global connection registry: uid → set[WebSocket]
# For multi-instance deployments, replace with Redis Pub/Sub
active_connections: dict[str, set[WebSocket]] = {}


async def send_json(ws: WebSocket, data: dict) -> None:
    """Safe JSON send — silently ignores closed connections."""
    try:
        await ws.send_json(data)
    except Exception:
        pass


async def send_to_user(uid: str, data: dict) -> None:
    wss = active_connections.get(uid)
    if wss:
        for ws in list(wss):
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
    if uid not in active_connections:
        active_connections[uid] = set()
    active_connections[uid].add(websocket)
    
    await redis_service.set_online(uid)
    logger.info(f"WS connected: {uid}")

    # State for this connection
    current_session_id: Optional[str] = None
    partner_uid: Optional[str] = None
    searching: bool = False
    heartbeat_task: Optional[asyncio.Task] = None

    # Check for active session for seamless reconnection
    sid = await redis_service.get_user_session(uid)
    if sid:
        sdata = await redis_service.get_session(sid)
        if sdata:
            current_session_id = sid
            partner_uid = sdata["uid2"] if sdata["uid1"] == uid else sdata["uid1"]
            
            partner_profile = await get_user_profile(partner_uid)
            partner_public = make_public_profile(partner_profile).model_dump() if partner_profile else {}
            
            from services.db_service import db_service
            history = await db_service.get_messages(current_session_id, limit=50)
            
            await send_json(websocket, {
                "type": "reconnected",
                "session_id": current_session_id,
                "partner": partner_public,
                "messages": history,
                "user": profile.model_dump(),
                "online_count": await redis_service.online_count(),
            })
    
    if not current_session_id:
        # Normal welcome
        await send_json(websocket, {
            "type": "connected",
            "user": profile.model_dump(),
            "online_count": await redis_service.online_count(),
        })

    async def heartbeat():
        while True:
            await asyncio.sleep(20)
            await redis_service.set_online(uid)
            await send_json(websocket, {"type": "pong"})

    heartbeat_task = asyncio.create_task(heartbeat())

    async def _ensure_session():
        nonlocal current_session_id, partner_uid
        if not current_session_id or not partner_uid:
            sid = await redis_service.get_user_session(uid)
            if sid:
                sdata = await redis_service.get_session(sid)
                if sdata:
                    current_session_id = sid
                    partner_uid = sdata["uid2"] if sdata["uid1"] == uid else sdata["uid1"]

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
                public_profile = make_public_profile(profile).model_dump()
                await add_to_queue(uid, public_profile)
                count = await get_queue_count()
                await send_json(websocket, {"type": "searching", "queue_count": count})
                await broadcast_queue_count()

                async def matchmaking_loop():
                    nonlocal current_session_id, partner_uid, searching
                    while searching:
                        try:
                            # Try to find a match
                            match_uid = await find_match(uid, public_profile)
                            if match_uid:
                                session = await try_create_session(uid, match_uid)
                                if session:
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
                                    break
                        except Exception as e:
                            logger.error(f"Matchmaking error for {uid}: {e}")
                        
                        await asyncio.sleep(1.0)
                
                asyncio.create_task(matchmaking_loop())

            # ── Cancel Match ──────────────────────────────
            elif msg_type == "cancel_match":
                searching = False
                await remove_from_queue(uid)
                await send_json(websocket, {"type": "cancelled"})
                await broadcast_queue_count()

            # ── Chat Message ──────────────────────────────
            elif msg_type == "message":
                try:
                    await _ensure_session()
                except Exception as e:
                    await send_json(websocket, {"type": "error", "message": f"Ensure session exception: {str(e)}"})
                    continue

                if not current_session_id or not partner_uid:
                    sid = await redis_service.get_user_session(uid)
                    sdata = await redis_service.get_session(sid) if sid else None
                    await send_json(websocket, {"type": "error", "message": f"Debug: uid={uid}, sid={sid}, sdata={sdata}"})
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
                await _ensure_session()
                if not current_session_id or not partner_uid:
                    continue
                is_typing: bool = bool(data.get("is_typing", False))
                await redis_service.set_typing(current_session_id, uid, is_typing)
                await send_to_user(partner_uid, {"type": "typing", "is_typing": is_typing})

            # ── Emoji Reaction ────────────────────────────
            elif msg_type == "react":
                await _ensure_session()
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
                await _ensure_session()
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
        searching = False  # Critical: Kill orphaned matchmaking loops
        if heartbeat_task:
            heartbeat_task.cancel()
            
        if uid in active_connections:
            active_connections[uid].discard(websocket)
            if not active_connections[uid]:
                del active_connections[uid]
                await redis_service.set_offline(uid)
                await remove_from_queue(uid)
                
                # Only end session if all devices disconnected
                if current_session_id and partner_uid:
                    await end_session(current_session_id)
                    await send_to_user(partner_uid, {"type": "partner_left"})

        await broadcast_queue_count()
        logger.info(f"WS cleanup done: {uid}")
