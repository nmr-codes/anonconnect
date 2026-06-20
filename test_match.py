import asyncio
from services.redis_service import redis_service
from services.matchmaking import find_match, try_create_session

async def simulate():
    await redis_service.connect()
    # add A
    await redis_service.join_queue("A", {"name": "A"})
    await asyncio.sleep(2)
    # add B
    await redis_service.join_queue("B", {"name": "B"})
    
    match_uid = await find_match("B", {"name": "B"})
    print(f"B found match: {match_uid}")
    
    await asyncio.sleep(4)
    match_uid = await find_match("B", {"name": "B"})
    print(f"B found match after 4s: {match_uid}")
    
    if match_uid:
        sess = await try_create_session("B", match_uid)
        print(f"Session created: {sess}")

asyncio.run(simulate())
