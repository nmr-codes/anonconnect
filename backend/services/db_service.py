from typing import Optional, Dict, Any, List
from sqlalchemy.future import select
from sqlalchemy import update
from database import AsyncSessionLocal
from models.db_models import UserDB, MessageDB
import json

class DBService:
    async def save_user(self, uid: str, data: Dict[str, Any]) -> None:
        async with AsyncSessionLocal() as session:
            # Check if user exists
            stmt = select(UserDB).where(UserDB.uid == uid)
            result = await session.execute(stmt)
            existing = result.scalar_one_or_none()

            if existing:
                for key, value in data.items():
                    setattr(existing, key, value)
            else:
                user = UserDB(**data)
                session.add(user)

            await session.commit()

    async def update_user(self, uid: str, fields: Dict[str, Any]) -> None:
        if not fields:
            return
        async with AsyncSessionLocal() as session:
            stmt = update(UserDB).where(UserDB.uid == uid).values(**fields)
            await session.execute(stmt)
            await session.commit()

    async def get_user(self, uid: str) -> Optional[Dict[str, Any]]:
        async with AsyncSessionLocal() as session:
            stmt = select(UserDB).where(UserDB.uid == uid)
            result = await session.execute(stmt)
            user = result.scalar_one_or_none()
            if not user:
                return None
            return {
                "uid": user.uid,
                "email": user.email,
                "display_name": user.display_name,
                "photo_url": user.photo_url,
                "age": user.age,
                "gender": user.gender,
                "interests": user.interests or [],
                "bio": user.bio,
                "looking_for": user.looking_for,
                "hashed_password": user.hashed_password,
                "onboarded": user.onboarded,
                "created_at": user.created_at,
            }

    async def get_uid_by_email(self, email: str) -> Optional[str]:
        async with AsyncSessionLocal() as session:
            stmt = select(UserDB.uid).where(UserDB.email == email)
            result = await session.execute(stmt)
            return result.scalar_one_or_none()

    async def save_message(self, session_id: str, msg_data: Dict[str, Any]) -> None:
        async with AsyncSessionLocal() as session:
            msg = MessageDB(
                id=msg_data["id"],
                session_id=session_id,
                sender_uid=msg_data["sender_uid"],
                text=msg_data["text"],
                timestamp=msg_data["timestamp"]
            )
            session.add(msg)
            await session.commit()

    async def get_messages(self, session_id: str, limit: int = 50) -> List[Dict[str, Any]]:
        async with AsyncSessionLocal() as session:
            stmt = select(MessageDB).where(MessageDB.session_id == session_id).order_by(MessageDB.timestamp.asc()).limit(limit)
            result = await session.execute(stmt)
            messages = result.scalars().all()
            return [
                {
                    "id": m.id,
                    "session_id": m.session_id,
                    "sender_uid": m.sender_uid,
                    "text": m.text,
                    "timestamp": m.timestamp
                } for m in messages
            ]

db_service = DBService()
