import { Difficulty, MorningRecord, StayAwakeMode } from "../types";
import { dateKey } from "./time";

const DIFFICULTY_ORDER: Difficulty[] = ["easy", "medium", "hard"];

// Smart difficulty: if recent mornings on this alarm were rough (failed,
// snoozed, re-alarmed, or low score), bump the mission difficulty up so it
// actually wakes them. Only escalates, never eases below the chosen level.
export function adjustedDifficulty(
  base: Difficulty,
  history: MorningRecord[],
  alarmId: string,
): { difficulty: Difficulty; escalated: boolean } {
  const recent = history
    .filter((h) => h.alarmId === alarmId && h.status !== "in-progress")
    .slice(0, 3);
  if (recent.length === 0) return { difficulty: base, escalated: false };

  const struggles = recent.filter(
    (r) =>
      r.status === "failed" ||
      r.reAlarms > 0 ||
      (r.snoozesUsed ?? 0) > 0 ||
      r.wakeScore < 50,
  ).length;

  const steps = struggles >= 3 ? 2 : struggles >= 2 ? 1 : 0;
  if (steps === 0) return { difficulty: base, escalated: false };

  const idx = Math.min(DIFFICULTY_ORDER.indexOf(base) + steps, DIFFICULTY_ORDER.length - 1);
  const difficulty = DIFFICULTY_ORDER[idx];
  return { difficulty, escalated: difficulty !== base };
}

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
  snoozesUsed?: number;
}

// Simple, understandable wake score out of 100.
export function computeWakeScore({
  ringToMissionSec,
  checkInsMissed,
  reAlarms,
  snoozesUsed = 0,
}: ScoreInput): number {
  let score = 100;
  // Late mission completion: grace of 2 min, then -5 per extra minute (max -15)
  if (ringToMissionSec > 120) {
    const extraMin = Math.floor((ringToMissionSec - 120) / 60) + 1;
    score -= Math.min(15, extraMin * 5);
  }
  score -= checkInsMissed * 15;
  score -= reAlarms * 10;
  score -= snoozesUsed * 8;
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function scoreGrade(score: number): { label: string } {
  if (score >= 90) return { label: "Elite" };
  if (score >= 75) return { label: "Strong" };
  if (score >= 50) return { label: "Decent" };
  return { label: "Rough" };
}

// A bit of attitude for the win screen — encouraging, never shaming. Picks a
// line based on how clean the wake-up was and how hot the streak is.
export function hypeLine(score: number, streak: number): string {
  if (streak >= 7) {
    const lines = [
      `${streak} days straight. The bed gave up on you.`,
      `${streak}-day streak. You're built different now.`,
      `Day ${streak}. Mornings work for you, not the other way around.`,
    ];
    return lines[streak % lines.length];
  }
  if (score >= 90) {
    const lines = [
      "Flawless. You didn't just wake up — you woke up *correctly*.",
      "Elite wake-up. The snooze button is shaking.",
      "Zero hesitation. That's how it's done.",
    ];
    return lines[score % lines.length];
  }
  if (score >= 50) {
    const lines = [
      "You beat the bed. Slightly groggy, fully up.",
      "Solid. The morning blinked first.",
      "Up and moving. Tomorrow, go cleaner.",
    ];
    return lines[score % lines.length];
  }
  return [
    "Rough one — but you still got up. That's the whole game.",
    "Messy win is still a win. You're vertical.",
    "Not pretty, but you didn't quit. Respect.",
  ][score % 3];
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

export function wonToday(history: MorningRecord[]): boolean {
  return winningDays(history).has(dateKey());
}

// Minutes since local midnight for an ISO timestamp.
function timeOfDayMinutes(iso: string): number {
  const d = new Date(iso);
  return d.getHours() * 60 + d.getMinutes();
}

function wakeRecords(history: MorningRecord[]): MorningRecord[] {
  return history.filter(
    (h) => WIN_STATUSES.includes(h.status) && !!h.missionCompletedAt,
  );
}

function averageWakeMinutes(recs: MorningRecord[]): number | null {
  if (recs.length === 0) return null;
  const sum = recs.reduce((s, h) => s + timeOfDayMinutes(h.missionCompletedAt!), 0);
  return Math.round(sum / recs.length);
}

// Average actual wake time over the last week, plus how that compares to the
// previous two weeks. Positive deltaMin means you're waking up EARLIER now.
export function wakeTimeTrend(history: MorningRecord[]): {
  avgMinutes: number | null;
  deltaMin: number | null;
  sampleSize: number;
} {
  const recs = wakeRecords(history);
  if (recs.length === 0) return { avgMinutes: null, deltaMin: null, sampleSize: 0 };

  const now = Date.now();
  const DAY = 86400000;
  const ageDays = (h: MorningRecord) => (now - new Date(h.dateKey).getTime()) / DAY;
  const recent = recs.filter((h) => ageDays(h) <= 7);
  const prior = recs.filter((h) => ageDays(h) > 7 && ageDays(h) <= 21);

  const sample = recent.length ? recent : recs;
  const avgMinutes = averageWakeMinutes(sample);
  const avgPrior = averageWakeMinutes(prior);
  const deltaMin =
    avgMinutes != null && avgPrior != null ? avgPrior - avgMinutes : null;

  return { avgMinutes, deltaMin, sampleSize: sample.length };
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
