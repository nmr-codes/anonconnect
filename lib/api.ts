const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("ac_token");
}

async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    if (
      (res.status === 401 || res.status === 403) &&
      !path.startsWith("/auth") &&
      typeof window !== "undefined"
    ) {
      localStorage.removeItem("ac_token");
      window.location.href = "/auth";
      return new Promise(() => {}); // Halt execution while navigating
    }
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "API error");
  }
  return res.json() as Promise<T>;
}

export interface UserProfile {
  uid: string;
  email: string;
  display_name: string;
  photo_url: string;
  age: number | null;
  gender: string | null;
  interests: string[];
  bio: string;
  looking_for: string;
  native_language?: string;
  learning_language?: string;
  onboarded: boolean;
  is_guest: boolean;
  chat_count?: number;
  created_at: number;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: UserProfile;
}

export interface SendCodeResponse {
  message: string;
  expires_in: number;
}

export interface VerifyCodeResponse {
  verified: boolean;
  verification_token: string;
}

export interface ProfileUpdate {
  display_name?: string;
  age?: number;
  gender?: string;
  interests?: string[];
  bio?: string;
  looking_for?: string;
  native_language?: string;
  learning_language?: string;
  onboarded?: boolean;
}

// ── Auth ──────────────────────────────────────────────────
export async function loginWithGoogle(credential: string, mode: "login" | "signup" = "login"): Promise<AuthResponse> {
  const data = await apiFetch<AuthResponse>("/auth/google", {
    method: "POST",
    body: JSON.stringify({ credential, mode }),
  });
  localStorage.setItem("ac_token", data.access_token);
  return data;
}

export async function loginWithEmail(email: string, password: string): Promise<AuthResponse> {
  const data = await apiFetch<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  localStorage.setItem("ac_token", data.access_token);
  return data;
}

/** @deprecated Use registerWithVerifiedEmail instead */
export async function registerWithEmail(email: string, password: string): Promise<AuthResponse> {
  const data = await apiFetch<AuthResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  localStorage.setItem("ac_token", data.access_token);
  return data;
}

export async function sendVerificationCode(
  email: string,
  purpose: "signup" | "reset_password" = "signup"
): Promise<SendCodeResponse> {
  return apiFetch<SendCodeResponse>("/auth/send-code", {
    method: "POST",
    body: JSON.stringify({ email, purpose }),
  });
}

export async function verifyCode(
  email: string,
  code: string,
  purpose: "signup" | "reset_password" = "signup"
): Promise<VerifyCodeResponse> {
  return apiFetch<VerifyCodeResponse>("/auth/verify-code", {
    method: "POST",
    body: JSON.stringify({ email, code, purpose }),
  });
}

export async function registerWithVerifiedEmail(
  email: string,
  password: string,
  verificationToken: string
): Promise<AuthResponse> {
  const data = await apiFetch<AuthResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify({
      email,
      password,
      verification_token: verificationToken,
    }),
  });
  localStorage.setItem("ac_token", data.access_token);
  return data;
}

export async function checkEmailRegistered(email: string): Promise<{ registered: boolean }> {
  return apiFetch<{ registered: boolean }>(`/auth/check-email?email=${encodeURIComponent(email)}`);
}

export async function loginAsGuest(): Promise<AuthResponse> {
  const data = await apiFetch<AuthResponse>("/auth/guest", {
    method: "POST",
  });
  localStorage.setItem("ac_token", data.access_token);
  return data;
}

export async function upgradeGuestAccount(
  method: "google" | "email",
  payload: {
    credential?: string;
    email?: string;
    password?: string;
    verification_token?: string;
  }
): Promise<AuthResponse> {
  const data = await apiFetch<AuthResponse>("/auth/upgrade", {
    method: "POST",
    body: JSON.stringify({ method, ...payload }),
  });
  localStorage.setItem("ac_token", data.access_token);
  return data;
}


export function logout(): void {
  localStorage.removeItem("ac_token");
}

export function hasToken(): boolean {
  return !!getToken();
}

// ── Profile ───────────────────────────────────────────────
export async function getMyProfile(): Promise<UserProfile> {
  return apiFetch<UserProfile>("/api/profile/me");
}

export async function updateProfile(data: ProfileUpdate): Promise<UserProfile> {
  return apiFetch<UserProfile>("/api/profile/me", {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

// ── Stats ─────────────────────────────────────────────────
export async function getOnlineCount(): Promise<{ online: number; searching: number }> {
  return apiFetch("/api/online-count");
}
