import { MorningRecord, StayAwakeMode } from "../types";
import { dateKey } from "./time";

export interface StayAwakeModeConfig {
  id: StayAwakeMode;
  label: string;
  desc: string;
  checkpoints: number[]; // minutes after waking
  pro: boolean;
}

export const STAY_AWAKE_MODES: Record<StayAwakeMode, StayAwakeModeConfig> = {
  light: {
    id: "light",
    label: "Light",
    desc: "1 check-in · 5 min after",
    checkpoints: [5],
    pro: false,
  },
  standard: {
    id: "standard",
    label: "Standard",
    desc: "2 check-ins · 3 & 7 min",
    checkpoints: [3, 7],
    pro: false,
  },
  strict: {
    id: "strict",
    label: "Strict",
    desc: "3 check-ins · 3, 7 & 15 min",
    checkpoints: [3, 7, 15],
    pro: true,
  },
};

// Convert checkpoints (minutes) into millisecond offsets from mission completion.
// Fast (test) mode compresses everything into short seconds for instant demos.
export function checkpointOffsets(mode: StayAwakeMode, fast: boolean): number[] {
  const cps = STAY_AWAKE_MODES[mode].checkpoints;
  if (fast) return cps.map((_, i) => (i + 1) * 8000); // 8s, 16s, 24s...
  return cps.map((m) => m * 60000);
}

export interface ScoreInput {
  ringToMissionSec: number;
  checkInsMissed: number;
  reAlarms: number;
}

// Simple, understandable wake score out of 100.
export function computeWakeScore({
  ringToMissionSec,
  checkInsMissed,
  reAlarms,
}: ScoreInput): number {
  let score = 100;
  // Late mission completion: grace of 2 min, then -5 per extra minute (max -15)
  if (ringToMissionSec > 120) {
    const extraMin = Math.floor((ringToMissionSec - 120) / 60) + 1;
    score -= Math.min(15, extraMin * 5);
  }
  score -= checkInsMissed * 15;
  score -= reAlarms * 10;
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function scoreGrade(score: number): { label: string } {
  if (score >= 90) return { label: "Elite" };
  if (score >= 75) return { label: "Strong" };
  if (score >= 50) return { label: "Decent" };
  return { label: "Rough" };
}

const WIN_STATUSES = ["success", "recovered"];

function winningDays(history: MorningRecord[]): Set<string> {
  return new Set(
    history.filter((h) => WIN_STATUSES.includes(h.status)).map((h) => h.dateKey),
  );
}

export function currentStreak(history: MorningRecord[]): number {
  const days = winningDays(history);
  if (days.size === 0) return 0;
  let streak = 0;
  const cursor = new Date();
  if (!days.has(dateKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
    if (!days.has(dateKey(cursor))) return 0;
  }
  while (days.has(dateKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function bestStreak(history: MorningRecord[]): number {
  const days = [...winningDays(history)].sort();
  if (days.length === 0) return 0;
  let best = 1;
  let run = 1;
  for (let i = 1; i < days.length; i++) {
    const prev = new Date(days[i - 1]);
    const cur = new Date(days[i]);
    const diff = Math.round((cur.getTime() - prev.getTime()) / 86400000);
    if (diff === 1) {
      run += 1;
      best = Math.max(best, run);
    } else {
      run = 1;
    }
  }
  return best;
}

// Successful mornings within the current Monday-Sunday week.
export function weeklyWins(history: MorningRecord[]): number {
  const now = new Date();
  const day = now.getDay(); // 0 Sun..6 Sat
  const mondayOffset = day === 0 ? 6 : day - 1;
  const monday = new Date(now);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(now.getDate() - mondayOffset);
  const days = winningDays(history);
  let count = 0;
  for (const d of days) {
    const dt = new Date(d);
    if (dt.getTime() >= monday.getTime()) count += 1;
  }
  return count;
}

export function totalWins(history: MorningRecord[]): number {
  return winningDays(history).size;
}

export interface Challenge {
  id: string;
  label: string;
  target: number;
  value: number;
}

export function computeChallenges(history: MorningRecord[]): Challenge[] {
  return [
    {
      id: "week3",
      label: "3 successful mornings this week",
      target: 3,
      value: Math.min(3, weeklyWins(history)),
    },
    {
      id: "streak7",
      label: "Maintain a 7-day streak",
      target: 7,
      value: Math.min(7, currentStreak(history)),
    },
    {
      id: "total5",
      label: "Complete 5 total wake-ups",
      target: 5,
      value: Math.min(5, totalWins(history)),
    },
  ];
}
