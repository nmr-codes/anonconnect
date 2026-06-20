from __future__ import annotations
from typing import Literal, Optional, List
from pydantic import BaseModel, Field
from datetime import datetime
import uuid


# ──────────────────────────────────────────────
# WebSocket message types (Client → Server)
# ──────────────────────────────────────────────

class WSFindMatch(BaseModel):
    type: Literal["find_match"] = "find_match"


class WSCancelMatch(BaseModel):
    type: Literal["cancel_match"] = "cancel_match"


class WSMessage(BaseModel):
    type: Literal["message"] = "message"
    text: str = Field(..., min_length=1, max_length=2000)


class WSTyping(BaseModel):
    type: Literal["typing"] = "typing"
    is_typing: bool


class WSReact(BaseModel):
    type: Literal["react"] = "react"
    message_id: str
    reaction: str


class WSEndChat(BaseModel):
    type: Literal["end_chat"] = "end_chat"


class WSPing(BaseModel):
    type: Literal["ping"] = "ping"


# ──────────────────────────────────────────────
# Server → Client event payloads
# ──────────────────────────────────────────────

class ChatMessage(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    session_id: str
    sender_uid: str
    text: str
    timestamp: float = Field(default_factory=lambda: datetime.utcnow().timestamp())
    reaction: Optional[str] = None


class ChatSession(BaseModel):
    session_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    uid1: str
    uid2: str
    created_at: float = Field(default_factory=lambda: datetime.utcnow().timestamp())
    active: bool = True


class QueueEntry(BaseModel):
    uid: str
    interests: List[str]
    joined_at: float = Field(default_factory=lambda: datetime.utcnow().timestamp())
