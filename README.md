# LingoGen 💬

> LingoGen — Interactive language exchange matchmaking using **Next.js + FastAPI + WebSockets + Redis**

---

## Architecture

```
Browser (Next.js 14 + TypeScript)
    │
    ├── REST  POST /auth/google     → verify Google token → JWT
    ├── REST  GET/PATCH /api/profile/me
    └── WS    ws://localhost:8000/ws?token=<jwt>
                  │
              FastAPI (Python 3.12+)
                  │
              Redis   (queue, sessions, messages, typing, presence)
```

---

## Quick Start

### Prerequisites
```bash
# Redis
sudo apt install redis-server   # Ubuntu/Debian
# or: brew install redis         # macOS

# Python 3.10+
python3 --version

# Node.js 18+
node --version
```

### 1 — Google Cloud Setup
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create project → **APIs & Services → Credentials → Create OAuth 2.0 Client ID**
3. Application type: **Web application**
4. Authorized JavaScript origins: `http://localhost:3000`
5. Copy the **Client ID**

### 2 — Backend Setup
```bash
cd backend

# Create env
cp .env.example .env
# Edit .env → set GOOGLE_CLIENT_ID and JWT_SECRET

# Install deps
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 3 — Frontend Setup
```bash
# In the project root
cp .env.local.example .env.local
# Edit .env.local → set NEXT_PUBLIC_GOOGLE_CLIENT_ID

npm install
```

### 4 — Run Everything
```bash
# Terminal 1: Redis
redis-server

# Terminal 2: FastAPI backend
cd backend && source .venv/bin/activate
uvicorn main:app --reload --port 8000

# Terminal 3: Next.js frontend
npm run dev
```

Open **http://localhost:3000**

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/auth/google` | Exchange Google ID token for JWT |
| `GET` | `/api/profile/me` | Get own profile |
| `PATCH` | `/api/profile/me` | Update profile |
| `GET` | `/api/online-count` | Get online/searching counts |
| `WS` | `/ws?token=<jwt>` | Real-time chat connection |
| `GET` | `/docs` | FastAPI Swagger UI |
| `GET` | `/health` | Health check |

## WebSocket Events

**Client → Server:**
```json
{"type": "find_match"}
{"type": "cancel_match"}
{"type": "message", "text": "Hello!"}
{"type": "typing", "is_typing": true}
{"type": "react", "message_id": "...", "reaction": "❤️"}
{"type": "end_chat"}
{"type": "ping"}
```

**Server → Client:**
```json
{"type": "connected", "user": {...}, "online_count": 120}
{"type": "searching", "queue_count": 5}
{"type": "matched", "session_id": "...", "partner": {...}, "common_interests": [...], "ice_breaker": "..."}
{"type": "message", "id": "...", "text": "...", "sender": "me|stranger", "timestamp": 1234567890}
{"type": "typing", "is_typing": true}
{"type": "reaction", "message_id": "...", "reaction": "❤️"}
{"type": "partner_left"}
{"type": "queue_update", "count": 7}
{"type": "pong"}
```

---

## Features
- 🎭 **Fully Anonymous** — shown as "Stranger", no name revealed
- 🎯 **Interest Matching** — 30 categories, shared-first algorithm
- ⚡ **Instant WebSocket chat** — sub-100ms latency
- 💡 **Ice Breakers** — 12 random conversation starters
- ⌨️ **Typing Indicators** — real-time with Redis TTL
- 😂 **Emoji Reactions** — react to any message
- ⏭ **Skip / Next** — one-click new partner
- 🔄 **Auto-reconnect** — WS client reconnects with backoff
- 🛡️ **JWT Auth** — 7-day tokens, validated on every WS connection
- 💓 **Heartbeat** — 20s ping keeps connections alive

---

## Project Structure
```
LingoGen/
├── app/                    ← Next.js pages (App Router)
│   ├── page.tsx            ← Landing page
│   ├── auth/page.tsx       ← Google Sign-In
│   ├── setup/page.tsx      ← 3-step profile wizard
│   ├── chat/page.tsx       ← Main chat (WS-powered)
│   └── profile/page.tsx    ← View/edit profile
├── components/
│   ├── AuthProvider.tsx    ← JWT auth context
│   ├── Navbar.tsx
│   ├── MessageBubble.tsx
│   ├── MatchmakingSpinner.tsx
│   └── InterestSelector.tsx
├── lib/
│   ├── api.ts              ← REST client (fetch + JWT)
│   ├── websocket.ts        ← AnonSocket class (auto-reconnect)
│   └── constants.ts        ← Interests, ice breakers
└── backend/
    ├── main.py             ← FastAPI app entry
    ├── config.py           ← Pydantic Settings
    ├── models/
    │   ├── user.py         ← UserProfile, AuthResponse
    │   └── chat.py         ← ChatMessage, ChatSession, WS types
    ├── services/
    │   ├── redis_service.py ← Async Redis helpers
    │   ├── auth_service.py  ← Google verify + JWT
    │   └── matchmaking.py   ← Queue + session logic
    └── routers/
        ├── auth.py          ← POST /auth/google
        ├── profile.py       ← GET/PATCH /api/profile/me
        └── ws.py            ← WebSocket /ws
```
