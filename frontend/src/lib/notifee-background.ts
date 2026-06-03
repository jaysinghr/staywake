import { Platform } from "react-native";

// Notifee requires a background event handler registered at module scope, early
// in startup. The locked-screen ring is launched by the notification's
// fullScreenAction/pressAction (which open the app); the session is then started
// from getInitialAlarmId() on launch, so this handler itself is a no-op.
if (Platform.OS !== "web") {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const notifee = require("@notifee/react-native").default;
    notifee.onBackgroundEvent(async () => {
      // intentionally empty — launch + session start handled on app open
    });
  } catch {
    // notifee unavailable (e.g. Expo Go) — ignore
  }
}
