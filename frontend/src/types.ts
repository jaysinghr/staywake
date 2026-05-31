export type MissionType = "math" | "typing" | "shake" | "qr" | "step";
export type Difficulty = "easy" | "medium" | "hard";
export type StayAwakeMode = "light" | "standard" | "strict";

export interface Alarm {
  id: string;
  label: string;
  hour: number; // 0-23
  minute: number; // 0-59
  enabled: boolean;
  repeatDays: number[]; // 0=Sun ... 6=Sat ; [] = one-time
  missionType: MissionType;
  difficulty: Difficulty; // mission target / intensity
  stayAwakeMode: StayAwakeMode;
  sound: string; // sound id
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
  dismissMission: Exclude<MissionType, "random">;
  difficulty: Difficulty;
  mode: StayAwakeMode;
  phase: SessionPhase;
  fast: boolean;
  checkpointsMs: number[]; // offsets from missionCompletedAt
  checkInTotal: number;
  checkInsPassed: number;
  checkInsMissed: number;
  reAlarms: number;
  currentIndex: number;
  nextCheckInAt: number | null;
  ringAt: number;
  missionCompletedAt: number | null;
  cycle: number;
  startedAt: number;
}

export type MorningStatus = "in-progress" | "success" | "recovered" | "failed";

export interface MorningRecord {
  id: string;
  alarmId: string;
  label: string;
  dateKey: string; // YYYY-MM-DD
  displayTime: string;
  missionType: MissionType;
  mode: StayAwakeMode;
  scheduledAt: string;
  ringAt: string;
  missionCompletedAt?: string;
  completedAt?: string;
  status: MorningStatus;
  checkInTotal: number;
  checkInsPassed: number;
  checkInsMissed: number;
  reAlarms: number;
  wakeScore: number;
}

export interface Settings {
  defaultMission: MissionType;
  defaultMode: StayAwakeMode;
  defaultSound: string;
  hapticsEnabled: boolean;
}

export interface AppMeta {
  onboardingDone: boolean;
  isPro: boolean;
}
