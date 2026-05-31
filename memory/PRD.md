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

## Mocked / Deferred (Phase 2 — requires native build via Publish)
- **RevenueCat billing** — purchase is currently MOCKED (`setPro(true)` unlocks instantly). Provider chosen: RevenueCat (supports Indian developers; sells worldwide via App Store / Google Play IAP).
- **Native alarm reliability**: AlarmManager exact alarms, foreground service, full-screen lock-screen ringing, BootReceiver restore — only run in a real build, not Expo Go / web preview.
- **QR/barcode mission** (expo-camera) and **Step mission** (expo-sensors Pedometer) — require device build + permissions.

## Notes
- In-app foreground alarm loop is testable via per-alarm "TEST RUN (FAST)" (~15s check-in windows).
- Wake score & streak logic in `src/lib/staywake.ts`; session state machine in `src/store/AlarmContext.tsx`.
