import asyncio
from backend.services.redis_service import redis_service

async def try_create_session(uid1: str, uid2: str):
    score1 = await redis_service.client.zscore("queue", uid1)
    score2 = await redis_service.client.zscore("queue", uid2)
    if not score1 or not score2:
        return None
        
    pipe = redis_service.client.pipeline(transaction=True)
    pipe.zrem("queue", uid1)
    pipe.zrem("queue", uid2)
    res = await pipe.execute()
    
    if res[0] and res[1]:
        return "SUCCESS"
        
    pipe = redis_service.client.pipeline(transaction=True)
    if res[0]:
        pipe.zadd("queue", {uid1: score1})
    if res[1]:
        pipe.zadd("queue", {uid2: score2})
    if res[0] or res[1]:
        await pipe.execute()
    return None

async def main():
    await redis_service.connect()
    await redis_service.join_queue("user1", {"name": "u1"})
    await redis_service.join_queue("user2", {"name": "u2"})
    
    res = await try_create_session("user1", "user2")
    print(f"Result: {res}")
    
asyncio.run(main())
