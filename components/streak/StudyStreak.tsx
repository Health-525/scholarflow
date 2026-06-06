"use client";

import { useState, useEffect } from "react";
import { Flame } from "lucide-react";

const LS_KEY = "sf_study_days";
const MAX_WEEKS = 12;

export function StudyStreak() {
  const [streakData, setStreakData] = useState<boolean[]>([]);
  const [currentStreak, setCurrentStreak] = useState(0);

  useEffect(() => {
    // Build 12-week study calendar
    const weeks: boolean[] = [];
    const today = new Date();

    for (let i = MAX_WEEKS * 7 - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const studied = localStorage.getItem(`${LS_KEY}_${key}`) === "true";
      weeks.push(studied);
    }

    setStreakData(weeks);

    // Calculate current streak (from today backwards)
    let streak = 0;
    for (let i = weeks.length - 1; i >= 0; i--) {
      if (weeks[i]) streak++;
      else break;
    }
    setCurrentStreak(streak);
  }, []);

  // Mark today as studied
  const markToday = () => {
    const today = new Date();
    const key = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    localStorage.setItem(`${LS_KEY}_${key}`, "true");

    // Refresh
    const newData = [...streakData];
    newData[newData.length - 1] = true;
    setStreakData(newData);

    let streak = 0;
    for (let i = newData.length - 1; i >= 0; i--) {
      if (newData[i]) streak++;
      else break;
    }
    setCurrentStreak(streak);
  };

  // Group by weeks for the heatmap
  const weeks: boolean[][] = [];
  for (let i = 0; i < streakData.length; i += 7) {
    weeks.push(streakData.slice(i, i + 7));
  }

  return (
    <div className="rounded-2xl p-4" style={{ border: "1px solid var(--border)", backgroundColor: "var(--surface-card)" }}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Flame className="w-4 h-4" style={{ color: currentStreak > 0 ? "#f59e0b" : "var(--text-muted)" }} />
          <span className="text-[13px] font-semibold" style={{ color: "var(--text-primary)" }}>
            {currentStreak > 0 ? `连续 ${currentStreak} 天学习` : "学习记录"}
          </span>
        </div>
        <button
          onClick={markToday}
          className="text-[11px] px-3 py-1.5 rounded-lg font-medium transition-colors"
          style={{
            backgroundColor: streakData[streakData.length - 1] ? "var(--status-success)" : "var(--accent)",
            color: "#fff",
          }}
        >
          {streakData[streakData.length - 1] ? "今日已完成" : "今日已学习"}
        </button>
      </div>

      {/* GitHub-style heatmap */}
      <div className="flex gap-1">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-1">
            {week.map((day, di) => {
              const level = day ? 4 : 0; // active or not
              const colors = [
                "var(--border-subtle)",
                "rgba(42,68,148,0.15)",
                "rgba(42,68,148,0.3)",
                "rgba(42,68,148,0.5)",
                "var(--accent)",
              ];
              return (
                <div
                  key={`${wi}-${di}`}
                  className="w-3 h-3 rounded-sm transition-colors"
                  style={{ backgroundColor: colors[level] }}
                  title={`${12 - wi}周前 ${["日","一","二","三","四","五","六"][di]}`}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
