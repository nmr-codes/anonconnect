"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "./AuthProvider";
import { destroySocket } from "../lib/websocket";

export default function Navbar() {
  const { profile, loading, signOut } = useAuth();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleSignOut = () => {
    destroySocket();
    signOut();
    router.push("/");
  };

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <Link href="/" className="navbar-brand">
          <span className="brand-icon">💬</span>
          <span className="brand-name">AnonConnect</span>
        </Link>

        <div className="navbar-actions">
          {!loading && (
            <>
              {profile ? (
                <div className="nav-user">
                  <Link href="/chat" className="btn btn-primary btn-sm" id="nav-find-btn">
                    🔍 Find Partner
                  </Link>
                  <div className="avatar-menu">
                    <button
                      className="avatar-btn"
                      onClick={() => setMenuOpen(!menuOpen)}
                      id="nav-avatar-btn"
                    >
                      {profile.photo_url ? (
                        <img src={profile.photo_url} alt="Avatar" className="avatar-img" />
                      ) : (
                        <div className="avatar-placeholder">
                          {profile.display_name?.[0] || "?"}
                        </div>
                      )}
                    </button>
                    {menuOpen && (
                      <div className="dropdown-menu">
                        <Link
                          href="/profile"
                          className="dropdown-item"
                          onClick={() => setMenuOpen(false)}
                        >
                          👤 Profile
                        </Link>
                        <button className="dropdown-item danger" onClick={handleSignOut}>
                          🚪 Sign Out
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <Link href="/auth" className="btn btn-primary btn-sm" id="nav-signin-btn">
                  Sign In
                </Link>
              )}
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
