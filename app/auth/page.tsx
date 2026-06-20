"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../components/AuthProvider";
import { loginWithGoogle, loginWithEmail, registerWithEmail } from "../../lib/api";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: object) => void;
          renderButton: (element: HTMLElement, config: object) => void;
          prompt: () => void;
        };
      };
    };
  }
}

export default function AuthPage() {
  const { profile, loading, setAuth } = useAuth();
  const router = useRouter();
  const btnRef = useRef<HTMLDivElement>(null);
  
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const authModeRef = useRef<"login" | "signup">("login");
  const [errorMsg, setErrorMsg] = useState("");
  
  // Email/Password state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const changeMode = (mode: "login" | "signup") => {
    setAuthMode(mode);
    authModeRef.current = mode;
    setErrorMsg("");
  };

  useEffect(() => {
    if (!loading && profile) {
      router.replace(profile.onboarded ? "/chat" : "/setup");
    }
  }, [profile, loading, router]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (document.getElementById("gsi-script")) {
      if (window.google) {
        initGoogle();
      } else {
        // Poll briefly if it's still downloading
        interval = setInterval(() => {
          if (window.google) {
            initGoogle();
            clearInterval(interval);
          }
        }, 100);
      }
      return () => clearInterval(interval);
    }
    const script = document.createElement("script");
    script.id = "gsi-script";
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => initGoogle();
    document.head.appendChild(script);
    return () => clearInterval(interval);
  }, []);

  const initGoogle = () => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId || !window.google) return;

    if (!(window as any).__gsiInitialized) {
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: handleGoogleCredential,
        auto_select: false,
      });
      (window as any).__gsiInitialized = true;
    }

    if (btnRef.current) {
      window.google.accounts.id.renderButton(btnRef.current, {
        theme: "filled_black",
        size: "large",
        width: 360,
        text: "continue_with",
        shape: "pill",
      });
    }
  };

  const handleGoogleCredential = async (response: { credential: string }) => {
    setErrorMsg("");
    try {
      const data = await loginWithGoogle(response.credential, authModeRef.current);
      setAuth(data.user, data.access_token);
      router.replace(data.user.onboarded ? "/chat" : "/setup");
    } catch (err: any) {
      setErrorMsg(err.message || "Google authentication failed. Please try again.");
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg("Please enter both email and password.");
      return;
    }
    if (authMode === "signup" && password !== confirmPassword) {
      setErrorMsg("Passwords do not match.");
      return;
    }
    setErrorMsg("");
    setIsSubmitting(true);
    try {
      let data;
      if (authMode === "login") {
        data = await loginWithEmail(email, password);
      } else {
        data = await registerWithEmail(email, password);
      }
      setAuth(data.user, data.access_token);
      router.replace(data.user.onboarded ? "/chat" : "/setup");
    } catch (err: any) {
      setErrorMsg(err.message || "Authentication failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return null;

  return (
    <div className="auth-page">
      <div className="auth-card animate-slide-up">
        <h1 className="auth-title">AnonConnect</h1>
        <p className="auth-sub">
          Anonymous conversations tailored to your interests.
        </p>

        {/* Tab Selector */}
        <div style={{ display: "flex", gap: 8, marginBottom: 32, background: "var(--bg-card-2)", padding: 4, borderRadius: "var(--radius-md)" }}>
          <button 
            className={`btn ${authMode === "login" ? "btn-primary" : "btn-ghost"}`} 
            style={{ flex: 1, padding: "8px 0" }}
            onClick={() => changeMode("login")}
            type="button"
          >
            Sign In
          </button>
          <button 
            className={`btn ${authMode === "signup" ? "btn-primary" : "btn-ghost"}`} 
            style={{ flex: 1, padding: "8px 0" }}
            onClick={() => changeMode("signup")}
            type="button"
          >
            Sign Up
          </button>
        </div>

        {errorMsg && (
          <div style={{ color: "var(--danger)", fontSize: 13, marginBottom: 16, padding: "10px", background: "rgba(255, 74, 74, 0.05)", border: "1px solid rgba(255, 74, 74, 0.2)", borderRadius: "var(--radius-sm)" }}>
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleEmailAuth} style={{ marginBottom: 24, textAlign: "left" }}>
          <div className="form-group" style={{ marginBottom: 16 }}>
            <label className="form-label">Email</label>
            <input 
              type="email" 
              className="form-input" 
              placeholder="you@example.com" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="form-group" style={{ marginBottom: 24 }}>
            <label className="form-label">Password</label>
            <input 
              type="password" 
              className="form-input" 
              placeholder="••••••••" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {authMode === "signup" && (
            <div className="form-group" style={{ marginBottom: 24 }}>
              <label className="form-label">Confirm Password</label>
              <input 
                type="password" 
                className="form-input" 
                placeholder="••••••••" 
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
          )}
          <button type="submit" className="btn btn-primary" style={{ width: "100%", padding: "16px" }} disabled={isSubmitting}>
            {isSubmitting ? "Please wait..." : (authMode === "login" ? "Sign In" : "Create Account")}
          </button>
        </form>

        <div className="auth-divider">
          <span>OR</span>
        </div>

        <div style={{ marginBottom: 16 }}>
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 16 }}>
            {authMode === "login" 
              ? "Continue with Google to sign in." 
              : "Continue with Google to create an account."}
          </p>
          {/* Google Identity Services renders the real button here */}
          <div
            id="google-signin-container"
            ref={btnRef}
            style={{ display: "flex", justifyContent: "center" }}
          />
        </div>

        <p className="auth-terms">
          By continuing, you agree to our Terms of Service and Privacy Policy.<br/>
          Your identity is never shared with chat partners.
        </p>
      </div>
    </div>
  );
}
