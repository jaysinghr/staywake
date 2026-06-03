import { Platform } from "react-native";
import { Alarm, Settings } from "../types";
import { displayTime } from "./time";

// expo-notifications now only handles the nightly bedtime reminder + permission
// helpers. The actual locked-screen alarm runs through Notifee (alarm-notify.ts).
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

// Earliest enabled alarm by clock time, for the bedtime reminder copy.
function earliestEnabled(alarms: Alarm[]): Alarm | null {
  const enabled = alarms.filter((a) => a.enabled);
  if (enabled.length === 0) return null;
  return [...enabled].sort((a, b) => a.hour * 60 + a.minute - (b.hour * 60 + b.minute))[0];
}

// Cancel and (re)schedule the nightly bedtime reminder.
export async function syncBedtime(alarms: Alarm[], settings: Settings) {
  const N = await mod();
  if (!N) return;
  try {
    await N.cancelAllScheduledNotificationsAsync();
    if (!settings.bedtimeEnabled) return;
    const granted = await ensureNotificationPermission();
    if (!granted) return;

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
  } catch {
    // non-fatal
  }
}
