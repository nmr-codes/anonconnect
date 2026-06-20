"use client";
import { INTERESTS } from "../lib/constants";

interface Props {
  selected: string[];
  onChange: (selected: string[]) => void;
  max?: number;
}

export default function InterestSelector({ selected, onChange, max = 10 }: Props) {
  const toggle = (interest: string) => {
    if (selected.includes(interest)) {
      onChange(selected.filter((i) => i !== interest));
    } else if (selected.length < (max ?? INTERESTS.length)) {
      onChange([...selected, interest]);
    }
  };

  return (
    <div className="interest-grid">
      {INTERESTS.map((interest) => (
        <button
          key={interest}
          type="button"
          className={`interest-tag ${selected.includes(interest) ? "selected" : ""}`}
          onClick={() => toggle(interest)}
          id={`interest-${interest.toLowerCase()}`}
        >
          {interestEmoji(interest)} {interest}
        </button>
      ))}
      {max && (
        <p className="interest-count">
          {selected.length}/{max} selected
        </p>
      )}
    </div>
  );
}

function interestEmoji(interest: string): string {
  const map: Record<string, string> = {
    Music: "🎵", Gaming: "🎮", Movies: "🎬", Books: "📚", Travel: "✈️",
    Cooking: "🍳", Fitness: "💪", Photography: "📷", Art: "🎨",
    Technology: "💻", Science: "🔬", Sports: "⚽", Fashion: "👗",
    Nature: "🌿", Anime: "🌸", Coding: "👨‍💻", Design: "✏️", Yoga: "🧘",
    Dancing: "💃", Writing: "✍️", Podcasts: "🎙️", History: "🏛️",
    Politics: "🗳️", Finance: "💰", Languages: "🌍", Pets: "🐾",
    Cars: "🚗", Space: "🚀", Psychology: "🧠", Philosophy: "🤔",
  };
  return map[interest] || "⭐";
}
