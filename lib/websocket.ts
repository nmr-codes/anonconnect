const WS_BASE = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000";

export type WSEventType =
  | "connected" | "pong" | "searching" | "cancelled"
  | "matched" | "message" | "typing" | "reaction"
  | "partner_left" | "chat_ended" | "queue_update" | "error";

export interface WSEvent {
  type: WSEventType;
  [key: string]: unknown;
}

type Listener = (event: WSEvent) => void;

export class AnonSocket {
  private ws: WebSocket | null = null;
  private token: string;
  private listeners = new Map<WSEventType | "*", Set<Listener>>();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private shouldReconnect = true;
  private reconnectDelay = 2000;

  constructor(token: string) {
    this.token = token;
  }

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) return;
    const url = `${WS_BASE}/ws?token=${encodeURIComponent(this.token)}`;
    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      this.reconnectDelay = 2000;
      console.log("[WS] Connected");
    };

    this.ws.onmessage = (ev) => {
      try {
        const event: WSEvent = JSON.parse(ev.data);
        this.dispatch(event);
      } catch {
        console.error("[WS] Bad message", ev.data);
      }
    };

    this.ws.onclose = (ev) => {
      console.log("[WS] Closed", ev.code);
      this.ws = null;
      if (this.shouldReconnect && ev.code !== 1008) {
        this.scheduleReconnect();
      }
    };

    this.ws.onerror = (e) => {
      console.error("[WS] Error", e);
    };
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.reconnectDelay = Math.min(this.reconnectDelay * 1.5, 15000);
      console.log(`[WS] Reconnecting in ${this.reconnectDelay}ms...`);
      this.connect();
    }, this.reconnectDelay);
  }

  disconnect(): void {
    this.shouldReconnect = false;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.ws?.close();
    this.ws = null;
  }

  send(data: object): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    } else {
      console.warn("[WS] Cannot send — not connected");
    }
  }

  // ── Actions ─────────────────────────────────────────────
  findMatch(): void { this.send({ type: "find_match" }); }
  cancelMatch(): void { this.send({ type: "cancel_match" }); }
  endChat(): void { this.send({ type: "end_chat" }); }
  ping(): void { this.send({ type: "ping" }); }

  sendMessage(text: string): void {
    this.send({ type: "message", text });
  }

  setTyping(is_typing: boolean): void {
    this.send({ type: "typing", is_typing });
  }

  sendReaction(message_id: string, reaction: string): void {
    this.send({ type: "react", message_id, reaction });
  }

  // ── Event Emitter ────────────────────────────────────────
  on(type: WSEventType | "*", listener: Listener): () => void {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type)!.add(listener);
    return () => this.off(type, listener);
  }

  off(type: WSEventType | "*", listener: Listener): void {
    this.listeners.get(type)?.delete(listener);
  }

  private dispatch(event: WSEvent): void {
    this.listeners.get(event.type as WSEventType)?.forEach((fn) => fn(event));
    this.listeners.get("*")?.forEach((fn) => fn(event));
  }

  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

// Singleton per page session
let socket: AnonSocket | null = null;

export function getSocket(token?: string): AnonSocket | null {
  if (!socket && token) {
    socket = new AnonSocket(token);
    socket.connect();
  }
  return socket;
}

export function destroySocket(): void {
  socket?.disconnect();
  socket = null;
}
