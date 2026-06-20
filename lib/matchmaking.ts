import { ref, set, get, remove, onValue, off, serverTimestamp, push, update } from "firebase/database";
import { rtdb } from "./firebase";

export const INTERESTS = [
  "Music", "Gaming", "Movies", "Books", "Travel", "Cooking", "Fitness",
  "Photography", "Art", "Technology", "Science", "Sports", "Fashion",
  "Nature", "Anime", "Coding", "Design", "Yoga", "Dancing", "Writing",
  "Podcasts", "History", "Politics", "Finance", "Languages", "Pets",
  "Cars", "Space", "Psychology", "Philosophy",
];

export const ICE_BREAKERS = [
  "What's the most interesting place you've ever been?",
  "If you could have dinner with any historical figure, who would it be?",
  "What's your all-time favorite movie?",
  "What skill do you wish you had?",
  "What's the last book you read that you'd recommend?",
  "If you could live anywhere in the world, where would it be?",
  "What's your go-to comfort food?",
  "What hobby have you recently picked up or want to pick up?",
  "What's a fun fact about yourself?",
  "If you could time travel, where would you go?",
];

export interface MatchmakingEntry {
  uid: string;
  interests: string[];
  age: number;
  gender: string;
  joinedAt: number;
}

export async function joinQueue(uid: string, profile: { interests: string[]; age: number; gender: string }) {
  const queueRef = ref(rtdb, `queue/${uid}`);
  await set(queueRef, {
    uid,
    interests: profile.interests,
    age: profile.age,
    gender: profile.gender,
    joinedAt: Date.now(),
  });
}

export async function leaveQueue(uid: string) {
  const queueRef = ref(rtdb, `queue/${uid}`);
  await remove(queueRef);
}

export async function findMatch(uid: string, interests: string[]): Promise<string | null> {
  const queueRef = ref(rtdb, "queue");
  const snap = await get(queueRef);
  if (!snap.exists()) return null;

  const queue = snap.val() as Record<string, MatchmakingEntry>;
  const candidates = Object.values(queue).filter((e) => e.uid !== uid);
  if (candidates.length === 0) return null;

  // Try to find shared interests first
  const withShared = candidates.filter((c) =>
    c.interests.some((i) => interests.includes(i))
  );
  const pool = withShared.length > 0 ? withShared : candidates;
  const match = pool[Math.floor(Math.random() * pool.length)];
  return match.uid;
}

export async function createChatSession(uid1: string, uid2: string): Promise<string> {
  const sessionRef = push(ref(rtdb, "sessions"));
  const sessionId = sessionRef.key!;
  await set(sessionRef, {
    participants: [uid1, uid2],
    createdAt: Date.now(),
    active: true,
  });
  // Remove both from queue
  await remove(ref(rtdb, `queue/${uid1}`));
  await remove(ref(rtdb, `queue/${uid2}`));
  // Notify both users
  await update(ref(rtdb, `users/${uid1}`), { currentSession: sessionId, matchedWith: uid2 });
  await update(ref(rtdb, `users/${uid2}`), { currentSession: sessionId, matchedWith: uid1 });
  return sessionId;
}

export async function endChatSession(sessionId: string, uid1: string, uid2: string) {
  await update(ref(rtdb, `sessions/${sessionId}`), { active: false, endedAt: Date.now() });
  await update(ref(rtdb, `users/${uid1}`), { currentSession: null, matchedWith: null });
  await update(ref(rtdb, `users/${uid2}`), { currentSession: null, matchedWith: null });
}

export function listenForMatch(uid: string, callback: (sessionId: string | null, matchedWith: string | null) => void) {
  const userRef = ref(rtdb, `users/${uid}`);
  onValue(userRef, (snap) => {
    if (snap.exists()) {
      const data = snap.val();
      callback(data.currentSession || null, data.matchedWith || null);
    }
  });
  return () => off(userRef);
}

export function listenQueueCount(callback: (count: number) => void) {
  const queueRef = ref(rtdb, "queue");
  onValue(queueRef, (snap) => {
    callback(snap.exists() ? Object.keys(snap.val()).length : 0);
  });
  return () => off(queueRef);
}

export function getRandomIceBreaker(): string {
  return ICE_BREAKERS[Math.floor(Math.random() * ICE_BREAKERS.length)];
}

export function getCommonInterests(a: string[], b: string[]): string[] {
  return a.filter((i) => b.includes(i));
}
