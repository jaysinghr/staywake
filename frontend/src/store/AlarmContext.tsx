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
import { configureNotifications, syncNotifications } from "@/src/lib/notifications";
import {
  adjustedDifficulty,
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
// Earn-snooze: one short snooze per session, granted only after the mission.
const SNOOZE_PER_SESSION = 1;
const SNOOZE_MS = 4 * 60000;
const SNOOZE_MS_FAST = 8000;

const DEFAULT_SETTINGS: Settings = {
  defaultMission: "math",
  defaultMode: "standard",
  defaultSound: "classic",
  hapticsEnabled: true,
  bedtimeEnabled: false,
  bedtimeHour: 22,
  bedtimeMinute: 30,
};

const DEFAULT_META: AppMeta = { onboardingDone: false, isPro: false };

const DEFAULT_ALARM: Alarm = {
  id: "sample-wakeup",
  label: "Wake Up",
  emoji: "⏰",
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
  requestSnooze: () => void;
  endSnoozeEarly: () => void;
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
  const historyRef = useRef<MorningRecord[]>([]);
  const settingsRef = useRef<Settings>(DEFAULT_SETTINGS);
  const firedKeys = useRef<Set<string>>(new Set());
  const audioRef = useRef<any>(null);
  const audioSoundId = useRef<string>("");
  const hapticTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const volumeTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  sessionRef.current = session;
  alarmsRef.current = alarms;
  historyRef.current = history;
  settingsRef.current = settings;

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
      configureNotifications().then(() => syncNotifications(a, s));
    })();
  }, []);

  const persistAlarms = useCallback(async (next: Alarm[]) => {
    setAlarms(next);
    await storage.setItem(ALARMS_KEY, JSON.stringify(next));
    syncNotifications(next, settingsRef.current);
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
        // Escalate volume: gentle start (30%) ramping to full over ~25s so it
        // wakes heavy sleepers without jolting light ones.
        if (volumeTimer.current) {
          clearInterval(volumeTimer.current);
          volumeTimer.current = null;
        }
        let vol = 0.3;
        try {
          audioRef.current.volume = vol;
        } catch {
          // some platforms ignore volume; full-volume loop still rings
        }
        audioRef.current.play();
        volumeTimer.current = setInterval(() => {
          vol = Math.min(1, vol + 0.07);
          try {
            if (audioRef.current) audioRef.current.volume = vol;
          } catch {
            // ignore
          }
          if (vol >= 1 && volumeTimer.current) {
            clearInterval(volumeTimer.current);
            volumeTimer.current = null;
          }
        }, 2000);
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
    if (volumeTimer.current) {
      clearInterval(volumeTimer.current);
      volumeTimer.current = null;
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
        if (
          s.phase === "snoozed" &&
          s.snoozeUntil &&
          Date.now() >= s.snoozeUntil
        ) {
          setSession((prev) =>
            prev && prev.phase === "snoozed"
              ? {
                  ...prev,
                  phase: "ringing",
                  cycle: prev.cycle + 1,
                  snoozeUntil: null,
                  ringAt: Date.now(),
                }
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
      const dismiss = alarm.missionType;
      const { difficulty: effDifficulty, escalated } = adjustedDifficulty(
        alarm.difficulty,
        historyRef.current,
        alarm.id,
      );
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
        snoozesUsed: 0,
        wakeScore: 0,
      };
      upsertRecord(record);
      setSession({
        recordId: record.id,
        alarmId: alarm.id,
        label: alarm.label,
        displayTime: displayTime(alarm.hour, alarm.minute),
        dismissMission: dismiss,
        difficulty: effDifficulty,
        escalated,
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
        snoozesLeft: SNOOZE_PER_SESSION,
        snoozeIntent: false,
        snoozeUntil: null,
        snoozesUsed: 0,
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

  // When the user taps a fired alarm notification, open the ring flow.
  useEffect(() => {
    let sub: any;
    let mounted = true;
    (async () => {
      if (Platform.OS === "web") return;
      try {
        const N = await import("expo-notifications");
        if (!mounted) return;
        sub = N.addNotificationResponseReceivedListener((resp) => {
          const alarmId = resp?.notification?.request?.content?.data?.alarmId as
            | string
            | undefined;
          if (!alarmId || sessionRef.current) return;
          const alarm = alarmsRef.current.find((a) => a.id === alarmId);
          if (alarm) startSession(alarm, false);
        });
      } catch {
        // ignore
      }
    })();
    return () => {
      mounted = false;
      sub?.remove?.();
    };
  }, [startSession]);

  const beginDismissMission = useCallback(() => {
    setSession((prev) => (prev ? { ...prev, phase: "dismiss-mission" } : prev));
  }, []);

  // Earn-snooze: route through the dismiss mission with snoozeIntent set. The
  // mission still has to be solved before the snooze is granted.
  const requestSnooze = useCallback(() => {
    setSession((prev) =>
      prev && prev.snoozesLeft > 0
        ? { ...prev, phase: "dismiss-mission", snoozeIntent: true }
        : prev,
    );
  }, []);

  // End an active snooze early and ring again immediately.
  const endSnoozeEarly = useCallback(() => {
    setSession((prev) =>
      prev && prev.phase === "snoozed"
        ? { ...prev, phase: "ringing", cycle: prev.cycle + 1, snoozeUntil: null, ringAt: Date.now() }
        : prev,
    );
  }, []);

  const finalizeSuccess = useCallback((s: WakeSession) => {
    const ringToMissionSec = s.missionCompletedAt
      ? Math.round((s.missionCompletedAt - s.ringAt) / 1000)
      : 0;
    const score = computeWakeScore({
      ringToMissionSec,
      checkInsMissed: s.checkInsMissed,
      reAlarms: s.reAlarms,
      snoozesUsed: s.snoozesUsed,
    });
    const status =
      s.checkInsMissed > 0 || s.reAlarms > 0 || s.snoozesUsed > 0
        ? "recovered"
        : "success";
    patchRecord(s.recordId, {
      status,
      completedAt: new Date().toISOString(),
      checkInsPassed: s.checkInTotal,
      checkInsMissed: s.checkInsMissed,
      reAlarms: s.reAlarms,
      snoozesUsed: s.snoozesUsed,
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
    // Snooze was earned by solving this mission: grant it now (once per session).
    if (prev && prev.snoozeIntent && prev.snoozesLeft > 0) {
      const snoozeMs = prev.fast ? SNOOZE_MS_FAST : SNOOZE_MS;
      const used = prev.snoozesUsed + 1;
      patchRecord(prev.recordId, { snoozesUsed: used });
      setSession({
        ...prev,
        phase: "snoozed",
        snoozeIntent: false,
        snoozesLeft: prev.snoozesLeft - 1,
        snoozesUsed: used,
        snoozeUntil: Date.now() + snoozeMs,
      });
      return;
    }
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
  }, [onDismissPassed, patchRecord]);

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
      // Bedtime reminder depends on settings — reschedule when these change.
      if (
        patch.bedtimeEnabled !== undefined ||
        patch.bedtimeHour !== undefined ||
        patch.bedtimeMinute !== undefined
      ) {
        syncNotifications(alarmsRef.current, next);
      }
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
      requestSnooze,
      endSnoozeEarly,
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
      requestSnooze,
      endSnoozeEarly,
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
