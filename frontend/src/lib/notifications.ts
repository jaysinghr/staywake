import { Platform } from "react-native";
import { Alarm } from "../types";

const CHANNEL_ID = "staywake-alarms";

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
    }
  } catch {
    // non-fatal
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

// Cancel everything and reschedule all enabled alarms. Expo schedules these at
// the OS level (Android uses AlarmManager) so they fire even if the app is closed.
export async function syncAlarmNotifications(alarms: Alarm[]) {
  const N = await mod();
  if (!N) return;
  try {
    await N.cancelAllScheduledNotificationsAsync();
    const enabled = alarms.filter((a) => a.enabled);
    if (enabled.length === 0) return;
    const granted = await ensureNotificationPermission();
    if (!granted) return;

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
