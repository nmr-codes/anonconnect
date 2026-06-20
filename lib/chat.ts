import { ref, push, onValue, off, serverTimestamp, update } from "firebase/database";
import { rtdb } from "./firebase";

export interface Message {
  id: string;
  text: string;
  senderId: string;
  timestamp: number;
  reaction?: string;
}

export async function sendMessage(sessionId: string, senderId: string, text: string) {
  const messagesRef = ref(rtdb, `messages/${sessionId}`);
  await push(messagesRef, {
    text,
    senderId,
    timestamp: Date.now(),
  });
}

export function listenMessages(sessionId: string, callback: (messages: Message[]) => void) {
  const messagesRef = ref(rtdb, `messages/${sessionId}`);
  onValue(messagesRef, (snap) => {
    if (!snap.exists()) {
      callback([]);
      return;
    }
    const data = snap.val() as Record<string, Omit<Message, "id">>;
    const messages = Object.entries(data).map(([id, msg]) => ({ id, ...msg }));
    messages.sort((a, b) => a.timestamp - b.timestamp);
    callback(messages);
  });
  return () => off(messagesRef);
}

export async function setTyping(sessionId: string, uid: string, isTyping: boolean) {
  await update(ref(rtdb, `typing/${sessionId}`), { [uid]: isTyping ? Date.now() : null });
}

export function listenTyping(sessionId: string, myUid: string, callback: (isTyping: boolean) => void) {
  const typingRef = ref(rtdb, `typing/${sessionId}`);
  onValue(typingRef, (snap) => {
    if (!snap.exists()) { callback(false); return; }
    const data = snap.val();
    const strangerTyping = Object.entries(data).some(
      ([uid, ts]) => uid !== myUid && ts && (Date.now() - (ts as number)) < 3000
    );
    callback(strangerTyping);
  });
  return () => off(typingRef);
}

export async function addReaction(sessionId: string, messageId: string, reaction: string) {
  await update(ref(rtdb, `messages/${sessionId}/${messageId}`), { reaction });
}
