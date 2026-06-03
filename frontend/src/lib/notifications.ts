import { Platform } from "react-native";
import { Alarm, Settings } from "../types";
import { displayTime } from "./time";

const CHANNEL_ID = "staywake-alarms";
const BEDTIME_CHANNEL_ID = "staywake-bedtime";

type NotifModule = typeof import("expo-notifications");
let cached: NotifModule | null = null;

async function mod(): Promise<NotifModule | null> {
  if (Platform.OS === "web") return null;
  if (!cached) {
    try {
      cached = await import("expo-notifications");
    } catch {
      return null;
    }
  }
  return cached;
}

export async function configureNotifications() {
  const N = await mod();
  if (!N) return;
  try {
    N.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
    if (Platform.OS === "android") {
      await N.setNotificationChannelAsync(CHANNEL_ID, {
        name: "Alarms",
        importance: N.AndroidImportance.MAX,
        sound: "default",
        vibrationPattern: [0, 400, 400, 400],
        enableVibrate: true,
        bypassDnd: true,
        lockscreenVisibility: N.AndroidNotificationVisibility.PUBLIC,
      });
      await N.setNotificationChannelAsync(BEDTIME_CHANNEL_ID, {
        name: "Bedtime reminders",
        importance: N.AndroidImportance.DEFAULT,
        sound: "default",
        enableVibrate: true,
      });
    }
  } catch {
    // non-fatal
  }
}

export type PermStatus = "granted" | "denied" | "undetermined" | "unavailable";

export async function getNotificationPermissionStatus(): Promise<PermStatus> {
  const N = await mod();
  if (!N) return "unavailable";
  try {
    const cur = await N.getPermissionsAsync();
    if (cur.granted) return "granted";
    if (cur.canAskAgain) return "undetermined";
    return "denied";
  } catch {
    return "unavailable";
  }
}

// Fire a one-off test notification a few seconds out so users can confirm the
// alarm actually breaks through before they trust it overnight.
export async function scheduleTestAlarm(seconds = 60): Promise<boolean> {
  const N = await mod();
  if (!N) return false;
  const granted = await ensureNotificationPermission();
  if (!granted) return false;
  try {
    const androidExtra = Platform.OS === "android" ? { channelId: CHANNEL_ID } : {};
    await N.scheduleNotificationAsync({
      content: {
        title: "⏰ StayWake test alarm",
        body: "If you can see and hear this, your alarms will fire. Tap to open.",
        sound: "default",
        data: { test: true },
        priority: N.AndroidNotificationPriority?.MAX,
      },
      trigger: {
        type: N.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds,
        ...androidExtra,
      } as any,
    });
    return true;
  } catch {
    return false;
  }
}

export async function ensureNotificationPermission(): Promise<boolean> {
  const N = await mod();
  if (!N) return false;
  try {
    const cur = await N.getPermissionsAsync();
    if (cur.granted) return true;
    if (!cur.canAskAgain) return false;
    const req = await N.requestPermissionsAsync();
    return req.granted;
  } catch {
    return false;
  }
}

function nextOneTimeDate(alarm: Alarm): Date {
  const d = new Date();
  d.setSeconds(0, 0);
  d.setHours(alarm.hour, alarm.minute, 0, 0);
  if (d.getTime() <= Date.now()) d.setDate(d.getDate() + 1);
  return d;
}

// Earliest enabled alarm by clock time, for the bedtime reminder copy.
function earliestEnabled(alarms: Alarm[]): Alarm | null {
  const enabled = alarms.filter((a) => a.enabled);
  if (enabled.length === 0) return null;
  return [...enabled].sort((a, b) => a.hour * 60 + a.minute - (b.hour * 60 + b.minute))[0];
}

async function scheduleBedtime(N: NonNullable<NotifModule>, settings: Settings, alarms: Alarm[]) {
  if (!settings.bedtimeEnabled) return;
  const next = earliestEnabled(alarms);
  const body = next
    ? `Lights out soon — your ${displayTime(next.hour, next.minute)} alarm hits in the morning. Sleep now to win it.`
    : "Lights out soon — a good night sets up a strong morning.";
  const androidExtra = Platform.OS === "android" ? { channelId: BEDTIME_CHANNEL_ID } : {};
  await N.scheduleNotificationAsync({
    content: {
      title: "🌙 Wind down",
      body,
      sound: "default",
      data: { bedtime: true },
    },
    trigger: {
      type: N.SchedulableTriggerInputTypes.DAILY,
      hour: settings.bedtimeHour,
      minute: settings.bedtimeMinute,
      ...androidExtra,
    } as any,
  });
}

// Cancel everything and reschedule all enabled alarms + the bedtime reminder.
// Expo schedules these at the OS level (Android uses AlarmManager) so they fire
// even if the app is closed.
export async function syncNotifications(alarms: Alarm[], settings: Settings) {
  const N = await mod();
  if (!N) return;
  try {
    await N.cancelAllScheduledNotificationsAsync();
    const enabled = alarms.filter((a) => a.enabled);
    const wantsBedtime = settings.bedtimeEnabled;
    if (enabled.length === 0 && !wantsBedtime) return;
    const granted = await ensureNotificationPermission();
    if (!granted) return;

    await scheduleBedtime(N, settings, alarms);

    for (const a of enabled) {
      const content: any = {
        title: `⏰ ${a.label || "Wake up"}`,
        body: "Open StayWake and complete your mission to stop the alarm.",
        sound: "default",
        data: { alarmId: a.id },
        priority: N.AndroidNotificationPriority?.MAX,
      };
      const androidExtra = Platform.OS === "android" ? { channelId: CHANNEL_ID } : {};

      if (a.repeatDays.length === 0) {
        await N.scheduleNotificationAsync({
          content,
          trigger: {
            type: N.SchedulableTriggerInputTypes.DATE,
            date: nextOneTimeDate(a),
            ...androidExtra,
          } as any,
        });
      } else {
        for (const day of a.repeatDays) {
          await N.scheduleNotificationAsync({
            content,
            trigger: {
              type: N.SchedulableTriggerInputTypes.WEEKLY,
              weekday: day + 1, // expo: 1=Sunday ... 7=Saturday
              hour: a.hour,
              minute: a.minute,
              ...androidExtra,
            } as any,
          });
        }
      }
    }
  } catch {
    // non-fatal — in-app scheduler still covers foreground
  }
}
