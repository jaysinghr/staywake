export type MissionType = "math" | "typing" | "shake" | "random";
export type Difficulty = "easy" | "medium" | "hard";

export interface Alarm {
  id: string;
  label: string;
  hour: number; // 0-23
  minute: number; // 0-59
  enabled: boolean;
  repeatDays: number[]; // 0=Sun ... 6=Sat ; [] = one-time
  missionType: MissionType;
  difficulty: Difficulty;
  checkInCount: number;
  checkInIntervalMin: number;
  sound: boolean;
  createdAt: string;
}

export type SessionPhase =
  | "ringing"
  | "dismiss-mission"
  | "awake"
  | "checkin-ringing"
  | "checkin-mission"
  | "success";

export interface WakeSession {
  recordId: string;
  alarmId: string;
  label: string;
  displayTime: string;
  // resolved (never "random") mission used to dismiss the alarm
  dismissMission: Exclude<MissionType, "random">;
  difficulty: Difficulty;
  phase: SessionPhase;
  fast: boolean;
  checkInTotal: number;
  checkInsPassed: number;
  intervalMs: number;
  nextCheckInAt: number | null;
  misses: number;
  cycle: number;
  startedAt: number;
}

export type MorningStatus = "in-progress" | "success" | "failed";

export interface MorningRecord {
  id: string;
  alarmId: string;
  label: string;
  dateKey: string; // YYYY-MM-DD
  displayTime: string;
  firedAt: string;
  completedAt?: string;
  status: MorningStatus;
  checkInTotal: number;
  checkInsPassed: number;
  misses: number;
}
