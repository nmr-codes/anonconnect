# Goal Description

The goal is to revamp the AnonConnect matchmaking algorithm to combine the best features of Omegle (interest-based matching), and Speak Pal / HelloTalk (language-exchange matching). 

By upgrading the matching algorithm into a multi-factor weighted scoring system, we can provide users with much higher-quality connections.

> [!NOTE]
> This upgrade will require adding two new fields to the user profile (`native_language` and `learning_language`) and updating the frontend Setup flow to ask for these preferences.

## Proposed Hybrid Algorithm

The new matchmaking system will score potential partners based on a combination of factors. The higher the score, the better the match.

1. **Perfect Language Exchange (+50 points)**
   - If User A's `native_language` matches User B's `learning_language`, AND User B's `native_language` matches User A's `learning_language`, they get a massive score boost. This perfectly mimics HelloTalk and Speak Pal.
2. **Shared Interests (+10 points per interest)**
   - Mimicking Omegle, every shared interest significantly boosts the match score.
3. **Intent Match (+20 points)**
   - If both users have the same `looking_for` value (e.g. "Friendship", "Language Practice", "Dating"), they get a bonus.
4. **Age Proximity Bonus (+5 points)**
   - If users are within 5 years of age of each other, they get a small bonus to ensure more relatable conversations.

**Wait Threshold Logic:** Instead of instantly matching with a 0-score random person, the algorithm will try to wait for up to 10 seconds for a *good* match. If 10 seconds pass without a match, it will fallback to a completely random match (FIFO).

## User Review Required

> [!IMPORTANT]  
> Are there specific languages we should focus on, or should we just provide a standard list of the 20 most spoken languages (English, Spanish, French, Mandarin, etc.)?

> [!WARNING]
> Because we are adding new fields to the database, existing user profiles will have `null` for `native_language` and `learning_language`. Is it okay if the algorithm simply ignores the language bonus for older profiles until they update their settings?

## Proposed Changes

### Database & Backend Models

#### [MODIFY] [models/user.py](file:///home/lazy/Desktop/LingoGen/backend/models/user.py)
- Add `native_language: Optional[str]` and `learning_language: Optional[str]` to `UserProfile`, `UserProfileUpdate`, and `PublicProfile`.

#### [MODIFY] [models/db_models.py](file:///home/lazy/Desktop/LingoGen/backend/models/db_models.py)
- Add `native_language` and `learning_language` String columns to `UserDB`.

#### [MODIFY] [services/db_service.py](file:///home/lazy/Desktop/LingoGen/backend/services/db_service.py)
- Update `get_user` to return the new language fields.

---

### Matchmaking Engine

#### [MODIFY] [services/redis_service.py](file:///home/lazy/Desktop/LingoGen/backend/services/redis_service.py)
- Update `join_queue` to accept and store the entire `PublicProfile` payload instead of just a list of interests, so the matcher can calculate age, intent, and language scores instantly.

#### [MODIFY] [services/matchmaking.py](file:///home/lazy/Desktop/LingoGen/backend/services/matchmaking.py)
- Implement the weighted scoring algorithm inside `find_match`.
- Add the 10-second wait threshold logic: check the user's queue entry timestamp, and only allow 0-score matches if they have been waiting for > 10 seconds.

---

### Frontend Setup & Chat

#### [MODIFY] [app/setup/page.tsx](file:///home/lazy/Desktop/LingoGen/app/setup/page.tsx)
- Add a new setup step for users to select their Native Language and the Language they want to learn (or "None" if they just want to chat).

#### [MODIFY] [app/chat/page.tsx](file:///home/lazy/Desktop/LingoGen/app/chat/page.tsx)
- Update the chat header to display the matched languages alongside common interests (e.g., "Teaching Spanish, Learning English").

## Verification Plan

### Manual Verification
- I will run two instances of the application locally or via the deployed link.
- I will configure User A to native English, learning Spanish. User B to native Spanish, learning English.
- I will verify that the algorithm pairs them instantly and grants the 50-point language bonus.
- I will test the 10-second wait fallback by trying to match with zero common traits.
