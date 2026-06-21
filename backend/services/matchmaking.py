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
        native_language=profile.native_language,
        learning_language=profile.learning_language,
        interests=profile.interests,
        looking_for=profile.looking_for,
    )


async def add_to_queue(uid: str, public_profile: dict) -> None:
    await redis_service.join_queue(uid, public_profile)
    logger.info(f"User {uid} joined queue")


async def remove_from_queue(uid: str) -> None:
    await redis_service.leave_queue(uid)
    logger.info(f"User {uid} left queue")


async def find_match(uid: str, my_profile: dict) -> Optional[str]:
    import time
    members = await redis_service.get_queue_members_with_scores()
    candidates = [m for m in members if m[0] != uid]

    if not candidates:
        return None

    my_native = my_profile.get("native_language")
    my_learning = my_profile.get("learning_language")
    my_interests = my_profile.get("interests", [])
    my_intent = my_profile.get("looking_for")
    my_age = my_profile.get("age")

    scored: list[tuple[int, str, float]] = []
    
    for candidate_uid, joined_at in candidates:
        their_profile = await redis_service.get_queue_profile(candidate_uid)
        if not their_profile:
            # Ghost user! Clean up.
            await redis_service.leave_queue(candidate_uid)
            continue
            
        score = 0
        
        # 1. Language Exchange Bonus (+50)
        their_native = their_profile.get("native_language")
        their_learning = their_profile.get("learning_language")
        if (my_native and my_native != "None" and their_learning and their_learning != "None" and my_native == their_learning) and \
           (my_learning and my_learning != "None" and their_native and their_native != "None" and my_learning == their_native):
            score += 50
            
        # 2. Shared Interests (+10 each)
        their_interests = their_profile.get("interests", [])
        common = get_common_interests(my_interests, their_interests)
        score += len(common) * 10
        
        # 3. Intent Match (+20)
        their_intent = their_profile.get("looking_for")
        if my_intent and their_intent and my_intent == their_intent:
            score += 20
            
        # 4. Age Proximity (+5)
        their_age = their_profile.get("age")
        if my_age and their_age and abs(my_age - their_age) <= 5:
            score += 5
            
        scored.append((score, candidate_uid, joined_at))

    scored.sort(key=lambda x: x[0], reverse=True)
    best_score, best_uid, best_joined_at = scored[0]

    if best_score > 0:
        return best_uid

    # No matches. Enforce a 5-second wait before allowing a 0-score match
    # Find the candidate who has waited the longest
    oldest_candidate = min(scored, key=lambda x: x[2])
    wait_time = time.time() - oldest_candidate[2]
    
    if wait_time > 5.0:
        return oldest_candidate[1]
        
    return None


async def try_create_session(uid1: str, uid2: str) -> Optional[ChatSession]:
    # Atomically check if both are in queue, and if so, remove them.
    # Uses pure python with rollback to support fakeredis without lua scripting errors.
    score1 = await redis_service.client.zscore("queue", uid1)
    score2 = await redis_service.client.zscore("queue", uid2)
    
    if not score1 or not score2:
        return None
        
    pipe = redis_service.client.pipeline(transaction=True)
    pipe.zrem("queue", uid1)
    pipe.zrem("queue", uid2)
    res = await pipe.execute()
    
    if res[0] and res[1]:
        session = ChatSession(
            session_id=str(uuid.uuid4()),
            uid1=uid1,
            uid2=uid2,
        )
        # Store session
        await redis_service.create_session(session.session_id, uid1, uid2)
        logger.info(f"Session {session.session_id} created: {uid1} ↔ {uid2}")
        return session
        
    # Rollback if we lost the race!
    pipe = redis_service.client.pipeline(transaction=True)
    if res[0]:
        pipe.zadd("queue", {uid1: score1})
    if res[1]:
        pipe.zadd("queue", {uid2: score2})
    if res[0] or res[1]:
        await pipe.execute()
        
    return None


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
