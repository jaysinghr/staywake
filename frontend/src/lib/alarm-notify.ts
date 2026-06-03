import { Platform } from "react-native";
import { Alarm } from "../types";
import { SOUNDS, soundFile } from "./sounds";

// Notifee powers the real locked-screen alarm: full-screen intent over the lock
// screen + looping sound on the alarm stream (ignores silent/DND) on Android.
// On iOS we fall back to a time-sensitive notification (the OS ceiling for any
// third-party app — no app can show a full-screen alarm from the background).

let nfDefault: any = null;
let nfMod: any = null;

async function nf(): Promise<any | null> {
  if (Platform.OS === "web") return null;
  if (!nfDefault) {
    try {
      const m = await import("@notifee/react-native");
      nfDefault = m.default;
      nfMod = m;
    } catch {
      return null;
    }
  }
  return nfDefault;
}

function channelId(soundId: string) {
  return `staywake-alarm-${soundId}`;
}

// Next epoch ms for hour:minute today, rolled to tomorrow if already past.
function nextOneTime(hour: number, minute: number): number {
  const d = new Date();
  d.setSeconds(0, 0);
  d.setHours(hour, minute, 0, 0);
  if (d.getTime() <= Date.now()) d.setDate(d.getDate() + 1);
  return d.getTime();
}

// Next epoch ms matching a given weekday (0=Sun..6=Sat) at hour:minute.
function nextWeekday(hour: number, minute: number, weekday: number): number {
  const now = new Date();
  for (let i = 0; i < 8; i++) {
    const d = new Date(now);
    d.setSeconds(0, 0);
    d.setHours(hour, minute, 0, 0);
    d.setDate(d.getDate() + i);
    if (d.getDay() === weekday && d.getTime() > now.getTime()) return d.getTime();
  }
  return nextOneTime(hour, minute);
}

export async function ensureAlarmChannels() {
  const n = await nf();
  if (!n || Platform.OS !== "android") return;
  const { AndroidImportance, AndroidVisibility } = nfMod;
  for (const s of SOUNDS) {
    await n.createChannel({
      id: channelId(s.id),
      name: `Alarm · ${s.label}`,
      importance: AndroidImportance.HIGH,
      sound: s.id, // res/raw resource (bundled by expo-notifications "sounds")
      vibration: true,
      vibrationPattern: [300, 500, 300, 500],
      visibility: AndroidVisibility.PUBLIC,
      bypassDnd: true,
    });
  }
}

function androidConfig(a: Alarm) {
  const { AndroidImportance, AndroidCategory, AndroidVisibility } = nfMod;
  return {
    channelId: channelId(a.sound),
    importance: AndroidImportance.HIGH,
    category: AndroidCategory.ALARM,
    // Launches the app over the lock screen, like an incoming call.
    fullScreenAction: { id: "default", launchActivity: "default" },
    pressAction: { id: "default", launchActivity: "default" },
    sound: a.sound,
    loopSound: true,
    ongoing: true,
    autoCancel: false,
    visibility: AndroidVisibility.PUBLIC,
  };
}

function iosConfig(a: Alarm) {
  return {
    sound: soundFile(a.sound),
    critical: false,
    interruptionLevel: "timeSensitive" as const,
  };
}

// Cancel and reschedule every enabled alarm as a Notifee trigger.
export async function scheduleAlarms(alarms: Alarm[]) {
  const n = await nf();
  if (!n) return;
  const { TriggerType, RepeatFrequency } = nfMod;
  try {
    await n.requestPermission();
    await ensureAlarmChannels();
    await n.cancelTriggerNotifications();

    for (const a of alarms.filter((x) => x.enabled)) {
      const content = {
        title: `⏰ ${a.label || "Wake up"}`,
        body: "Tap to stop the alarm and complete your mission.",
        data: { alarmId: a.id },
        android: androidConfig(a),
        ios: iosConfig(a),
      };

      if (a.repeatDays.length === 0) {
        await n.createTriggerNotification(
          { ...content, id: `alarm-${a.id}` },
          {
            type: TriggerType.TIMESTAMP,
            timestamp: nextOneTime(a.hour, a.minute),
            alarmManager: { allowWhileIdle: true },
          },
        );
      } else {
        for (const day of a.repeatDays) {
          await n.createTriggerNotification(
            { ...content, id: `alarm-${a.id}-${day}` },
            {
              type: TriggerType.TIMESTAMP,
              timestamp: nextWeekday(a.hour, a.minute, day),
              repeatFrequency: RepeatFrequency.WEEKLY,
              alarmManager: { allowWhileIdle: true },
            },
          );
        }
      }
    }
  } catch {
    // non-fatal
  }
}

// Stop the ringing notification + its looping sound (called when the in-app
// session takes over and plays via expo-audio).
export async function clearAlarmRinging() {
  const n = await nf();
  if (!n) return;
  try {
    await n.cancelDisplayedNotifications();
  } catch {
    // ignore
  }
}

// Fire a real Notifee alarm a few seconds out so users can verify the
// locked-screen behaviour from the Reliability screen.
export async function scheduleTestAlarm(seconds = 60): Promise<boolean> {
  const n = await nf();
  if (!n) return false;
  const { TriggerType } = nfMod;
  try {
    await n.requestPermission();
    await ensureAlarmChannels();
    const sample = { id: "test", label: "StayWake test", sound: "classic" } as Alarm;
    await n.createTriggerNotification(
      {
        id: "alarm-test",
        title: "⏰ StayWake test alarm",
        body: "If it rings and shows full-screen, your alarms will work.",
        data: { test: true },
        android: androidConfig(sample),
        ios: iosConfig(sample),
      },
      {
        type: TriggerType.TIMESTAMP,
        timestamp: Date.now() + seconds * 1000,
        alarmManager: { allowWhileIdle: true },
      },
    );
    return true;
  } catch {
    return false;
  }
}

export async function getInitialAlarmId(): Promise<string | null> {
  const n = await nf();
  if (!n) return null;
  try {
    const init = await n.getInitialNotification();
    return (init?.notification?.data?.alarmId as string) ?? null;
  } catch {
    return null;
  }
}

// Foreground/launch events → returns an unsubscribe fn.
export function onAlarmEvent(handler: (alarmId: string) => void): () => void {
  let unsub = () => {};
  nf().then((n) => {
    if (!n) return;
    const { EventType } = nfMod;
    unsub = n.onForegroundEvent(({ type, detail }: any) => {
      const alarmId = detail?.notification?.data?.alarmId as string | undefined;
      if (!alarmId) return;
      if (type === EventType.DELIVERED || type === EventType.PRESS) handler(alarmId);
    });
  });
  return () => unsub();
}
