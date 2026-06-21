"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../components/AuthProvider";
import MessageBubble from "../../components/MessageBubble";
import MatchmakingSpinner from "../../components/MatchmakingSpinner";
import { AnonSocket, getSocket, destroySocket, WSEvent } from "../../lib/websocket";
import { getOnlineCount } from "../../lib/api";

type ChatState = "idle" | "searching" | "chatting";

interface Message {
  id: string;
  text: string;
  sender: "me" | "stranger" | "system";
  timestamp: number;
  reaction?: string;
}

interface PartnerInfo {
  age?: number;
  gender?: string;
  native_language?: string;
  learning_language?: string;
  interests: string[];
  looking_for?: string;
}

export default function ChatPage() {
  const { profile, token, loading } = useAuth();
  const router = useRouter();

  const [chatState, setChatState] = useState<ChatState>("idle");
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [partner, setPartner] = useState<PartnerInfo | null>(null);
  const [commonInterests, setCommonInterests] = useState<string[]>([]);
  const [iceBreaker, setIceBreaker] = useState("");
  const [queueCount, setQueueCount] = useState(0);
  const [onlineCount, setOnlineCount] = useState(0);
  const [strangerTyping, setStrangerTyping] = useState(false);
  const [chatDuration, setChatDuration] = useState(0);
  const [totalChats, setTotalChats] = useState(0);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const socketRef = useRef<AnonSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chatTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auth guard
  useEffect(() => {
    if (!loading && !profile) router.push("/auth");
    if (!loading && profile && !profile.onboarded) router.push("/setup");
  }, [loading, profile, router]);

  // Online count
  useEffect(() => {
    getOnlineCount().then(({ online }) => setOnlineCount(online)).catch(() => setOnlineCount(120));
  }, []);

  // Initialise WebSocket
  useEffect(() => {
    if (!token || !profile) return;
    const socket = getSocket(token);
    if (!socket) return;
    socketRef.current = socket;

    const offConnected = socket.on("connected", (e) => {
      setOnlineCount((e.online_count as number) || 0);
    });

    const offQueue = socket.on("queue_update", (e) => {
      setQueueCount(e.count as number);
    });

    const offMatched = socket.on("matched", (e) => {
      setChatState("chatting");
      setPartner((e.partner as PartnerInfo) || null);
      setCommonInterests((e.common_interests as string[]) || []);
      setIceBreaker((e.ice_breaker as string) || "");
      setSessionId((e.session_id as string) || null);
      setTotalChats((t) => t + 1);
      setMessages([{
        id: "sys-start",
        text: "🎉 Connected! Say hello to your new stranger.",
        sender: "system",
        timestamp: Date.now(),
      }]);
    });

    const offReconnected = socket.on("reconnected", (e) => {
      setChatState("chatting");
      setPartner((e.partner as PartnerInfo) || null);
      setSessionId((e.session_id as string) || null);
      setTotalChats((t) => Math.max(t, 1));
      
      const loadedMessages: Message[] = (e.messages as any[] || []).map((m: any) => ({
        id: m.id,
        text: m.text,
        sender: m.sender_uid === profile?.uid ? "me" : "stranger",
        timestamp: m.timestamp * 1000,
      }));
      
      setMessages([
        { id: "sys-reconnected", text: "🔄 Reconnected to active chat.", sender: "system", timestamp: Date.now() - 1000 },
        ...loadedMessages
      ]);
    });

    const offMsg = socket.on("message", (e) => {
      setMessages((prev) => {
        const exists = prev.find((m) => m.id === e.id);
        if (exists) return prev;
        return [...prev, {
          id: e.id as string,
          text: e.text as string,
          sender: e.sender as "me" | "stranger",
          timestamp: (e.timestamp as number) * 1000,
        }];
      });
    });

    const offTyping = socket.on("typing", (e) => {
      setStrangerTyping(e.is_typing as boolean);
      if (e.is_typing) {
        setTimeout(() => setStrangerTyping(false), 4000);
      }
    });

    const offReaction = socket.on("reaction", (e) => {
      setMessages((prev) =>
        prev.map((m) => m.id === e.message_id ? { ...m, reaction: e.reaction as string } : m)
      );
    });

    const offLeft = socket.on("partner_left", () => {
      setMessages((prev) => [...prev, {
        id: "sys-left-" + Date.now(),
        text: "👋 Stranger has left the chat.",
        sender: "system",
        timestamp: Date.now(),
      }]);
      setChatState("idle");
      setPartner(null);
      setCommonInterests([]);
      setSessionId(null);
      setStrangerTyping(false);
    });

    const offEnded = socket.on("chat_ended", () => {
      setChatState("idle");
      setMessages([]);
      setPartner(null);
      setSessionId(null);
    });

    const offCancelled = socket.on("cancelled", () => {
      setChatState("idle");
    });

    const offSearching = socket.on("searching", (e) => {
      setQueueCount(e.queue_count as number);
    });

    const offError = socket.on("error", (e) => {
      alert("Error: " + String(e.message));
    });

    return () => {
      offConnected(); offQueue(); offMatched(); offReconnected(); offMsg();
      offTyping(); offReaction(); offLeft(); offEnded();
      offCancelled(); offSearching(); offError();
    };
  }, [token, profile]);

  // Chat timer
  useEffect(() => {
    if (chatState === "chatting") {
      chatTimerRef.current = setInterval(() => setChatDuration((d) => d + 1), 1000);
    } else {
      if (chatTimerRef.current) clearInterval(chatTimerRef.current);
      setChatDuration(0);
    }
    return () => { if (chatTimerRef.current) clearInterval(chatTimerRef.current); };
  }, [chatState]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, strangerTyping]);

  const startSearching = useCallback(() => {
    socketRef.current?.findMatch();
    setChatState("searching");
    setMessages([]);
    setPartner(null);
  }, []);

  const cancelSearch = useCallback(() => {
    socketRef.current?.cancelMatch();
    setChatState("idle");
  }, []);

  const endChat = useCallback(() => {
    socketRef.current?.endChat();
    setChatState("idle");
    setMessages([]);
    setPartner(null);
    setSessionId(null);
    setStrangerTyping(false);
  }, []);

  const skipToNext = useCallback(() => {
    socketRef.current?.endChat();
    setMessages([]);
    setPartner(null);
    setSessionId(null);
    setStrangerTyping(false);
    setTimeout(() => {
      socketRef.current?.findMatch();
      setChatState("searching");
    }, 300);
  }, []);

  const handleSend = useCallback(() => {
    const text = inputText.trim();
    if (!text) return;
    socketRef.current?.sendMessage(text);
    setInputText("");
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    socketRef.current?.setTyping(false);
  }, [inputText]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value);
    socketRef.current?.setTyping(true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socketRef.current?.setTyping(false);
    }, 2000);
  };

  const handleReact = (messageId: string, reaction: string) => {
    socketRef.current?.sendReaction(messageId, reaction);
  };

  const formatDuration = (s: number) =>
    `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  if (loading || !profile) return null;

  return (
    <div className="chat-page">
      {/* ── IDLE ── */}
      {chatState === "idle" && (
        <div className="chat-idle">
          <div className="idle-card animate-slide-up">
            <span className="idle-emoji">👋</span>
            <div className="online-badge">
              <span className="pulse-dot"></span>
              {onlineCount} people online
            </div>
            <h1 className="idle-title">Ready to connect?</h1>
            <p className="idle-sub">
              Click below to be matched with a random stranger.
              Interest-based matching kicks in first!
            </p>
            {totalChats > 0 && (
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.3)", padding: "6px 16px",
                fontSize: 13, color: "var(--accent-2)", marginBottom: 24,
              }}>
                🔥 {totalChats} chat{totalChats > 1 ? "s" : ""} this session
              </div>
            )}
            <button id="find-partner-btn" className="btn btn-primary btn-lg"
              onClick={startSearching} style={{ width: "100%", justifyContent: "center" }}>
              🔍 Find a Stranger
            </button>
            {profile.interests?.length > 0 && (
              <div style={{ marginTop: 24, display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
                {profile.interests.slice(0, 6).map((i) => (
                  <span key={i} style={{
                    padding: "4px 12px",
                    background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.2)",
                    fontSize: 12, color: "var(--primary-light)",
                  }}>{i}</span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── SEARCHING ── */}
      {chatState === "searching" && (
        <MatchmakingSpinner queueCount={queueCount} onCancel={cancelSearch} />
      )}

      {/* ── CHATTING ── */}
      {chatState === "chatting" && (
        <div className="chat-active">
          {/* Header */}
          <div className="chat-header">
            <div className="stranger-avatar">🎭</div>
            <div className="stranger-info">
              <div className="stranger-name">
                Stranger
                {partner && (
                  <span style={{ fontSize: 13, fontWeight: 400, color: "var(--text-muted)", marginLeft: 8 }}>
                    · {partner.age} · {partner.gender}
                  </span>
                )}
                <span style={{ fontSize: 12, color: "var(--text-dim)", marginLeft: 8 }}>
                  {formatDuration(chatDuration)}
                </span>
              </div>
              
              {partner?.native_language && partner?.learning_language && (
                <div style={{ fontSize: 12, color: "var(--primary)", marginTop: 2, display: "flex", alignItems: "center", gap: 4 }}>
                  <span>🌍 Speaks {partner.native_language}</span>
                  <span style={{color: "var(--text-dim)"}}>→</span>
                  <span>Learning {partner.learning_language}</span>
                </div>
              )}

              {commonInterests.length > 0 && (
                <div className="stranger-interests">
                  <span style={{ fontSize: 11, color: "var(--text-dim)" }}>In common:</span>
                  {commonInterests.slice(0, 4).map((i) => (
                    <span key={i} className="common-tag">{i}</span>
                  ))}
                </div>
              )}
            </div>
            <div className="chat-actions">
              <button id="skip-btn" className="btn btn-ghost btn-sm" onClick={skipToNext} title="Skip to next">
                ⏭ <span>Skip</span>
              </button>
              <button id="end-chat-btn" className="btn btn-danger btn-sm" onClick={endChat} title="End chat">
                ✕ <span>End</span>
              </button>
            </div>
          </div>

          {/* Ice Breaker */}
          {iceBreaker && (
            <div className="ice-breaker-bar">
              <span className="ice-breaker-icon">💡</span>
              <span><strong>Ice breaker:</strong> {iceBreaker}</span>
              <button style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "var(--text-dim)", fontSize: 16 }}
                onClick={() => setIceBreaker("")}>✕</button>
            </div>
          )}

          {/* Messages */}
          <div className="messages-area" id="messages-area">
            {messages.map((msg) =>
              msg.sender === "system" ? (
                <div key={msg.id} className="system-msg">{msg.text}</div>
              ) : (
                <MessageBubble
                  key={msg.id}
                  message={{ id: msg.id, text: msg.text, senderId: msg.sender === "me" ? "me" : "stranger", timestamp: msg.timestamp, reaction: msg.reaction }}
                  isOwn={msg.sender === "me"}
                  onReact={handleReact}
                />
              )
            )}
            {strangerTyping && (
              <div className="message-wrapper stranger">
                <div className="message-bubble-group">
                  <span className="message-sender-label">Stranger</span>
                  <div className="message-bubble bubble-stranger">
                    <div className="typing-dots">
                      <div className="typing-dot" /><div className="typing-dot" /><div className="typing-dot" />
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Typing label */}
          <div className="typing-indicator">
            {strangerTyping && (
              <>
                <div className="typing-dots">
                  <div className="typing-dot" /><div className="typing-dot" /><div className="typing-dot" />
                </div>
                <span>Stranger is typing...</span>
              </>
            )}
          </div>

          {/* Input */}
          <div className="chat-input-area">
            <div className="chat-input-row">
              <textarea
                id="chat-message-input"
                ref={inputRef}
                className="chat-input"
                placeholder="Type a message... (Enter to send)"
                value={inputText}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                rows={1}
              />
              <button id="send-message-btn" className="send-btn"
                onClick={handleSend} disabled={!inputText.trim()} title="Send">
                ➤
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
