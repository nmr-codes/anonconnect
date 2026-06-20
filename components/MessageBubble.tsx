"use client";
import { Message } from "../lib/chat";

const REACTIONS = ["❤️", "😂", "😮", "👍", "🔥", "😢"];

interface Props {
  message: Message;
  isOwn: boolean;
  onReact?: (messageId: string, reaction: string) => void;
}

export default function MessageBubble({ message, isOwn, onReact }: Props) {
  const time = new Date(message.timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className={`message-wrapper ${isOwn ? "own" : "stranger"}`}>
      <div className="message-bubble-group">
        {!isOwn && <span className="message-sender-label">Stranger</span>}
        <div className={`message-bubble ${isOwn ? "bubble-own" : "bubble-stranger"}`}>
          <p className="message-text">{message.text}</p>
          <span className="message-time">{time}</span>
        </div>
        {message.reaction && (
          <span className="message-reaction">{message.reaction}</span>
        )}
        {!isOwn && onReact && (
          <div className="reaction-picker">
            {REACTIONS.map((r) => (
              <button
                key={r}
                className="reaction-btn"
                onClick={() => onReact(message.id, r)}
                title={`React with ${r}`}
              >
                {r}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
