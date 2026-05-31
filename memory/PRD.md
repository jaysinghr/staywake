# StayWake — Product Requirements (Living Doc)

**Slogan:** Wake up. Stay up.
**Platform:** React Native Expo (SDK 54), Android-first. Fully on-device (AsyncStorage via `@/src/utils/storage`). No login, no backend logic.

## Core concept
A "wake-up completion system", not just an alarm: ring → complete a PROOF MISSION to stop → STAY-AWAKE CHECK-INS afterwards → morning only counts when all check-ins pass. Miss a check-in → alarm re-rings.

## Implemented (Phase 1 + MVP)
- **Onboarding** (3 slides), shown once.
- **Alarms**: create/edit/delete/enable, time wheel, label, repeat presets (Once/Every day/Weekdays/Weekends) + all 7 day toggles (incl. Sat/Sun), mission type, mission target (difficulty), stay-awake mode, alarm sound.
- **Proof missions**: Math (numpad), Typing, Shake (accelerometer + web tap fallback). QR & Step are Pro + native-build only (fallback to Math in preview).
- **Stay-awake modes**: Light (5m), Standard (3,7m), Standard default; Strict (3,7,15m, Pro). Multi-checkpoint check-ins; miss → re-ring; recover supported.
- **Wake session tracking + Wake Score** (0–100; penalties for slow mission, missed check-ins, re-alarms). Status: success / recovered / failed.
- **Progress**: current streak, best streak, weekly wins, avg wake score, history with score badges, Challenges (Pro-gated).
- **Settings**: defaults (mission/mode/sound), haptics, Reliability guide, Help/FAQ, Privacy, restore purchases, reset data.
- **Monetization**: Pro paywall (Yearly/Monthly/Lifetime). Free = 2 alarms + core missions + Light/Standard. Pro = unlimited alarms, Strict, QR/Step, challenges, premium sounds, analytics.

## Native (implemented — activate by Publishing an Android build)
- **Notification-based alarm scheduling** (`src/lib/notifications.ts`): Expo scheduled notifications (Android AlarmManager under the hood) + MAX-importance alarm channel, permission handling, reschedule on every alarm change, tap-to-open-ring listener. Fires when app is closed (best-effort; full lock-screen ringing needs the build).
- **QR-scan mission** (expo-camera) and **Step mission** (expo-sensors Pedometer) with full permission flow + "Open Settings" + non-dead-end fallbacks. On web preview they fall back to `qr-simulate` / `step-tap-fallback` so the flow is testable.
- app.json: camera/sensors/notifications plugins + Android permissions (CAMERA, ACTIVITY_RECOGNITION, SCHEDULE_EXACT_ALARM, USE_FULL_SCREEN_INTENT, RECEIVE_BOOT_COMPLETED, POST_NOTIFICATIONS, WAKE_LOCK, VIBRATE) + iOS usage strings.

## Still Mocked / Deferred (Phase 2 finish)
- **RevenueCat billing** — purchase is MOCKED (`setPro(true)`). Needs RevenueCat API keys + App Store / Google Play product IDs, wired after a build.
- True full-screen lock-screen ringing / boot-restore reliability can only be verified on a real device build (Publish).

## Notes
- In-app foreground alarm loop is testable via per-alarm "TEST RUN (FAST)" (~15s check-in windows).
- Wake score & streak logic in `src/lib/staywake.ts`; session state machine in `src/store/AlarmContext.tsx`.
