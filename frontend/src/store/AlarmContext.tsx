import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Platform } from "react-native";
import * as Haptics from "expo-haptics";

import { storage } from "@/src/utils/storage";
import {
  Alarm,
  AppMeta,
  MorningRecord,
  Settings,
  WakeSession,
} from "@/src/types";
import { dateKey, displayTime } from "@/src/lib/time";
import { resolveDismissMission } from "@/src/lib/missions";
import {
  checkpointOffsets,
  computeWakeScore,
  STAY_AWAKE_MODES,
} from "@/src/lib/staywake";
import { soundById } from "@/src/lib/sounds";

const ALARMS_KEY = "staywake.alarms.v2";
const HISTORY_KEY = "staywake.history.v2";
const SETTINGS_KEY = "staywake.settings.v1";
const META_KEY = "staywake.meta.v1";

export const FREE_ALARM_LIMIT = 2;
const FAST_RERING_GRACE = 6000;

const DEFAULT_SETTINGS: Settings = {
  defaultMission: "math",
  defaultMode: "standard",
  defaultSound: "classic",
  hapticsEnabled: true,
};

const DEFAULT_META: AppMeta = { onboardingDone: false, isPro: false };

const DEFAULT_ALARM: Alarm = {
  id: "sample-wakeup",
  label: "Wake Up",
  hour: 7,
  minute: 0,
  enabled: false,
  repeatDays: [1, 2, 3, 4, 5],
  missionType: "math",
  difficulty: "easy",
  stayAwakeMode: "standard",
  sound: "classic",
  createdAt: new Date().toISOString(),
};

interface AlarmContextValue {
  alarms: Alarm[];
  history: MorningRecord[];
  session: WakeSession | null;
  settings: Settings;
  meta: AppMeta;
  loading: boolean;
  isPro: boolean;
  addAlarm: (a: Omit<Alarm, "id" | "createdAt">) => Promise<void>;
  updateAlarm: (id: string, patch: Partial<Alarm>) => Promise<void>;
  deleteAlarm: (id: string) => Promise<void>;
  toggleAlarm: (id: string, enabled: boolean) => Promise<void>;
  getAlarm: (id: string) => Alarm | undefined;
  fireAlarmNow: (id: string) => void;
  beginDismissMission: () => void;
  onDismissPassed: () => void;
  beginCheckInMission: () => void;
  onCheckInPassed: () => void;
  onCheckInMissed: () => void;
  clearSession: () => void;
  abandonSession: () => void;
  updateSettings: (patch: Partial<Settings>) => Promise<void>;
  completeOnboarding: () => Promise<void>;
  setPro: (value: boolean) => Promise<void>;
  resetData: () => Promise<void>;
}

const AlarmContext = createContext<AlarmContextValue | null>(null);

export function useAlarm() {
  const ctx = useContext(AlarmContext);
  if (!ctx) throw new Error("useAlarm must be used within AlarmProvider");
  return ctx;
}

function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function safeParse<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function AlarmProvider({ children }: { children: React.ReactNode }) {
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [history, setHistory] = useState<MorningRecord[]>([]);
  const [session, setSession] = useState<WakeSession | null>(null);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [meta, setMeta] = useState<AppMeta>(DEFAULT_META);
  const [loading, setLoading] = useState(true);

  const sessionRef = useRef<WakeSession | null>(null);
  const alarmsRef = useRef<Alarm[]>([]);
  const firedKeys = useRef<Set<string>>(new Set());
  const audioRef = useRef<any>(null);
  const audioSoundId = useRef<string>("");
  const hapticTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  sessionRef.current = session;
  alarmsRef.current = alarms;

  // ---- load ----
  useEffect(() => {
    (async () => {
      const [aRaw, hRaw, sRaw, mRaw] = await Promise.all([
        storage.getItem<string>(ALARMS_KEY, ""),
        storage.getItem<string>(HISTORY_KEY, ""),
        storage.getItem<string>(SETTINGS_KEY, ""),
        storage.getItem<string>(META_KEY, ""),
      ]);
      let a = safeParse<Alarm[]>(aRaw, []);
      const h = safeParse<MorningRecord[]>(hRaw, []);
      const s = { ...DEFAULT_SETTINGS, ...safeParse<Partial<Settings>>(sRaw, {}) };
      const m = { ...DEFAULT_META, ...safeParse<Partial<AppMeta>>(mRaw, {}) };
      if (!aRaw) {
        a = [DEFAULT_ALARM];
        await storage.setItem(ALARMS_KEY, JSON.stringify(a));
      }
      setAlarms(a);
      setHistory(h);
      setSettings(s);
      setMeta(m);
      setLoading(false);
    })();
  }, []);

  const persistAlarms = useCallback(async (next: Alarm[]) => {
    setAlarms(next);
    await storage.setItem(ALARMS_KEY, JSON.stringify(next));
  }, []);

  const writeHistory = useCallback((next: MorningRecord[]) => {
    storage.setItem(HISTORY_KEY, JSON.stringify(next));
  }, []);

  const upsertRecord = useCallback(
    (record: MorningRecord) => {
      setHistory((prev) => {
        const idx = prev.findIndex((r) => r.id === record.id);
        const next = idx >= 0 ? [...prev] : [record, ...prev];
        if (idx >= 0) next[idx] = record;
        writeHistory(next);
        return next;
      });
    },
    [writeHistory],
  );

  const patchRecord = useCallback(
    (id: string, patch: Partial<MorningRecord>) => {
      setHistory((prev) => {
        const next = prev.map((r) => (r.id === id ? { ...r, ...patch } : r));
        writeHistory(next);
        return next;
      });
    },
    [writeHistory],
  );

  // ---- audio + haptics ----
  const startAlarmFx = useCallback(
    async (soundId: string) => {
      if (settings.hapticsEnabled && !hapticTimer.current) {
        const buzz = () =>
          Haptics.notificationAsync(
            Haptics.NotificationFeedbackType.Warning,
          ).catch(() => {});
        buzz();
        hapticTimer.current = setInterval(buzz, 1200);
      }
      try {
        const { createAudioPlayer, setAudioModeAsync } = await import("expo-audio");
        try {
          await setAudioModeAsync({ playsInSilentMode: true } as any);
        } catch {
          // ignore
        }
        if (audioRef.current && audioSoundId.current !== soundId) {
          try {
            audioRef.current.remove();
          } catch {
            // ignore
          }
          audioRef.current = null;
        }
        if (!audioRef.current) {
          audioRef.current = createAudioPlayer({ uri: soundById(soundId).uri });
          audioRef.current.loop = true;
          audioSoundId.current = soundId;
        }
        audioRef.current.seekTo?.(0);
        audioRef.current.play();
      } catch {
        // sound optional
      }
    },
    [settings.hapticsEnabled],
  );

  const stopAlarmFx = useCallback(() => {
    if (hapticTimer.current) {
      clearInterval(hapticTimer.current);
      hapticTimer.current = null;
    }
    try {
      audioRef.current?.pause();
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    const ringing =
      session?.phase === "ringing" || session?.phase === "checkin-ringing";
    const alarm = session ? alarmsRef.current.find((x) => x.id === session.alarmId) : null;
    if (ringing) {
      startAlarmFx(alarm?.sound ?? settings.defaultSound);
    } else {
      stopAlarmFx();
    }
    return () => {
      if (!session) stopAlarmFx();
    };
  }, [session?.phase, session?.cycle, startAlarmFx, stopAlarmFx, session, settings.defaultSound]);

  // ---- scheduler ----
  useEffect(() => {
    const tick = () => {
      const s = sessionRef.current;
      if (s) {
        if (
          s.phase === "awake" &&
          s.nextCheckInAt &&
          Date.now() >= s.nextCheckInAt
        ) {
          setSession((prev) =>
            prev && prev.phase === "awake"
              ? { ...prev, phase: "checkin-ringing", nextCheckInAt: null }
              : prev,
          );
        }
        return;
      }
      const now = new Date();
      if (now.getSeconds() >= 4) return;
      for (const alarm of alarmsRef.current) {
        if (!alarm.enabled) continue;
        if (alarm.hour !== now.getHours() || alarm.minute !== now.getMinutes()) continue;
        const repeats = alarm.repeatDays.length > 0;
        if (repeats && !alarm.repeatDays.includes(now.getDay())) continue;
        const key = `${alarm.id}-${dateKey(now)}-${alarm.hour}-${alarm.minute}`;
        if (firedKeys.current.has(key)) continue;
        firedKeys.current.add(key);
        startSession(alarm, false);
        if (!repeats) {
          persistAlarms(
            alarmsRef.current.map((x) =>
              x.id === alarm.id ? { ...x, enabled: false } : x,
            ),
          );
        }
        break;
      }
    };
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- session lifecycle ----
  const startSession = useCallback(
    (alarm: Alarm, fast: boolean) => {
      const dismiss = resolveDismissMission(alarm.missionType);
      const offsets = checkpointOffsets(alarm.stayAwakeMode, fast);
      const total = offsets.length;
      const now = Date.now();
      const record: MorningRecord = {
        id: uid(),
        alarmId: alarm.id,
        label: alarm.label,
        dateKey: dateKey(),
        displayTime: displayTime(alarm.hour, alarm.minute),
        missionType: alarm.missionType,
        mode: alarm.stayAwakeMode,
        scheduledAt: new Date().toISOString(),
        ringAt: new Date().toISOString(),
        status: "in-progress",
        checkInTotal: total,
        checkInsPassed: 0,
        checkInsMissed: 0,
        reAlarms: 0,
        wakeScore: 0,
      };
      upsertRecord(record);
      setSession({
        recordId: record.id,
        alarmId: alarm.id,
        label: alarm.label,
        displayTime: displayTime(alarm.hour, alarm.minute),
        dismissMission: dismiss,
        difficulty: alarm.difficulty,
        mode: alarm.stayAwakeMode,
        phase: "ringing",
        fast,
        checkpointsMs: offsets,
        checkInTotal: total,
        checkInsPassed: 0,
        checkInsMissed: 0,
        reAlarms: 0,
        currentIndex: 0,
        nextCheckInAt: null,
        ringAt: now,
        missionCompletedAt: null,
        cycle: 0,
        startedAt: now,
      });
    },
    [upsertRecord],
  );

  const fireAlarmNow = useCallback(
    (id: string) => {
      const alarm = alarmsRef.current.find((a) => a.id === id);
      if (alarm) startSession(alarm, true);
    },
    [startSession],
  );

  const beginDismissMission = useCallback(() => {
    setSession((prev) => (prev ? { ...prev, phase: "dismiss-mission" } : prev));
  }, []);

  const finalizeSuccess = useCallback((s: WakeSession) => {
    const ringToMissionSec = s.missionCompletedAt
      ? Math.round((s.missionCompletedAt - s.ringAt) / 1000)
      : 0;
    const score = computeWakeScore({
      ringToMissionSec,
      checkInsMissed: s.checkInsMissed,
      reAlarms: s.reAlarms,
    });
    const status = s.checkInsMissed > 0 || s.reAlarms > 0 ? "recovered" : "success";
    patchRecord(s.recordId, {
      status,
      completedAt: new Date().toISOString(),
      checkInsPassed: s.checkInTotal,
      checkInsMissed: s.checkInsMissed,
      reAlarms: s.reAlarms,
      wakeScore: score,
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  }, [patchRecord]);

  const onDismissPassed = useCallback(() => {
    setSession((prev) => {
      if (!prev) return prev;
      const completedAt = Date.now();
      patchRecord(prev.recordId, {
        missionCompletedAt: new Date().toISOString(),
      });
      if (prev.checkInTotal <= 0) {
        const done = { ...prev, missionCompletedAt: completedAt };
        finalizeSuccess(done);
        return { ...done, phase: "success" };
      }
      return {
        ...prev,
        missionCompletedAt: completedAt,
        phase: "awake",
        currentIndex: 0,
        nextCheckInAt: completedAt + prev.checkpointsMs[0],
      };
    });
  }, [finalizeSuccess, patchRecord]);

  const beginCheckInMission = useCallback(() => {
    setSession((prev) => (prev ? { ...prev, phase: "checkin-mission" } : prev));
  }, []);

  const onCheckInPassed = useCallback(() => {
    setSession((prev) => {
      if (!prev) return prev;
      const passed = prev.checkInsPassed + 1;
      const nextIndex = prev.currentIndex + 1;
      patchRecord(prev.recordId, { checkInsPassed: passed });
      if (nextIndex >= prev.checkInTotal) {
        const done = { ...prev, checkInsPassed: passed };
        finalizeSuccess(done);
        return { ...done, phase: "success" };
      }
      const base = prev.missionCompletedAt ?? Date.now();
      return {
        ...prev,
        checkInsPassed: passed,
        currentIndex: nextIndex,
        phase: "awake",
        nextCheckInAt: base + prev.checkpointsMs[nextIndex],
      };
    });
  }, [finalizeSuccess, patchRecord]);

  const onCheckInMissed = useCallback(() => {
    setSession((prev) => {
      if (!prev) return prev;
      const missed = prev.checkInsMissed + 1;
      const reAlarms = prev.reAlarms + 1;
      patchRecord(prev.recordId, { checkInsMissed: missed, reAlarms });
      return {
        ...prev,
        checkInsMissed: missed,
        reAlarms,
        phase: "ringing",
        cycle: prev.cycle + 1,
        nextCheckInAt: null,
      };
    });
  }, [patchRecord]);

  // After a missed check-in re-ring, dismissing returns to the SAME pending
  // check-in shortly after.
  const clearSession = useCallback(() => {
    stopAlarmFx();
    setSession(null);
  }, [stopAlarmFx]);

  const abandonSession = useCallback(() => {
    setSession((prev) => {
      if (prev) patchRecord(prev.recordId, { status: "failed" });
      return null;
    });
    stopAlarmFx();
  }, [stopAlarmFx, patchRecord]);

  // override onDismissPassed when this dismiss was a re-ring (cycle>0): resume
  // the pending checkpoint quickly instead of advancing.
  const onDismissPassedWrapped = useCallback(() => {
    const prev = sessionRef.current;
    if (prev && prev.cycle > 0 && prev.missionCompletedAt) {
      const grace = prev.fast ? FAST_RERING_GRACE : 60000;
      setSession({
        ...prev,
        phase: "awake",
        nextCheckInAt: Date.now() + grace,
      });
      return;
    }
    onDismissPassed();
  }, [onDismissPassed]);

  // ---- alarm CRUD ----
  const addAlarm = useCallback(
    async (a: Omit<Alarm, "id" | "createdAt">) => {
      const alarm: Alarm = { ...a, id: uid(), createdAt: new Date().toISOString() };
      await persistAlarms([alarm, ...alarmsRef.current]);
    },
    [persistAlarms],
  );

  const updateAlarm = useCallback(
    async (id: string, patch: Partial<Alarm>) => {
      await persistAlarms(
        alarmsRef.current.map((x) => (x.id === id ? { ...x, ...patch } : x)),
      );
    },
    [persistAlarms],
  );

  const deleteAlarm = useCallback(
    async (id: string) => {
      await persistAlarms(alarmsRef.current.filter((x) => x.id !== id));
    },
    [persistAlarms],
  );

  const toggleAlarm = useCallback(
    async (id: string, enabled: boolean) => {
      if (Platform.OS !== "web" && settings.hapticsEnabled) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      }
      await persistAlarms(
        alarmsRef.current.map((x) => (x.id === id ? { ...x, enabled } : x)),
      );
    },
    [persistAlarms, settings.hapticsEnabled],
  );

  const getAlarm = useCallback(
    (id: string) => alarmsRef.current.find((a) => a.id === id),
    [],
  );

  // ---- settings / meta ----
  const updateSettings = useCallback(async (patch: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      storage.setItem(SETTINGS_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const completeOnboarding = useCallback(async () => {
    setMeta((prev) => {
      const next = { ...prev, onboardingDone: true };
      storage.setItem(META_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const setPro = useCallback(async (value: boolean) => {
    setMeta((prev) => {
      const next = { ...prev, isPro: value };
      storage.setItem(META_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const resetData = useCallback(async () => {
    await Promise.all([
      storage.removeItem(ALARMS_KEY),
      storage.removeItem(HISTORY_KEY),
    ]);
    firedKeys.current.clear();
    await persistAlarms([DEFAULT_ALARM]);
    setHistory([]);
    writeHistory([]);
  }, [persistAlarms, writeHistory]);

  const value: AlarmContextValue = useMemo(
    () => ({
      alarms,
      history,
      session,
      settings,
      meta,
      loading,
      isPro: meta.isPro,
      addAlarm,
      updateAlarm,
      deleteAlarm,
      toggleAlarm,
      getAlarm,
      fireAlarmNow,
      beginDismissMission,
      onDismissPassed: onDismissPassedWrapped,
      beginCheckInMission,
      onCheckInPassed,
      onCheckInMissed,
      clearSession,
      abandonSession,
      updateSettings,
      completeOnboarding,
      setPro,
      resetData,
    }),
    [
      alarms,
      history,
      session,
      settings,
      meta,
      loading,
      addAlarm,
      updateAlarm,
      deleteAlarm,
      toggleAlarm,
      getAlarm,
      fireAlarmNow,
      beginDismissMission,
      onDismissPassedWrapped,
      beginCheckInMission,
      onCheckInPassed,
      onCheckInMissed,
      clearSession,
      abandonSession,
      updateSettings,
      completeOnboarding,
      setPro,
      resetData,
    ],
  );

  return <AlarmContext.Provider value={value}>{children}</AlarmContext.Provider>;
}

export { STAY_AWAKE_MODES };
