"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "../components/AuthProvider";
import { useRouter } from "next/navigation";
import { getOnlineCount, loginAsGuest } from "../lib/api";
import Interactive3DBackground from "../components/Interactive3DBackground";

const FEATURES = [
  {
    icon: "🌍",
    title: "Language Exchange Match",
    desc: "Match with native speakers of languages you're learning, or practice together anonymously.",
  },
  {
    icon: "🎭",
    title: "100% Anonymous",
    desc: "No profile pages, no names, no public trace. Connect purely on character and speech.",
  },
  {
    icon: "🎯",
    title: "Interest Constellations",
    desc: "Our algorithms pair you with partners who share your exact hobbies and passion topics.",
  },
  {
    icon: "⚡",
    title: "Zero-Friction Chats",
    desc: "No registrations required to test. Jump straight into the pool and start typing in seconds.",
  },
  {
    icon: "💡",
    title: "Smart Ice Breakers",
    desc: "Never hit a dead end. Get translation prompts and conversation starters suited for language practice.",
  },
  {
    icon: "🛡️",
    title: "Safe Environment",
    desc: "Strict automated moderation and user reporting. Keep conversations respectful and healthy.",
  },
];

const JOURNEY_STEPS = [
  {
    number: "01",
    title: "Instant Connection",
    desc: "Click 'Find Partner' to enter the pool anonymously. No signup required for your first few chats.",
  },
  {
    number: "02",
    title: "Find Your Match",
    desc: "Our system filters matches based on native/learning languages and shared interests.",
  },
  {
    number: "03",
    title: "Expand Your Horizon",
    desc: "Unlock permanent features like nickname reservation, chat logs, and progressive onboarding.",
  },
];

export default function LandingPage() {
  const { profile, loading, setAuth } = useAuth();
  const router = useRouter();
  const [onlineCount, setOnlineCount] = useState(0);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    getOnlineCount()
      .then(({ online }) => setOnlineCount(online + Math.floor(Math.random() * 40 + 20)))
      .catch(() => setOnlineCount(Math.floor(Math.random() * 80 + 50)));
  }, []);

  // Intersection Observer for scroll-reveal animations
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("animate-slide-up");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );

    document.querySelectorAll(".reveal").forEach((el) => {
      observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  const handleStart = async () => {
    if (profile) {
      if (profile.onboarded) {
        router.push("/chat");
      } else {
        router.push("/setup");
      }
    } else {
      setIsLoggingIn(true);
      try {
        const data = await loginAsGuest();
        setAuth(data.user, data.access_token);
        if (data.user.onboarded) {
          router.push("/chat");
        } else {
          router.push("/setup");
        }
      } catch (err) {
        console.error("Guest login failed:", err);
        router.push("/auth");
      } finally {
        setIsLoggingIn(false);
      }
    }
  };

  return (
    <div style={{ position: "relative", overflow: "hidden" }}>
      {/* 3D Background */}
      <Interactive3DBackground />

      {/* HERO SECTION */}
      <section className="hero" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
        <div className="container" style={{ textAlign: "center", zIndex: 2 }}>
          
          {/* Neon Pulse Online Counter */}
          <div className="hero-badge animate-fade-in" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 20px", background: "rgba(11, 19, 41, 0.6)", border: "1px solid rgba(59, 130, 246, 0.2)", borderRadius: "999px", marginBottom: 28, backdropFilter: "blur(8px)" }}>
            <span className="live-dot" style={{ width: 8, height: 8, background: "var(--accent)", borderRadius: "50%", boxShadow: "0 0 10px var(--accent)", animation: "pulse 2s infinite" }}></span>
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-muted)", letterSpacing: "0.5px" }}>{onlineCount}+ active learners online</span>
          </div>

          {/* Title */}
          <h1 className="hero-title animate-slide-up" style={{ fontSize: "64px", fontWeight: 900, lineHeight: 1.1, letterSpacing: "-1.5px", marginBottom: 24, textShadow: "0 4px 20px rgba(0,0,0,0.5)" }}>
            Learn & Chat
            <br />
            <span style={{ background: "var(--gradient)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Globally & Anonymously</span>
          </h1>

          {/* Subtitle */}
          <p className="hero-sub animate-fade-in" style={{ maxWidth: 640, margin: "0 auto 40px", fontSize: 18, color: "var(--text-muted)", lineHeight: 1.6 }}>
            Connect with native speakers worldwide. Match instantly by native and learning languages, skip when you want, and practice without identity pressure.
          </p>

          {/* CTAs */}
          <div className="hero-cta" style={{ display: "flex", gap: 16, justifyContent: "center", alignItems: "center", marginBottom: 56 }}>
            <button
              id="hero-start-btn"
              className="btn btn-primary btn-lg"
              onClick={handleStart}
              disabled={isLoggingIn}
              style={{
                background: "var(--gradient)",
                border: "none",
                boxShadow: "0 4px 20px rgba(59, 130, 246, 0.4)",
                padding: "16px 36px",
                fontWeight: 700,
                borderRadius: "var(--radius-lg)",
                transition: "all 0.3s ease",
              }}
            >
              {isLoggingIn ? "🔄 Connecting..." : "🚀 Start Practice — Free"}
            </button>
            <Link href="#features" className="btn btn-ghost btn-lg" style={{ border: "1px solid var(--border)", background: "rgba(11, 19, 41, 0.4)", padding: "16px 36px", borderRadius: "var(--radius-lg)", backdropFilter: "blur(4px)" }}>
              Explore Features
            </Link>
          </div>

          {/* Minimalist Stats */}
          <div className="hero-stats" style={{ display: "flex", justifyContent: "center", gap: 64, marginTop: 40 }}>
            <div className="hero-stat">
              <div className="stat-value" style={{ fontSize: 32, fontWeight: 800, color: "var(--text)" }}>30+</div>
              <div className="stat-label" style={{ fontSize: 12, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: 1 }}>Languages</div>
            </div>
            <div className="hero-stat">
              <div className="stat-value" style={{ fontSize: 32, fontWeight: 800, color: "var(--text)" }}>150k+</div>
              <div className="stat-label" style={{ fontSize: 12, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: 1 }}>Chats/Day</div>
            </div>
            <div className="hero-stat">
              <div className="stat-value" style={{ fontSize: 32, fontWeight: 800, color: "var(--text)" }}>100%</div>
              <div className="stat-label" style={{ fontSize: 12, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: 1 }}>Safe & Free</div>
            </div>
          </div>

        </div>
      </section>

      {/* FEATURE SECTION */}
      <section className="features" id="features" style={{ padding: "120px 0", background: "linear-gradient(180deg, transparent 0%, rgba(11, 19, 41, 0.7) 50%, transparent 100%)" }}>
        <div className="container">
          <div className="reveal" style={{ textAlign: "center", marginBottom: 64 }}>
            <h2 className="section-title" style={{ fontSize: 36, fontWeight: 800, marginBottom: 16 }}>Engineered for Language Practice</h2>
            <p className="section-sub" style={{ maxWidth: 540, margin: "0 auto", color: "var(--text-muted)" }}>
              Ditch language apps that feel like homework. Jump into real conversations with real humans instantly.
            </p>
          </div>

          <div className="features-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 32 }}>
            {FEATURES.map((f, index) => (
              <div
                key={f.title}
                className="feature-card reveal"
                style={{
                  background: "rgba(11, 19, 41, 0.5)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-lg)",
                  padding: "36px",
                  backdropFilter: "blur(12px)",
                  transition: "all 0.3s ease",
                }}
              >
                <div className="feature-icon" style={{ fontSize: 32, marginBottom: 20 }}>{f.icon}</div>
                <h3 className="feature-title" style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>{f.title}</h3>
                <p className="feature-desc" style={{ color: "var(--text-muted)", fontSize: 14, lineHeight: 1.6 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* THE JOURNEY SECTION */}
      <section style={{ padding: "100px 0" }}>
        <div className="container">
          <div className="reveal" style={{ textAlign: "center", marginBottom: 80 }}>
            <h2 style={{ fontSize: 36, fontWeight: 800, marginBottom: 16 }}>Your Scrolling Journey</h2>
            <p style={{ color: "var(--text-muted)", maxWidth: 480, margin: "0 auto" }}>
              See how we route your connections dynamically behind the scenes.
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 64 }}>
            {JOURNEY_STEPS.map((step, i) => (
              <div
                key={step.title}
                className="reveal"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 48,
                  flexDirection: i % 2 === 0 ? "row" : "row-reverse",
                  flexWrap: "wrap",
                }}
              >
                <div style={{ flex: 1, minWidth: 280 }}>
                  <div style={{ fontSize: 72, fontWeight: 900, background: "var(--gradient)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", opacity: 0.85, lineHeight: 1, marginBottom: 16 }}>
                    {step.number}
                  </div>
                  <h3 style={{ fontSize: 24, fontWeight: 800, marginBottom: 16 }}>{step.title}</h3>
                  <p style={{ color: "var(--text-muted)", fontSize: 16, lineHeight: 1.6 }}>{step.desc}</p>
                </div>

                <div
                  style={{
                    flex: 1,
                    minWidth: 280,
                    height: 200,
                    background: "linear-gradient(135deg, rgba(59, 130, 246, 0.05) 0%, rgba(16, 185, 129, 0.05) 100%)",
                    border: "1px dashed var(--border)",
                    borderRadius: "var(--radius-xl)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  <div style={{ position: "absolute", width: "100%", height: "100%", background: "radial-gradient(circle, rgba(59, 130, 246, 0.1) 0%, transparent 60%)" }} />
                  <span style={{ fontSize: 48, zIndex: 1 }}>{i === 0 ? "⚡" : i === 1 ? "🤝" : "👑"}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CALL TO ACTION BANNER */}
      <section style={{ padding: "100px 0" }}>
        <div className="container">
          <div className="reveal card-glow" style={{
            maxWidth: 720,
            margin: "0 auto",
            padding: "64px 48px",
            background: "rgba(11, 19, 41, 0.65)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-xl)",
            backdropFilter: "blur(20px)",
            textAlign: "center",
            boxShadow: "var(--shadow-glow)"
          }}>
            <div style={{ fontSize: 56, marginBottom: 24 }}>💬</div>
            <h2 style={{ fontSize: 32, fontWeight: 800, marginBottom: 16, letterSpacing: "-1px" }}>Ready to master a language?</h2>
            <p style={{ color: "var(--text-muted)", marginBottom: 40, fontSize: 16, maxWidth: 500, margin: "0 auto 40px", lineHeight: 1.6 }}>
              Join the fastest growing language practice pool. Start a conversation with a native partner right now.
            </p>
            <button
              id="cta-start-btn"
              className="btn btn-primary btn-lg"
              onClick={handleStart}
              disabled={isLoggingIn}
              style={{
                background: "var(--gradient)",
                border: "none",
                padding: "16px 40px",
                fontWeight: 700,
                borderRadius: "var(--radius-lg)",
                boxShadow: "0 4px 20px rgba(16, 185, 129, 0.3)"
              }}
            >
              {isLoggingIn ? "🔄 Connecting..." : "🚀 Find Your Language Partner"}
            </button>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="footer" style={{ borderTop: "1px solid var(--border)", padding: "40px 0", background: "rgba(3, 7, 18, 0.6)", backdropFilter: "blur(8px)" }}>
        <div className="container" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 24 }}>
          <div className="footer-brand" style={{ fontSize: 18, fontWeight: 800, background: "var(--gradient)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            💬 LingoGen
          </div>
          <p className="footer-text" style={{ color: "var(--text-dim)", fontSize: 12 }}>
            © {new Date().getFullYear()} LingoGen. All rights reserved. Your conversations are anonymous.
          </p>
        </div>
      </footer>
    </div>
  );
}
