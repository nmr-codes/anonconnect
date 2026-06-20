"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../components/AuthProvider";
import InterestSelector from "../../components/InterestSelector";
import { updateProfile } from "../../lib/api";

const TOTAL_STEPS = 3;

export default function SetupPage() {
  const { profile, loading, setProfile } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  const [displayName, setDisplayName] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [bio, setBio] = useState("");
  const [lookingFor, setLookingFor] = useState("");

  useEffect(() => {
    if (!loading && !profile) router.push("/auth");
    if (!loading && profile?.onboarded) router.push("/chat");
    if (profile) {
      setDisplayName(profile.display_name || "");
      setAge(profile.age ? String(profile.age) : "");
      setGender(profile.gender || "");
      setInterests(profile.interests || []);
      setBio(profile.bio || "");
      setLookingFor(profile.looking_for || "");
    }
  }, [loading, profile, router]);

  const canNext = () => {
    if (step === 1) return displayName.trim() && age && +age >= 13 && +age <= 99 && gender;
    if (step === 2) return interests.length >= 3;
    return true;
  };

  const handleFinish = async () => {
    setSaving(true);
    try {
      const updated = await updateProfile({
        display_name: displayName.trim(),
        age: parseInt(age),
        gender,
        interests,
        bio: bio.trim(),
        looking_for: lookingFor,
        onboarded: true,
      });
      setProfile(updated);
      router.push("/chat");
    } catch (err) {
      console.error(err);
      alert("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading || !profile) return null;

  return (
    <div className="setup-page">
      <div className="setup-container">
        <div className="setup-header">
          <div className="setup-progress">
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <div
                key={i}
                className={`progress-step ${i + 1 < step ? "done" : i + 1 === step ? "active" : ""}`}
              />
            ))}
          </div>
          <p className="text-sm text-muted">Step {step} of {TOTAL_STEPS}</p>
        </div>

        {step === 1 && (
          <div className="animate-slide-up">
            <div className="setup-header">
              <h1 className="setup-title">Tell us about yourself 👋</h1>
              <p className="setup-sub">This info stays anonymous — only age and interests are shared.</p>
            </div>
            <div className="setup-card">
              <div className="form-group">
                <label className="form-label">Your nickname</label>
                <input
                  id="setup-nickname"
                  className="form-input"
                  type="text"
                  placeholder="What should strangers call you?"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  maxLength={30}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Age</label>
                <input
                  id="setup-age"
                  className="form-input"
                  type="number"
                  placeholder="Your age (13–99)"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  min={13} max={99}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Gender</label>
                <div className="gender-grid">
                  {[{ label: "Male", emoji: "👨" }, { label: "Female", emoji: "👩" }, { label: "Other", emoji: "🧑" }].map(({ label, emoji }) => (
                    <button
                      key={label}
                      type="button"
                      id={`gender-${label.toLowerCase()}`}
                      className={`gender-btn ${gender === label ? "active" : ""}`}
                      onClick={() => setGender(label)}
                    >
                      <span className="gender-emoji">{emoji}</span>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="animate-slide-up">
            <div className="setup-header">
              <h1 className="setup-title">What are you into? 🎯</h1>
              <p className="setup-sub">Pick at least 3. We match you with people who share your passions.</p>
            </div>
            <div className="setup-card">
              <InterestSelector selected={interests} onChange={setInterests} max={10} />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="animate-slide-up">
            <div className="setup-header">
              <h1 className="setup-title">Almost there! ✨</h1>
              <p className="setup-sub">Both optional — but they help break the ice.</p>
            </div>
            <div className="setup-card">
              <div className="form-group">
                <label className="form-label">Short Bio (optional)</label>
                <textarea
                  id="setup-bio"
                  className="form-input"
                  placeholder="Say something about yourself... (max 300 chars)"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  maxLength={300}
                  rows={3}
                  style={{ resize: "vertical", borderRadius: "var(--radius-md)" }}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Looking for</label>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {["Friendly chat 😊", "Language practice 🌍", "Deep conversations 🧠", "Just having fun 🎉", "Making new friends 👫"].map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      id={`looking-${opt.split(" ")[0].toLowerCase()}`}
                      className={`btn ${lookingFor === opt ? "btn-primary" : "btn-ghost"}`}
                      style={{ justifyContent: "flex-start", borderRadius: "var(--radius-md)" }}
                      onClick={() => setLookingFor(opt)}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="setup-nav">
          {step > 1
            ? <button className="btn btn-ghost" onClick={() => setStep(s => s - 1)}>← Back</button>
            : <div />
          }
          {step < TOTAL_STEPS
            ? <button id="setup-next-btn" className="btn btn-primary" onClick={() => setStep(s => s + 1)} disabled={!canNext()}>Continue →</button>
            : <button id="setup-finish-btn" className="btn btn-primary" onClick={handleFinish} disabled={saving}>{saving ? "Saving..." : "🚀 Start Chatting"}</button>
          }
        </div>
      </div>
    </div>
  );
}
