"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../components/AuthProvider";
import InterestSelector from "../../components/InterestSelector";
import { updateProfile } from "../../lib/api";

export default function ProfilePage() {
  const { profile, loading, setProfile } = useAuth();
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [displayName, setDisplayName] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [bio, setBio] = useState("");
  const [lookingFor, setLookingFor] = useState("");

  useEffect(() => {
    if (!loading && !profile) router.push("/auth");
  }, [loading, profile, router]);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || "");
      setAge(profile.age ? String(profile.age) : "");
      setGender(profile.gender || "");
      setInterests(profile.interests || []);
      setBio(profile.bio || "");
      setLookingFor(profile.looking_for || "");
    }
  }, [profile]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await updateProfile({
        display_name: displayName.trim(),
        age: parseInt(age),
        gender,
        interests,
        bio: bio.trim(),
        looking_for: lookingFor,
      });
      setProfile(updated);
      setEditing(false);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading || !profile) return null;

  const joined = profile.created_at
    ? new Date(profile.created_at * 1000).toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : "Recently";

  return (
    <div className="profile-page">
      <div className="profile-container">
        {/* Header */}
        <div className="profile-header">
          <div className="profile-avatar-lg">
            {profile.photo_url ? (
              <img src={profile.photo_url} alt="Avatar" />
            ) : (
              <div style={{ width: "100%", height: "100%", background: "var(--gradient)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36, fontWeight: 800, color: "#fff" }}>
                {displayName?.[0] || "?"}
              </div>
            )}
          </div>
          <div>
            <h1 className="profile-name">{displayName || "Anonymous"}</h1>
            <p className="profile-meta">
              {gender && `${gender} · `}{age && `Age ${age} · `}Member since {joined}
            </p>
            {lookingFor && <p style={{ fontSize: 13, color: "var(--primary-light)", marginTop: 4 }}>{lookingFor}</p>}
          </div>
        </div>

        {/* Stats */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-card-value">{interests.length}</div>
            <div className="stat-card-label">Interests</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-value">🔥</div>
            <div className="stat-card-label">Active</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-value">🌍</div>
            <div className="stat-card-label">Global</div>
          </div>
        </div>

        {/* Profile card */}
        <div className="card" style={{ marginBottom: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700 }}>My Profile</h2>
            {!editing ? (
              <button id="edit-profile-btn" className="btn btn-secondary btn-sm" onClick={() => setEditing(true)}>✏️ Edit</button>
            ) : (
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn btn-ghost btn-sm" onClick={() => setEditing(false)}>Cancel</button>
                <button id="save-profile-btn" className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>
                  {saving ? "Saving..." : "Save"}
                </button>
              </div>
            )}
          </div>

          {editing ? (
            <>
              <div className="form-group">
                <label className="form-label">Nickname</label>
                <input className="form-input" value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={30} />
              </div>
              <div className="form-group">
                <label className="form-label">Age</label>
                <input className="form-input" type="number" value={age} onChange={(e) => setAge(e.target.value)} min={13} max={99} />
              </div>
              <div className="form-group">
                <label className="form-label">Gender</label>
                <div className="gender-grid">
                  {["Male", "Female", "Other"].map((g) => (
                    <button key={g} type="button" className={`gender-btn ${gender === g ? "active" : ""}`} onClick={() => setGender(g)}>
                      <span className="gender-emoji">{g === "Male" ? "👨" : g === "Female" ? "👩" : "🧑"}</span>{g}
                    </button>
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Bio</label>
                <textarea className="form-input" value={bio} onChange={(e) => setBio(e.target.value)} maxLength={300} rows={3} style={{ resize: "vertical" }} />
              </div>
            </>
          ) : (
            <>
              {bio && (
                <div style={{ marginBottom: 20 }}>
                  <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 600 }}>Bio</p>
                  <p style={{ color: "var(--text)" }}>{bio}</p>
                </div>
              )}
              <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 600 }}>Details</p>
              <p style={{ color: "var(--text)" }}>{gender || "—"} · Age {age || "—"}</p>
            </>
          )}
        </div>

        {/* Interests */}
        <div className="card" style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>My Interests</h2>
          {editing ? (
            <InterestSelector selected={interests} onChange={setInterests} max={10} />
          ) : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              {interests.length > 0
                ? interests.map((i) => <span key={i} className="interest-tag selected">{i}</span>)
                : <p style={{ color: "var(--text-muted)" }}>No interests added yet.</p>
              }
            </div>
          )}
        </div>

        <button id="profile-find-partner-btn" className="btn btn-primary" style={{ width: "100%" }} onClick={() => router.push("/chat")}>
          🔍 Find a Partner
        </button>
      </div>
    </div>
  );
}
