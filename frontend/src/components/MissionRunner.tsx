import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Linking, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { CameraView, useCameraPermissions } from "expo-camera";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { KeyboardStickyView } from "react-native-keyboard-controller";

import { colors, fonts, radius, spacing } from "@/src/theme";
import { Difficulty } from "@/src/types";
import { genMath, genPhrase, shakeTarget } from "@/src/lib/missions";
import Button from "./Button";

type MissionType = "math" | "typing" | "shake" | "qr" | "step";

interface Props {
  type: MissionType;
  difficulty: Difficulty;
  accent?: string;
  onSolved: () => void;
}

function buzz(style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Light) {
  if (Platform.OS !== "web") Haptics.impactAsync(style).catch(() => {});
}

function stepTarget(difficulty: Difficulty): number {
  if (difficulty === "easy") return 10;
  if (difficulty === "medium") return 25;
  return 50;
}

export default function MissionRunner({ type, difficulty, accent = colors.primary, onSolved }: Props) {
  if (type === "typing") return <TypeMission difficulty={difficulty} accent={accent} onSolved={onSolved} />;
  if (type === "shake") return <ShakeMission difficulty={difficulty} accent={accent} onSolved={onSolved} />;
  if (type === "qr") return <QRMission difficulty={difficulty} accent={accent} onSolved={onSolved} />;
  if (type === "step") return <StepMission difficulty={difficulty} accent={accent} onSolved={onSolved} />;
  return <MathMission difficulty={difficulty} accent={accent} onSolved={onSolved} />;
}

/* ----------------------------- MATH ----------------------------- */
function MathMission({ difficulty, accent, onSolved }: Omit<Props, "type">) {
  const [challenge, setChallenge] = useState(() => genMath(difficulty));
  const [input, setInput] = useState("");
  const shakeX = useSharedValue(0);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shakeX.value }] }));

  const triggerShake = () => {
    // eslint-disable-next-line react-hooks/immutability
    shakeX.value = withSequence(
      withTiming(-12, { duration: 50 }),
      withTiming(12, { duration: 50 }),
      withTiming(-8, { duration: 50 }),
      withTiming(8, { duration: 50 }),
      withTiming(0, { duration: 50 }),
    );
  };

  const press = (d: string) => {
    buzz();
    setInput((p) => (p.length >= 6 ? p : p + d));
  };
  const back = () => {
    buzz();
    setInput((p) => p.slice(0, -1));
  };
  const submit = () => {
    if (input === challenge.answer) {
      buzz(Haptics.ImpactFeedbackStyle.Heavy);
      onSolved();
    } else {
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      triggerShake();
      setInput("");
      setChallenge(genMath(difficulty));
    }
  };

  const numRows = [
    ["1", "2", "3"],
    ["4", "5", "6"],
    ["7", "8", "9"],
    ["back", "0", "enter"],
  ];

  return (
    <View style={styles.mathContainer}>
      <View style={styles.mathBody}>
        <Text style={styles.label}>SOLVE TO PROVE YOU&apos;RE AWAKE</Text>
        <Animated.View style={[styles.challengeBox, { borderColor: accent }, animStyle]}>
          <Text style={styles.challengeText}>{challenge.prompt}</Text>
          <Text style={[styles.answerText, { color: accent }]} testID="math-input-display">{input || "?"}</Text>
        </Animated.View>
      </View>
      <View style={styles.numpad}>
        {numRows.map((row, ri) => (
          <View key={ri} style={styles.numRow}>
            {row.map((k) => {
              if (k === "back")
                return (
                  <Pressable key={k} testID="numpad-back" style={styles.key} onPress={back}>
                    <Ionicons name="backspace-outline" size={26} color={colors.textPrimary} />
                  </Pressable>
                );
              if (k === "enter")
                return (
                  <Pressable key={k} testID="numpad-enter" style={[styles.key, { backgroundColor: accent }]} onPress={submit}>
                    <Ionicons name="checkmark" size={30} color={colors.black} />
                  </Pressable>
                );
              return (
                <Pressable key={k} testID={`numpad-${k}`} style={styles.key} onPress={() => press(k)}>
                  <Text style={styles.keyText}>{k}</Text>
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
}

/* ----------------------------- TYPING ----------------------------- */
function TypeMission({ difficulty, accent, onSolved }: Omit<Props, "type">) {
  const [phrase, setPhrase] = useState(() => genPhrase(difficulty));
  const [input, setInput] = useState("");
  const shakeX = useSharedValue(0);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shakeX.value }] }));
  const matched = input.trim().toUpperCase() === phrase;

  const triggerShake = () => {
    // eslint-disable-next-line react-hooks/immutability
    shakeX.value = withSequence(withTiming(-12, { duration: 50 }), withTiming(12, { duration: 50 }), withTiming(0, { duration: 50 }));
  };
  const submit = () => {
    if (matched) {
      buzz(Haptics.ImpactFeedbackStyle.Heavy);
      onSolved();
    } else {
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      triggerShake();
      setInput("");
      setPhrase(genPhrase(difficulty));
    }
  };

  return (
    <View style={styles.flex}>
      <View style={styles.missionBody}>
        <Text style={styles.label}>TYPE THIS EXACTLY TO PROVE YOU&apos;RE AWAKE</Text>
        <View style={[styles.phraseBox, { borderColor: accent }]}>
          <Text style={styles.phraseText}>{phrase}</Text>
        </View>
        <Animated.View style={animStyle}>
          <TextInput
            testID="typing-input"
            value={input}
            onChangeText={setInput}
            placeholder="start typing..."
            placeholderTextColor={colors.textSecondary}
            autoCapitalize="characters"
            autoCorrect={false}
            style={[styles.textInput, { borderColor: input ? accent : colors.border }]}
            multiline
          />
        </Animated.View>
      </View>
      <KeyboardStickyView offset={{ closed: 0, opened: 12 }}>
        <View style={styles.stickyBar}>
          <Button title="Confirm" testID="typing-submit" variant="primary" disabled={!input} onPress={submit} />
        </View>
      </KeyboardStickyView>
    </View>
  );
}

/* ----------------------------- SHAKE ----------------------------- */
function ShakeMission({ difficulty, accent, onSolved }: Omit<Props, "type">) {
  const target = useMemo(() => shakeTarget(difficulty), [difficulty]);
  const [count, setCount] = useState(0);
  const [available, setAvailable] = useState<boolean | null>(null);
  const last = useRef({ x: 0, y: 0, z: 0 });
  const lastShake = useRef(0);
  const solvedRef = useRef(false);

  const bump = useCallback(() => {
    if (solvedRef.current) return;
    setCount((c) => {
      const next = c + 1;
      buzz(next % 5 === 0 ? Haptics.ImpactFeedbackStyle.Heavy : Haptics.ImpactFeedbackStyle.Light);
      if (next >= target && !solvedRef.current) {
        solvedRef.current = true;
        setTimeout(() => onSolved(), 250);
      }
      return next;
    });
  }, [target, onSolved]);

  useEffect(() => {
    let sub: any;
    let mounted = true;
    (async () => {
      try {
        const { Accelerometer } = await import("expo-sensors");
        const ok = await Accelerometer.isAvailableAsync();
        if (!mounted) return;
        setAvailable(ok);
        if (!ok) return;
        Accelerometer.setUpdateInterval(80);
        sub = Accelerometer.addListener(({ x, y, z }) => {
          const delta = Math.abs(x - last.current.x) + Math.abs(y - last.current.y) + Math.abs(z - last.current.z);
          last.current = { x, y, z };
          const now = Date.now();
          if (delta > 1.6 && now - lastShake.current > 120) {
            lastShake.current = now;
            bump();
          }
        });
      } catch {
        if (mounted) setAvailable(false);
      }
    })();
    return () => {
      mounted = false;
      sub?.remove?.();
    };
  }, [bump]);

  const progress = Math.min(1, count / target);
  return (
    <View style={styles.flex}>
      <View style={[styles.missionBody, styles.center]}>
        <Text style={styles.label}>{available === false ? "TAP FAST TO PROVE YOU'RE AWAKE" : "SHAKE YOUR PHONE HARD"}</Text>
        <Ionicons name="phone-portrait-outline" size={72} color={accent} style={{ marginVertical: spacing.lg }} />
        <Text style={[styles.bigCount, { color: accent }]} testID="shake-count">{count}/{target}</Text>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress * 100}%`, backgroundColor: accent }]} />
        </View>
        {available === false && (
          <Pressable testID="shake-tap-fallback" onPress={bump} style={[styles.tapBtn, { borderColor: accent }]}>
            <Text style={[styles.tapBtnText, { color: accent }]}>TAP</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

/* ----------------------------- QR SCAN ----------------------------- */
function QRMission({ difficulty, accent, onSolved }: Omit<Props, "type">) {
  const [permission, requestPermission] = useCameraPermissions();
  const [useMathFallback, setUseMathFallback] = useState(false);
  const solvedRef = useRef(false);
  const isWeb = Platform.OS === "web";

  const scanned = () => {
    if (solvedRef.current) return;
    solvedRef.current = true;
    buzz(Haptics.ImpactFeedbackStyle.Heavy);
    onSolved();
  };

  if (useMathFallback) return <MathMission difficulty={difficulty} accent={accent} onSolved={onSolved} />;

  // Live camera (real device, permission granted)
  if (!isWeb && permission?.granted) {
    return (
      <View style={styles.flex}>
        <View style={styles.missionBody}>
          <Text style={styles.label}>SCAN YOUR QR CODE TO STOP THE ALARM</Text>
          <View style={[styles.cameraWrap, { borderColor: accent }]}>
            <CameraView
              style={StyleSheet.absoluteFill}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ["qr", "ean13", "code128", "code39", "upc_a"] }}
              onBarcodeScanned={scanned}
            />
            <View style={[styles.scanFrame, { borderColor: accent }]} pointerEvents="none" />
          </View>
          <Text style={styles.hint}>Point at the QR/barcode you placed across the room. Images are never saved.</Text>
        </View>
      </View>
    );
  }

  // Permission needed (native, not yet granted)
  if (!isWeb && permission && !permission.granted) {
    return (
      <View style={[styles.missionBody, styles.center]}>
        <Ionicons name="qr-code" size={64} color={accent} />
        <Text style={[styles.label, { marginTop: spacing.lg }]}>CAMERA ACCESS NEEDED</Text>
        <Text style={styles.hint}>StayWake uses the camera only to scan your QR code and stop the alarm. Nothing is recorded or uploaded.</Text>
        <View style={styles.qrBtns}>
          {permission.canAskAgain ? (
            <Button title="Enable Camera" testID="qr-enable" onPress={() => requestPermission()} />
          ) : (
            <Button title="Open Settings" testID="qr-settings" onPress={() => Linking.openSettings()} />
          )}
          <Pressable testID="qr-fallback-math" onPress={() => setUseMathFallback(true)}>
            <Text style={styles.fallbackLink}>Can&apos;t scan now? Stop with math</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // Web / unsupported preview fallback
  return (
    <View style={[styles.missionBody, styles.center]}>
      <Ionicons name="qr-code" size={64} color={accent} />
      <Text style={[styles.label, { marginTop: spacing.lg }]}>QR SCAN MISSION</Text>
      <Text style={styles.hint}>Live QR scanning runs on a real device build. Tap below to simulate a successful scan in this preview.</Text>
      <View style={styles.qrBtns}>
        <Button title="Simulate Scan" testID="qr-simulate" onPress={scanned} />
      </View>
    </View>
  );
}

/* ----------------------------- STEP ----------------------------- */
function StepMission({ difficulty, accent, onSolved }: Omit<Props, "type">) {
  const target = useMemo(() => stepTarget(difficulty), [difficulty]);
  const [count, setCount] = useState(0);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [blocked, setBlocked] = useState(false);
  const solvedRef = useRef(false);

  const register = useCallback(
    (steps: number) => {
      if (solvedRef.current) return;
      setCount(() => {
        const next = steps;
        if (next >= target && !solvedRef.current) {
          solvedRef.current = true;
          buzz(Haptics.ImpactFeedbackStyle.Heavy);
          setTimeout(() => onSolved(), 250);
        }
        return Math.min(next, target);
      });
    },
    [target, onSolved],
  );

  useEffect(() => {
    let sub: any;
    let mounted = true;
    (async () => {
      if (Platform.OS === "web") {
        setAvailable(false);
        return;
      }
      try {
        const { Pedometer } = await import("expo-sensors");
        const ok = await Pedometer.isAvailableAsync();
        if (!mounted) return;
        if (!ok) {
          setAvailable(false);
          return;
        }
        const perm = await Pedometer.requestPermissionsAsync();
        if (!mounted) return;
        if (!perm.granted) {
          setAvailable(false);
          setBlocked(!perm.canAskAgain);
          return;
        }
        setAvailable(true);
        sub = Pedometer.watchStepCount((r) => register(r.steps));
      } catch {
        if (mounted) setAvailable(false);
      }
    })();
    return () => {
      mounted = false;
      sub?.remove?.();
    };
  }, [register]);

  const tapFallback = () => {
    if (solvedRef.current) return;
    setCount((c) => {
      const next = c + 1;
      buzz();
      if (next >= target && !solvedRef.current) {
        solvedRef.current = true;
        setTimeout(() => onSolved(), 200);
      }
      return next;
    });
  };

  const progress = Math.min(1, count / target);
  return (
    <View style={styles.flex}>
      <View style={[styles.missionBody, styles.center]}>
        <Text style={styles.label}>{available ? "WALK TO PROVE YOU'RE UP" : "STEP MISSION"}</Text>
        <Ionicons name="walk" size={72} color={accent} style={{ marginVertical: spacing.lg }} />
        <Text style={[styles.bigCount, { color: accent }]} testID="step-count">{count}/{target}</Text>
        <Text style={styles.hint}>{available ? "Get out of bed and start walking." : "Live step counting runs on a real device build."}</Text>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress * 100}%`, backgroundColor: accent }]} />
        </View>
        {available === false && (
          <View style={styles.qrBtns}>
            {blocked && (
              <Button title="Open Settings" testID="step-settings" onPress={() => Linking.openSettings()} />
            )}
            <Pressable testID="step-tap-fallback" onPress={tapFallback} style={[styles.tapBtn, { borderColor: accent }]}>
              <Text style={[styles.tapBtnText, { color: accent }]}>STEP</Text>
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, width: "100%" },
  missionBody: { flex: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  center: { alignItems: "center", justifyContent: "center" },
  label: { fontFamily: fonts.bodyExtra, fontSize: 12, letterSpacing: 2, color: colors.textSecondary, textTransform: "uppercase", textAlign: "center", marginBottom: spacing.lg },
  mathContainer: { flex: 1, width: "100%", justifyContent: "space-between" },
  mathBody: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  challengeBox: { borderWidth: 2, borderRadius: radius.card, backgroundColor: colors.surface, paddingVertical: spacing.md, alignItems: "center", marginTop: spacing.sm },
  challengeText: { fontFamily: fonts.monoBold, fontSize: 38, color: colors.textPrimary },
  answerText: { fontFamily: fonts.monoBold, fontSize: 46, marginTop: spacing.xs },
  numpad: { paddingHorizontal: spacing.md, paddingBottom: spacing.md, gap: spacing.sm },
  numRow: { flexDirection: "row", gap: spacing.sm },
  key: { flex: 1, height: 58, borderRadius: radius.button, backgroundColor: colors.surfaceHighlight, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  keyText: { fontFamily: fonts.bold, fontSize: 26, color: colors.textPrimary },
  phraseBox: { borderWidth: 2, borderRadius: radius.card, backgroundColor: colors.surface, padding: spacing.lg, marginBottom: spacing.lg },
  phraseText: { fontFamily: fonts.monoBold, fontSize: 24, color: colors.textPrimary, textAlign: "center", letterSpacing: 1 },
  textInput: { borderWidth: 2, borderRadius: radius.input, backgroundColor: colors.background, color: colors.textPrimary, fontFamily: fonts.mono, fontSize: 20, padding: spacing.md, minHeight: 64, letterSpacing: 1 },
  stickyBar: { padding: spacing.lg, backgroundColor: colors.background },
  bigCount: { fontFamily: fonts.black, fontSize: 64 },
  progressTrack: { width: "100%", height: 14, borderRadius: radius.pill, backgroundColor: colors.surfaceHighlight, borderWidth: 1, borderColor: colors.border, overflow: "hidden", marginTop: spacing.lg },
  progressFill: { height: "100%", borderRadius: radius.pill },
  tapBtn: { marginTop: spacing.xl, borderWidth: 2, borderRadius: radius.pill, width: 120, height: 120, alignItems: "center", justifyContent: "center" },
  tapBtnText: { fontFamily: fonts.black, fontSize: 24 },
  cameraWrap: { width: "100%", aspectRatio: 1, borderRadius: radius.card, overflow: "hidden", borderWidth: 2, backgroundColor: colors.black },
  scanFrame: { position: "absolute", top: "18%", left: "18%", right: "18%", bottom: "18%", borderWidth: 3, borderRadius: radius.card },
  hint: { fontFamily: fonts.body, fontSize: 14, color: colors.textSecondary, textAlign: "center", marginTop: spacing.md, lineHeight: 21, paddingHorizontal: spacing.md },
  qrBtns: { marginTop: spacing.xl, gap: spacing.md, alignItems: "center", width: "100%" },
  fallbackLink: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.textSecondary, textDecorationLine: "underline" },
});
