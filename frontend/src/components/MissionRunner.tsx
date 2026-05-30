import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
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

type MissionType = "math" | "typing" | "shake";

interface Props {
  type: MissionType;
  difficulty: Difficulty;
  accent?: string;
  onSolved: () => void;
}

function buzz(style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Light) {
  if (Platform.OS !== "web") Haptics.impactAsync(style).catch(() => {});
}

export default function MissionRunner({ type, difficulty, accent = colors.primary, onSolved }: Props) {
  if (type === "math") return <MathMission difficulty={difficulty} accent={accent} onSolved={onSolved} />;
  if (type === "typing") return <TypeMission difficulty={difficulty} accent={accent} onSolved={onSolved} />;
  return <ShakeMission difficulty={difficulty} accent={accent} onSolved={onSolved} />;
}

/* ----------------------------- MATH ----------------------------- */
function MathMission({ difficulty, accent, onSolved }: Omit<Props, "type">) {
  const [challenge, setChallenge] = useState(() => genMath(difficulty));
  const [input, setInput] = useState("");
  const shakeX = useSharedValue(0);

  const animStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shakeX.value }] }));

  const triggerShake = () => {
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
      if (Platform.OS !== "web")
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      triggerShake();
      setInput("");
      setChallenge(genMath(difficulty));
    }
  };

  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "back", "0", "enter"];

  return (
    <View style={styles.flex}>
      <View style={styles.missionBody}>
        <Text style={styles.label}>SOLVE TO PROVE YOU'RE AWAKE</Text>
        <Animated.View style={[styles.challengeBox, { borderColor: accent }, animStyle]}>
          <Text style={styles.challengeText}>{challenge.prompt}</Text>
          <Text style={[styles.answerText, { color: accent }]} testID="math-input-display">
            {input || "?"}
          </Text>
        </Animated.View>
      </View>
      <View style={styles.numpad}>
        {keys.map((k) => {
          if (k === "back")
            return (
              <Pressable key={k} testID="numpad-back" style={styles.key} onPress={back}>
                <Ionicons name="backspace-outline" size={28} color={colors.textPrimary} />
              </Pressable>
            );
          if (k === "enter")
            return (
              <Pressable
                key={k}
                testID="numpad-enter"
                style={[styles.key, { backgroundColor: accent }]}
                onPress={submit}
              >
                <Ionicons name="checkmark" size={32} color={colors.black} />
              </Pressable>
            );
          return (
            <Pressable key={k} testID={`numpad-${k}`} style={styles.key} onPress={() => press(k)}>
              <Text style={styles.keyText}>{k}</Text>
            </Pressable>
          );
        })}
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

  const normalized = input.trim().toUpperCase();
  const matched = normalized === phrase;

  const triggerShake = () => {
    shakeX.value = withSequence(
      withTiming(-12, { duration: 50 }),
      withTiming(12, { duration: 50 }),
      withTiming(0, { duration: 50 }),
    );
  };

  const submit = () => {
    if (matched) {
      buzz(Haptics.ImpactFeedbackStyle.Heavy);
      onSolved();
    } else {
      if (Platform.OS !== "web")
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      triggerShake();
      setInput("");
      setPhrase(genPhrase(difficulty));
    }
  };

  return (
    <View style={styles.flex}>
      <View style={styles.missionBody}>
        <Text style={styles.label}>TYPE THIS EXACTLY TO PROVE YOU'RE AWAKE</Text>
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
          <Button
            title="Confirm"
            testID="typing-submit"
            variant="primary"
            disabled={!input}
            onPress={submit}
          />
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
      if (next % 5 === 0) buzz(Haptics.ImpactFeedbackStyle.Heavy);
      else buzz();
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
          const dx = Math.abs(x - last.current.x);
          const dy = Math.abs(y - last.current.y);
          const dz = Math.abs(z - last.current.z);
          last.current = { x, y, z };
          const delta = dx + dy + dz;
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
        <Text style={styles.label}>
          {available === false ? "TAP FAST TO PROVE YOU'RE AWAKE" : "SHAKE YOUR PHONE HARD"}
        </Text>
        <Ionicons
          name="phone-portrait-outline"
          size={72}
          color={accent}
          style={{ marginVertical: spacing.lg }}
        />
        <Text style={[styles.shakeCount, { color: accent }]} testID="shake-count">
          {count}/{target}
        </Text>
        <View style={styles.progressTrack}>
          <View
            style={[styles.progressFill, { width: `${progress * 100}%`, backgroundColor: accent }]}
          />
        </View>
        {available === false && (
          <Pressable
            testID="shake-tap-fallback"
            onPress={bump}
            style={[styles.tapBtn, { borderColor: accent }]}
          >
            <Text style={[styles.tapBtnText, { color: accent }]}>TAP</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, width: "100%" },
  missionBody: { flex: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  center: { alignItems: "center", justifyContent: "center" },
  label: {
    fontFamily: fonts.bodyExtra,
    fontSize: 12,
    letterSpacing: 2,
    color: colors.textSecondary,
    textTransform: "uppercase",
    textAlign: "center",
    marginBottom: spacing.lg,
  },
  challengeBox: {
    borderWidth: 2,
    borderRadius: radius.card,
    backgroundColor: colors.surface,
    paddingVertical: spacing.xl,
    alignItems: "center",
  },
  challengeText: { fontFamily: fonts.monoBold, fontSize: 44, color: colors.textPrimary },
  answerText: { fontFamily: fonts.monoBold, fontSize: 52, marginTop: spacing.sm },
  numpad: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  key: {
    width: "31.5%",
    margin: "0.92%",
    height: 64,
    borderRadius: radius.button,
    backgroundColor: colors.surfaceHighlight,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  keyText: { fontFamily: fonts.bold, fontSize: 28, color: colors.textPrimary },
  phraseBox: {
    borderWidth: 2,
    borderRadius: radius.card,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  phraseText: {
    fontFamily: fonts.monoBold,
    fontSize: 24,
    color: colors.textPrimary,
    textAlign: "center",
    letterSpacing: 1,
  },
  textInput: {
    borderWidth: 2,
    borderRadius: radius.input,
    backgroundColor: colors.background,
    color: colors.textPrimary,
    fontFamily: fonts.mono,
    fontSize: 20,
    padding: spacing.md,
    minHeight: 64,
    letterSpacing: 1,
  },
  stickyBar: { padding: spacing.lg, backgroundColor: colors.background },
  shakeCount: { fontFamily: fonts.black, fontSize: 64 },
  progressTrack: {
    width: "100%",
    height: 14,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceHighlight,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
    marginTop: spacing.lg,
  },
  progressFill: { height: "100%", borderRadius: radius.pill },
  tapBtn: {
    marginTop: spacing.xl,
    borderWidth: 2,
    borderRadius: radius.pill,
    width: 120,
    height: 120,
    alignItems: "center",
    justifyContent: "center",
  },
  tapBtnText: { fontFamily: fonts.black, fontSize: 28 },
});
