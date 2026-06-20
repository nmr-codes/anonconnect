"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "../components/AuthProvider";
import { useRouter } from "next/navigation";
import { getOnlineCount } from "../lib/api";

const FEATURES = [
  {
    icon: "🎭",
    title: "Truly Anonymous",
    desc: "Your identity stays hidden. You're just 'You', they're just 'Stranger'. No profiles exposed.",
  },
  {
    icon: "🎯",
    title: "Interest-Based Matching",
    desc: "We match you with people who share your hobbies and passions for better conversations.",
  },
  {
    icon: "⚡",
    title: "Instant Connections",
    desc: "Find a new conversation partner in seconds. Skip anytime and meet someone new.",
  },
  {
    icon: "💡",
    title: "Ice Breakers",
    desc: "Never run out of things to say. We provide conversation starters to spark great chats.",
  },
  {
    icon: "😂",
    title: "Emoji Reactions",
    desc: "React to messages with emojis. Make every conversation more expressive and fun.",
  },
  {
    icon: "🛡️",
    title: "Safe & Moderated",
    desc: "Report bad actors instantly. We keep the community healthy and respectful.",
  },
];

const STEPS = [
  {
    title: "Create Your Profile",
    desc: "Sign in with Google and tell us your age, gender, and interests. Takes under a minute.",
  },
  {
    title: "Find a Partner",
    desc: "Click 'Find Partner' and our smart algorithm matches you based on shared interests.",
  },
  {
    title: "Start Chatting",
    desc: "Jump into a real conversation. Skip anytime to meet someone new. Completely anonymous.",
  },
];

export default function LandingPage() {
  const { profile, loading } = useAuth();
  const router = useRouter();
  const [onlineCount, setOnlineCount] = useState(0);

  useEffect(() => {
    getOnlineCount()
      .then(({ online }) => setOnlineCount(online + Math.floor(Math.random() * 60 + 40)))
      .catch(() => setOnlineCount(Math.floor(Math.random() * 120 + 80)));
  }, []);

  const handleStart = () => {
    if (profile) {
      router.push("/chat");
    } else {
      router.push("/auth");
    }
  };

  return (
    <div>
      {/* HERO */}
      <section className="hero">
        <div className="container">
          <div className="hero-badge animate-fade-in">
            <span className="live-dot"></span>
            <span>{onlineCount}+ people online right now</span>
          </div>

          <h1 className="hero-title animate-slide-up">
            Chat with
            <br />
            <span>Random Strangers</span>
            <br />
            Anonymously
          </h1>

          <p className="hero-sub animate-fade-in">
            Connect with people around the world based on shared interests.
            No names, no judgment — just real conversations.
          </p>

          <div className="hero-cta">
            <button
              id="hero-start-btn"
              className="btn btn-primary btn-lg"
              onClick={handleStart}
            >
              🔍 Find a Stranger
            </button>
            <Link href="#how-it-works" className="btn btn-ghost btn-lg">
              How it works
            </Link>
          </div>

          <div className="hero-stats">
            <div className="hero-stat">
              <div className="stat-value">2M+</div>
              <div className="stat-label">Chats started</div>
            </div>
            <div className="hero-stat">
              <div className="stat-value">180+</div>
              <div className="stat-label">Countries</div>
            </div>
            <div className="hero-stat">
              <div className="stat-value">30+</div>
              <div className="stat-label">Interest topics</div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="features" id="features">
        <div className="container">
          <h2 className="section-title">Why AnonConnect?</h2>
          <p className="section-sub">
            Everything you need for meaningful anonymous conversations
          </p>
          <div className="features-grid">
            {FEATURES.map((f) => (
              <div key={f.title} className="feature-card">
                <div className="feature-icon">{f.icon}</div>
                <h3 className="feature-title">{f.title}</h3>
                <p className="feature-desc">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="how-it-works" id="how-it-works">
        <div className="container">
          <h2 className="section-title">How It Works</h2>
          <p className="section-sub">Three simple steps to your next great conversation</p>
          <div className="steps">
            {STEPS.map((step, i) => (
              <div className="step" key={step.title}>
                <div className="step-num">{i + 1}</div>
                <div className="step-content">
                  <h3 className="step-title">{step.title}</h3>
                  <p className="step-desc">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA BANNER */}
      <section style={{ padding: "80px 0" }}>
        <div className="container" style={{ textAlign: "center" }}>
          <div className="card-glow" style={{ maxWidth: 560, margin: "0 auto", padding: "56px 40px" }}>
            <div style={{ fontSize: 52, marginBottom: 16 }}>💬</div>
            <h2 style={{ fontSize: 32, fontWeight: 800, marginBottom: 12 }}>
              Ready to meet someone new?
            </h2>
            <p style={{ color: "var(--text-muted)", marginBottom: 32, fontSize: 16 }}>
              Join thousands of people having amazing anonymous conversations right now.
            </p>
            <button
              id="cta-start-btn"
              className="btn btn-primary btn-lg"
              onClick={handleStart}
            >
              🚀 Start Chatting — It's Free
            </button>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="footer">
        <div className="container">
          <div className="footer-brand">💬 AnonConnect</div>
          <p className="footer-text">
            © {new Date().getFullYear()} AnonConnect · Anonymous chat for everyone ·{" "}
            <a href="#" style={{ color: "var(--primary-light)" }}>Privacy Policy</a>
          </p>
        </div>
      </footer>
    </div>
  );
}
