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
import { Alarm, MorningRecord, WakeSession } from "@/src/types";
import { dateKey, displayTime } from "@/src/lib/time";
import { resolveMissionType } from "@/src/lib/missions";
import { ALARM_SOUND_URI } from "@/src/theme";

const ALARMS_KEY = "staywake.alarms.v1";
const HISTORY_KEY = "staywake.history.v1";

const FAST_INTERVAL_MS = 15000; // test-run check-in window
const FAST_RERING_MS = 6000;

interface AlarmContextValue {
  alarms: Alarm[];
  history: MorningRecord[];
  session: WakeSession | null;
  loading: boolean;
  addAlarm: (a: Omit<Alarm, "id" | "createdAt">) => Promise<void>;
  updateAlarm: (id: string, patch: Partial<Alarm>) => Promise<void>;
  deleteAlarm: (id: string) => Promise<void>;
  toggleAlarm: (id: string, enabled: boolean) => Promise<void>;
  getAlarm: (id: string) => Alarm | undefined;
  // session lifecycle
  fireAlarmNow: (id: string) => void;
  beginDismissMission: () => void;
  onDismissPassed: () => void;
  beginCheckInMission: () => void;
  onCheckInPassed: () => void;
  onCheckInMissed: () => void;
  clearSession: () => void;
  abandonSession: () => void;
  streak: number;
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

function computeStreak(history: MorningRecord[]): number {
  const successDays = new Set(
    history.filter((h) => h.status === "success").map((h) => h.dateKey),
  );
  if (successDays.size === 0) return 0;
  let streak = 0;
  const cursor = new Date();
  // Allow streak to count from today or yesterday
  if (!successDays.has(dateKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
    if (!successDays.has(dateKey(cursor))) return 0;
  }
  while (successDays.has(dateKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

const DEFAULT_ALARM: Alarm = {
  id: "sample-wakeup",
  label: "Wake Up",
  hour: 7,
  minute: 0,
  enabled: false,
  repeatDays: [1, 2, 3, 4, 5],
  missionType: "math",
  difficulty: "easy",
  checkInCount: 2,
  checkInIntervalMin: 5,
  sound: true,
  createdAt: new Date().toISOString(),
};

export function AlarmProvider({ children }: { children: React.ReactNode }) {
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [history, setHistory] = useState<MorningRecord[]>([]);
  const [session, setSession] = useState<WakeSession | null>(null);
  const [loading, setLoading] = useState(true);

  const sessionRef = useRef<WakeSession | null>(null);
  const alarmsRef = useRef<Alarm[]>([]);
  const firedKeys = useRef<Set<string>>(new Set());
  const audioRef = useRef<any>(null);
  const hapticTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  sessionRef.current = session;
  alarmsRef.current = alarms;

  // ---- persistence ----
  useEffect(() => {
    (async () => {
      const storedAlarms = await storage.getItem<string>(ALARMS_KEY, "");
      const storedHistory = await storage.getItem<string>(HISTORY_KEY, "");
      let a: Alarm[] = [];
      let h: MorningRecord[] = [];
      try {
        a = storedAlarms ? JSON.parse(storedAlarms) : [];
      } catch {
        a = [];
      }
      try {
        h = storedHistory ? JSON.parse(storedHistory) : [];
      } catch {
        h = [];
      }
      if (!storedAlarms) {
        a = [DEFAULT_ALARM];
        await storage.setItem(ALARMS_KEY, JSON.stringify(a));
      }
      setAlarms(a);
      setHistory(h);
      setLoading(false);
    })();
  }, []);

  const persistAlarms = useCallback(async (next: Alarm[]) => {
    setAlarms(next);
    await storage.setItem(ALARMS_KEY, JSON.stringify(next));
  }, []);

  const persistHistory = useCallback(async (next: MorningRecord[]) => {
    setHistory(next);
    await storage.setItem(HISTORY_KEY, JSON.stringify(next));
  }, []);

  const upsertRecord = useCallback(
    (record: MorningRecord) => {
      setHistory((prev) => {
        const idx = prev.findIndex((r) => r.id === record.id);
        let next: MorningRecord[];
        if (idx >= 0) {
          next = [...prev];
          next[idx] = record;
        } else {
          next = [record, ...prev];
        }
        storage.setItem(HISTORY_KEY, JSON.stringify(next));
        return next;
      });
    },
    [],
  );

  // ---- audio + haptics ----
  const startAlarmFx = useCallback(async () => {
    // Haptics loop
    if (!hapticTimer.current) {
      const buzz = () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(
          () => {},
        );
      };
      buzz();
      hapticTimer.current = setInterval(buzz, 1200);
    }
    // Looping alarm sound
    try {
      const { createAudioPlayer, setAudioModeAsync } = await import("expo-audio");
      try {
        await setAudioModeAsync({ playsInSilentMode: true } as any);
      } catch {
        // ignore
      }
      if (!audioRef.current) {
        audioRef.current = createAudioPlayer({ uri: ALARM_SOUND_URI });
        audioRef.current.loop = true;
      }
      audioRef.current.seekTo?.(0);
      audioRef.current.play();
    } catch {
      // sound optional — haptics + visuals carry the alarm
    }
  }, []);

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

  // React to phase to drive alarm FX
  useEffect(() => {
    const ringing =
      session?.phase === "ringing" || session?.phase === "checkin-ringing";
    if (ringing) {
      startAlarmFx();
    } else {
      stopAlarmFx();
    }
    return () => {
      if (!session) stopAlarmFx();
    };
  }, [session?.phase, session?.cycle, startAlarmFx, stopAlarmFx, session]);

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
      // no active session → check alarms
      const now = new Date();
      if (now.getSeconds() >= 4) return; // only fire in first seconds of the minute
      for (const alarm of alarmsRef.current) {
        if (!alarm.enabled) continue;
        if (alarm.hour !== now.getHours() || alarm.minute !== now.getMinutes())
          continue;
        const repeats = alarm.repeatDays.length > 0;
        if (repeats && !alarm.repeatDays.includes(now.getDay())) continue;
        const key = `${alarm.id}-${dateKey(now)}-${alarm.hour}-${alarm.minute}`;
        if (firedKeys.current.has(key)) continue;
        firedKeys.current.add(key);
        startSession(alarm, false);
        if (!repeats) {
          // disable one-time alarm after firing
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
      const dismiss = resolveMissionType(alarm.missionType);
      const intervalMs = fast
        ? FAST_INTERVAL_MS
        : alarm.checkInIntervalMin * 60000;
      const record: MorningRecord = {
        id: uid(),
        alarmId: alarm.id,
        label: alarm.label,
        dateKey: dateKey(),
        displayTime: displayTime(alarm.hour, alarm.minute),
        firedAt: new Date().toISOString(),
        status: "in-progress",
        checkInTotal: alarm.checkInCount,
        checkInsPassed: 0,
        misses: 0,
      };
      upsertRecord(record);
      const newSession: WakeSession = {
        recordId: record.id,
        alarmId: alarm.id,
        label: alarm.label,
        displayTime: displayTime(alarm.hour, alarm.minute),
        dismissMission: dismiss,
        difficulty: alarm.difficulty,
        phase: "ringing",
        fast,
        checkInTotal: alarm.checkInCount,
        checkInsPassed: 0,
        intervalMs,
        nextCheckInAt: null,
        misses: 0,
        cycle: 0,
        startedAt: Date.now(),
      };
      setSession(newSession);
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
    setSession((prev) =>
      prev ? { ...prev, phase: "dismiss-mission" } : prev,
    );
  }, []);

  const onDismissPassed = useCallback(() => {
    setSession((prev) => {
      if (!prev) return prev;
      if (prev.checkInTotal <= 0) {
        // no check-ins required → success immediately
        finalizeSuccess(prev);
        return { ...prev, phase: "success" };
      }
      return {
        ...prev,
        phase: "awake",
        nextCheckInAt: Date.now() + prev.intervalMs,
      };
    });
  }, []);

  const beginCheckInMission = useCallback(() => {
    setSession((prev) =>
      prev ? { ...prev, phase: "checkin-mission" } : prev,
    );
  }, []);

  const finalizeSuccess = useCallback(
    (s: WakeSession) => {
      setHistory((prev) => {
        const next = prev.map((r) =>
          r.id === s.recordId
            ? {
                ...r,
                status: "success" as const,
                completedAt: new Date().toISOString(),
                checkInsPassed: s.checkInTotal,
                misses: s.misses,
              }
            : r,
        );
        storage.setItem(HISTORY_KEY, JSON.stringify(next));
        return next;
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
        () => {},
      );
    },
    [],
  );

  const onCheckInPassed = useCallback(() => {
    setSession((prev) => {
      if (!prev) return prev;
      const passed = prev.checkInsPassed + 1;
      // update record progress
      setHistory((h) => {
        const next = h.map((r) =>
          r.id === prev.recordId ? { ...r, checkInsPassed: passed } : r,
        );
        storage.setItem(HISTORY_KEY, JSON.stringify(next));
        return next;
      });
      if (passed >= prev.checkInTotal) {
        const done = { ...prev, checkInsPassed: passed };
        finalizeSuccess(done);
        return { ...done, phase: "success" };
      }
      return {
        ...prev,
        checkInsPassed: passed,
        phase: "awake",
        nextCheckInAt: Date.now() + prev.intervalMs,
      };
    });
  }, [finalizeSuccess]);

  const onCheckInMissed = useCallback(() => {
    setSession((prev) => {
      if (!prev) return prev;
      const misses = prev.misses + 1;
      setHistory((h) => {
        const next = h.map((r) =>
          r.id === prev.recordId ? { ...r, misses } : r,
        );
        storage.setItem(HISTORY_KEY, JSON.stringify(next));
        return next;
      });
      return {
        ...prev,
        misses,
        phase: "ringing",
        cycle: prev.cycle + 1,
        nextCheckInAt: null,
      };
    });
  }, []);

  const clearSession = useCallback(() => {
    stopAlarmFx();
    setSession(null);
  }, [stopAlarmFx]);

  const abandonSession = useCallback(() => {
    setSession((prev) => {
      if (prev) {
        setHistory((h) => {
          const next = h.map((r) =>
            r.id === prev.recordId
              ? { ...r, status: "failed" as const }
              : r,
          );
          storage.setItem(HISTORY_KEY, JSON.stringify(next));
          return next;
        });
      }
      return null;
    });
    stopAlarmFx();
  }, [stopAlarmFx]);

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
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      }
      await persistAlarms(
        alarmsRef.current.map((x) => (x.id === id ? { ...x, enabled } : x)),
      );
    },
    [persistAlarms],
  );

  const getAlarm = useCallback(
    (id: string) => alarmsRef.current.find((a) => a.id === id),
    [],
  );

  const streak = useMemo(() => computeStreak(history), [history]);

  const value: AlarmContextValue = {
    alarms,
    history,
    session,
    loading,
    addAlarm,
    updateAlarm,
    deleteAlarm,
    toggleAlarm,
    getAlarm,
    fireAlarmNow,
    beginDismissMission,
    onDismissPassed,
    beginCheckInMission,
    onCheckInPassed,
    onCheckInMissed,
    clearSession,
    abandonSession,
    streak,
  };

  return <AlarmContext.Provider value={value}>{children}</AlarmContext.Provider>;
}
