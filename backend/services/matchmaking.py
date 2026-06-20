from __future__ import annotations
import random
import logging
import uuid
from typing import Optional

from models.user import UserProfile, PublicProfile
from models.chat import ChatSession
from services.redis_service import redis_service

logger = logging.getLogger(__name__)

INTERESTS = [
    "Music", "Gaming", "Movies", "Books", "Travel", "Cooking", "Fitness",
    "Photography", "Art", "Technology", "Science", "Sports", "Fashion",
    "Nature", "Anime", "Coding", "Design", "Yoga", "Dancing", "Writing",
    "Podcasts", "History", "Politics", "Finance", "Languages", "Pets",
    "Cars", "Space", "Psychology", "Philosophy",
]

ICE_BREAKERS = [
    "What's the most interesting place you've ever visited?",
    "If you could have dinner with any historical figure, who would it be?",
    "What's your all-time favorite movie or TV show?",
    "What skill do you wish you had but don't?",
    "What's the last book you read that you'd recommend?",
    "If you could live anywhere in the world, where would it be?",
    "What's your go-to comfort food after a tough day?",
    "What hobby have you recently picked up or want to try?",
    "Tell me one surprising fun fact about yourself!",
    "If you could time travel, where/when would you go?",
    "What's your unpopular opinion that you'd defend?",
    "What does your ideal weekend look like?",
]


def get_random_ice_breaker() -> str:
    return random.choice(ICE_BREAKERS)


def get_common_interests(a: list[str], b: list[str]) -> list[str]:
    return [i for i in a if i in b]


def make_public_profile(profile: UserProfile) -> PublicProfile:
    return PublicProfile(
        age=profile.age,
        gender=profile.gender,
        interests=profile.interests,
        looking_for=profile.looking_for,
    )


async def add_to_queue(uid: str, interests: list[str]) -> None:
    await redis_service.join_queue(uid, interests)
    logger.info(f"User {uid} joined queue")


async def remove_from_queue(uid: str) -> None:
    await redis_service.leave_queue(uid)
    logger.info(f"User {uid} left queue")


async def find_match(uid: str, my_interests: list[str]) -> Optional[str]:
    """
    Try to find a matching user from the queue.
    Priority: shared interests → oldest in queue (fallback).
    """
    members = await redis_service.get_queue_members()
    candidates = [m for m in members if m != uid]

    if not candidates:
        return None

    # Score candidates by shared interests
    scored: list[tuple[int, str]] = []
    for candidate_uid in candidates:
        their_interests = await redis_service.get_user_interests(candidate_uid)
        common = len(get_common_interests(my_interests, their_interests))
        scored.append((common, candidate_uid))

    scored.sort(key=lambda x: x[0], reverse=True)

    # Pick best match (with shared interests if any, else oldest in queue)
    best_score, best_uid = scored[0]
    if best_score > 0:
        return best_uid

    # No shared interests → pick the one who waited longest (first in sorted set)
    return candidates[0] if candidates else None


async def create_session(uid1: str, uid2: str) -> ChatSession:
    session = ChatSession(
        session_id=str(uuid.uuid4()),
        uid1=uid1,
        uid2=uid2,
    )
    # Remove both from queue
    await redis_service.leave_queue(uid1)
    await redis_service.leave_queue(uid2)
    # Store session
    await redis_service.create_session(session.session_id, uid1, uid2)
    logger.info(f"Session {session.session_id} created: {uid1} ↔ {uid2}")
    return session


async def end_session(session_id: str) -> Optional[tuple[str, str]]:
    session = await redis_service.get_session(session_id)
    if not session:
        return None
    uid1 = session.get("uid1", "")
    uid2 = session.get("uid2", "")
    await redis_service.end_session(session_id, uid1, uid2)
    logger.info(f"Session {session_id} ended")
    return uid1, uid2


async def get_queue_count() -> int:
    return await redis_service.queue_count()
