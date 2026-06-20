"use client";

interface Props {
  queueCount: number;
  onCancel: () => void;
}

export default function MatchmakingSpinner({ queueCount, onCancel }: Props) {
  return (
    <div className="matchmaking-container">
      <div className="matchmaking-card">
        <div className="spinner-rings">
          <div className="ring ring-1"></div>
          <div className="ring ring-2"></div>
          <div className="ring ring-3"></div>
          <div className="ring-center">🔍</div>
        </div>
        <h2 className="matchmaking-title">Finding your match...</h2>
        <p className="matchmaking-sub">
          Looking for someone with similar interests
        </p>
        <div className="queue-badge">
          <span className="pulse-dot"></span>
          {queueCount} {queueCount === 1 ? "person" : "people"} searching
        </div>
        <button
          className="btn btn-ghost mt-4"
          onClick={onCancel}
          id="cancel-matchmaking-btn"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
