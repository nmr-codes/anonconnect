from sqlalchemy import Column, String, Integer, Boolean, Float, Text
from sqlalchemy.dialects.postgresql import JSONB
from database import Base
from datetime import datetime

class UserDB(Base):
    __tablename__ = "users"

    uid = Column(String, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    display_name = Column(String, default="")
    photo_url = Column(String, default="")
    age = Column(Integer, nullable=True)
    gender = Column(String, nullable=True)
    interests = Column(JSONB, default=list)
    bio = Column(String, default="")
    looking_for = Column(String, default="")
    hashed_password = Column(String, nullable=True)
    onboarded = Column(Boolean, default=False)
    created_at = Column(Float, default=lambda: datetime.utcnow().timestamp())


class MessageDB(Base):
    __tablename__ = "messages"

    id = Column(String, primary_key=True, index=True)
    session_id = Column(String, index=True, nullable=False)
    sender_uid = Column(String, index=True, nullable=False)
    text = Column(Text, nullable=False)
    timestamp = Column(Float, default=lambda: datetime.utcnow().timestamp())
