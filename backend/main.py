from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging

from config import get_settings
from services.redis_service import redis_service
from routers import auth, profile, ws

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s — %(message)s",
)
logger = logging.getLogger(__name__)


from database import init_db

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting LingoGen backend...")
    await redis_service.connect()
    await init_db()
    yield
    logger.info("Shutting down...")
    await redis_service.disconnect()


settings = get_settings()

app = FastAPI(
    title="LingoGen API",
    description="LingoGen — Interactive language exchange matchmaking backend",
    version="1.0.0",
    lifespan=lifespan,
)

origins = ["http://localhost:3000"]
if settings.frontend_url:
    origins.append(settings.frontend_url)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?|https://.*\.vercel\.app|https://(www\.)?lingogen\.me",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/auth", tags=["Auth"])
app.include_router(profile.router, prefix="/api", tags=["Profile"])
app.include_router(ws.router, tags=["WebSocket"])


@app.get("/health", tags=["Health"])
async def health():
    queue = await redis_service.queue_count()
    online = await redis_service.online_count()
    return {"status": "ok", "queue": queue, "online": online}
