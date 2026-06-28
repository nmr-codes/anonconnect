"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../components/AuthProvider";
import {
  loginWithGoogle,
  loginWithEmail,
  sendVerificationCode,
  verifyCode,
  registerWithVerifiedEmail,
  checkEmailRegistered,
} from "../../lib/api";
import CodeInput from "../../components/CodeInput";

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
  const gsiInitializedRef = useRef(false);

  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const authModeRef = useRef<"login" | "signup">("login");
  const [signupStep, setSignupStep] = useState<1 | 2 | 3>(1);

  // Email/Password state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Step 2 state (Verification Code)
  const [codeDigits, setCodeDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [resendCountdown, setResendCountdown] = useState(0);
  const [verificationToken, setVerificationToken] = useState("");

  // Login state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  const [errorMsg, setErrorMsg] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

  const changeMode = (mode: "login" | "signup") => {
    setAuthMode(mode);
    authModeRef.current = mode;
    setErrorMsg("");
    // Reset wizard on mode switch
    if (mode === "signup") {
      setSignupStep(1);
      setCodeDigits(["", "", "", "", "", ""]);
      setPassword("");
      setConfirmPassword("");
    }
  };

  useEffect(() => {
    if (!loading && profile && !profile.is_guest) {
      if (profile.onboarded) {
        router.replace("/chat");
      } else {
        router.replace("/setup");
      }
    }
  }, [profile, loading, router]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (document.getElementById("gsi-script")) {
      if (window.google) {
        initGoogle();
      } else {
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

  useEffect(() => {
    if (!loading && window.google) {
      initGoogle();
    }
  }, [loading, authMode, signupStep]);

  // Resend code countdown timer
  useEffect(() => {
    if (resendCountdown <= 0) return;
    const timer = setInterval(() => {
      setResendCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCountdown]);

  const initGoogle = () => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId || !window.google) return;

    if (!gsiInitializedRef.current) {
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: handleGoogleCredential,
        auto_select: false,
      });
      gsiInitializedRef.current = true;
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
      if (data.user.onboarded) {
        router.replace("/chat");
      } else {
        router.replace("/setup");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Google authentication failed. Please try again.");
    }
  };

  // Sign Up Step 1: Send Code
  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setErrorMsg("Please enter your email.");
      return;
    }
    setErrorMsg("");
    setIsSubmitting(true);
    try {
      // Check if email already registered
      const check = await checkEmailRegistered(email);
      if (check.registered) {
        setShowLoginPrompt(true);
        setIsSubmitting(false);
        return;
      }

      await sendVerificationCode(email, "signup");
      setSignupStep(2);
      setResendCountdown(60);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to send verification code. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Sign Up Step 2: Verify Code
  const handleVerifyVerificationCode = async (code: string) => {
    setErrorMsg("");
    setIsSubmitting(true);
    try {
      const data = await verifyCode(email, code, "signup");
      if (data.verified) {
        setVerificationToken(data.verification_token);
        setSignupStep(3);
      } else {
        setErrorMsg("Failed to verify code.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Invalid code. Please try again.");
      setCodeDigits(["", "", "", "", "", ""]); // Reset code digits on error
    } finally {
      setIsSubmitting(false);
    }
  };

  // Sign Up Step 3: Set Password & Create Account
  const handleRegisterWithPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || !confirmPassword) {
      setErrorMsg("Please fill in both password fields.");
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg("Passwords do not match.");
      return;
    }
    setErrorMsg("");
    setIsSubmitting(true);
    try {
      const data = await registerWithVerifiedEmail(email, password, verificationToken);
      setAuth(data.user, data.access_token);
      router.replace("/setup");
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to create account. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Sign In Flow
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) {
      setErrorMsg("Please enter both email and password.");
      return;
    }
    setErrorMsg("");
    setIsSubmitting(true);
    try {
      const data = await loginWithEmail(loginEmail, loginPassword);
      setAuth(data.user, data.access_token);
      if (data.user.onboarded) {
        router.replace("/chat");
      } else {
        router.replace("/setup");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Authentication failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePromptYes = () => {
    setShowLoginPrompt(false);
    setLoginEmail(email);
    setLoginPassword("");
    setAuthMode("login");
    authModeRef.current = "login";
    setErrorMsg("");
  };

  const handlePromptNo = () => {
    setShowLoginPrompt(false);
  };

  if (loading) return null;

  return (
    <div className="auth-page">
      <div className="auth-card animate-slide-up">
        <h1 className="auth-title" style={{ background: "var(--gradient)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          LingoGen
        </h1>
        <p className="auth-sub">
          Interactive language exchange tailored to your interests.
        </p>

        {/* Tab Selector */}
        <div style={{ display: "flex", gap: 8, marginBottom: 32, background: "var(--bg-card-2)", padding: 4, borderRadius: "var(--radius-md)" }}>
          <button 
            className={`btn ${authMode === "login" ? "btn-primary" : "btn-ghost"}`} 
            style={{ flex: 1, padding: "8px 0", borderRadius: "var(--radius-sm)" }}
            onClick={() => changeMode("login")}
            type="button"
          >
            Sign In
          </button>
          <button 
            className={`btn ${authMode === "signup" ? "btn-primary" : "btn-ghost"}`} 
            style={{ flex: 1, padding: "8px 0", borderRadius: "var(--radius-sm)" }}
            onClick={() => changeMode("signup")}
            type="button"
          >
            Sign Up
          </button>
        </div>

        {errorMsg && (
          <div style={{ color: "var(--danger)", fontSize: 13, marginBottom: 16, padding: "10px", background: "rgba(239, 68, 68, 0.05)", border: "1px solid rgba(239, 68, 68, 0.2)", borderRadius: "var(--radius-md)" }}>
            {errorMsg}
          </div>
        )}

        {/* SIGN IN VIEW */}
        {authMode === "login" && (
          <form onSubmit={handleLoginSubmit} style={{ marginBottom: 24, textAlign: "left" }}>
            <div className="form-group" style={{ marginBottom: 16 }}>
              <label className="form-label">Email</label>
              <input 
                type="email" 
                className="form-input" 
                placeholder="you@example.com" 
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                required
              />
            </div>
            <div className="form-group" style={{ marginBottom: 24 }}>
              <label className="form-label">Password</label>
              <div className="password-field">
                <input 
                  type={showLoginPassword ? "text" : "password"} 
                  className="form-input" 
                  placeholder="••••••••" 
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="toggle-visibility"
                  onClick={() => setShowLoginPassword((prev) => !prev)}
                >
                  {showLoginPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: "100%", padding: "16px" }} disabled={isSubmitting}>
              {isSubmitting ? "Please wait..." : "Sign In"}
            </button>
          </form>
        )}

        {/* SIGN UP - STEP 1: ENTER EMAIL */}
        {authMode === "signup" && signupStep === 1 && (
          <form onSubmit={handleSendCode} style={{ marginBottom: 24, textAlign: "left" }}>
            <div className="form-group" style={{ marginBottom: 24 }}>
              <label className="form-label">Email Address</label>
              <input 
                type="email" 
                className="form-input" 
                placeholder="you@example.com" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: "100%", padding: "16px" }} disabled={isSubmitting}>
              {isSubmitting ? "Sending code..." : "Send Verification Code"}
            </button>
          </form>
        )}

        {/* SIGN UP - STEP 2: ENTER CODE */}
        {authMode === "signup" && signupStep === 2 && (
          <div style={{ marginBottom: 24, textAlign: "center" }} className="auth-step-active">
            <div className="email-sent-badge">
              Code sent to {email}
            </div>
            <p style={{ fontSize: 14, color: "var(--text-muted)", marginBottom: 16 }}>
              Enter the 6-digit verification code we sent to your inbox:
            </p>

            <CodeInput
              digits={codeDigits}
              onChange={setCodeDigits}
              onComplete={handleVerifyVerificationCode}
              disabled={isSubmitting}
            />

            <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 12, alignItems: "center" }}>
              {resendCountdown > 0 ? (
                <span style={{ fontSize: 13, color: "var(--text-dim)" }}>
                  Resend code in {resendCountdown}s
                </span>
              ) : (
                <button
                  type="button"
                  className="resend-link"
                  disabled={isSubmitting}
                  onClick={async () => {
                    setErrorMsg("");
                    setIsSubmitting(true);
                    try {
                      await sendVerificationCode(email, "signup");
                      setResendCountdown(60);
                      setCodeDigits(["", "", "", "", "", ""]);
                    } catch (err: any) {
                      setErrorMsg(err.message || "Failed to resend code.");
                    } finally {
                      setIsSubmitting(false);
                    }
                  }}
                >
                  Resend Code
                </button>
              )}
              
              <button
                type="button"
                className="btn btn-ghost"
                style={{ fontSize: 12, textDecoration: "underline", opacity: 0.8 }}
                onClick={() => setSignupStep(1)}
              >
                Change Email Address
              </button>
            </div>
          </div>
        )}

        {/* SIGN UP - STEP 3: CREATE PASSWORD */}
        {authMode === "signup" && signupStep === 3 && (
          <form onSubmit={handleRegisterWithPassword} style={{ marginBottom: 24, textAlign: "left" }}>
            <div className="form-group" style={{ marginBottom: 16 }}>
              <label className="form-label">Create Password</label>
              <div className="password-field">
                <input 
                  type={showPassword ? "text" : "password"} 
                  className="form-input" 
                  placeholder="••••••••" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="toggle-visibility"
                  onClick={() => setShowPassword((prev) => !prev)}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>
            <div className="form-group" style={{ marginBottom: 24 }}>
              <label className="form-label">Confirm Password</label>
              <div className="password-field">
                <input 
                  type={showConfirmPassword ? "text" : "password"} 
                  className="form-input" 
                  placeholder="••••••••" 
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="toggle-visibility"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                >
                  {showConfirmPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: "100%", padding: "16px" }} disabled={isSubmitting}>
              {isSubmitting ? "Creating account..." : "Create Account"}
            </button>
          </form>
        )}

        {/* Google OAuth Option (Only visible when entering Email in step 1 or login) */}
        {(authMode === "login" || (authMode === "signup" && signupStep === 1)) && (
          <>
            <div className="auth-divider">
              <span>OR</span>
            </div>

            <div style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 16, textAlign: "center" }}>
                {authMode === "login" 
                  ? "Continue with Google to sign in." 
                  : "Continue with Google to create an account."}
              </p>
              <div
                key={`google-btn-${authMode}`}
                id="google-signin-container"
                ref={btnRef}
                style={{ display: "flex", justifyContent: "center" }}
              />
            </div>
          </>
        )}

        <p className="auth-terms">
          By continuing, you agree to LingoGen's Terms of Service and Privacy Policy.<br/>
          Your identity is never shared with language partners.
        </p>
      </div>

      {/* Account Conflict Modal Prompt */}
      {showLoginPrompt && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(3, 7, 18, 0.85)", backdropFilter: "blur(8px)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20
        }}>
          <div className="card animate-slide-up" style={{
            width: "100%", maxWidth: 420, background: "var(--bg-card)", border: "1px solid var(--border)",
            padding: "40px 32px", textAlign: "center", borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-glow)"
          }}>
            <span style={{ fontSize: 44, marginBottom: 16, display: "block" }}>🌍</span>
            <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 12 }}>Account Already Exists</h3>
            <p style={{ color: "var(--text-muted)", fontSize: 14, marginBottom: 28, lineHeight: 1.6 }}>
              You already have a LingoGen account with the email <strong>{email}</strong>. Do you want to sign in instead?
            </p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
              <button 
                type="button" 
                className="btn btn-primary" 
                style={{ flex: 1, padding: "12px 0", background: "var(--gradient)", border: "none" }}
                onClick={handlePromptYes}
              >
                Yes, Sign In
              </button>
              <button 
                type="button" 
                className="btn btn-ghost" 
                style={{ flex: 1, padding: "12px 0", border: "1px solid var(--border)" }}
                onClick={handlePromptNo}
              >
                No
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
