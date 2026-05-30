import React, { useEffect } from "react";
import { ImageBackground, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
} from "react-native-reanimated";

import { useAlarm } from "@/src/store/AlarmContext";
import { colors, fonts, media, spacing } from "@/src/theme";
import Button from "@/src/components/Button";

export default function RingScreen() {
  const { session, beginDismissMission } = useAlarm();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const pulse = useSharedValue(0);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/immutability
    pulse.value = withRepeat(
      withTiming(1, { duration: 700, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [pulse]);

  useEffect(() => {
    if (!session) router.replace("/");
  }, [session, router]);

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: 0.45 + pulse.value * 0.3,
  }));
  const timeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + pulse.value * 0.04 }],
  }));

  if (!session) return null;

  const isReRing = session.cycle > 0;

  return (
    <ImageBackground source={{ uri: media.alarmRingingBg }} style={styles.bg}>
      <Animated.View style={[styles.overlay, overlayStyle]} />
      <View style={[styles.content, { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.xl }]}>
        <View style={styles.top}>
          <View style={styles.alarmTag}>
            <Ionicons name="alarm" size={16} color={colors.urgent} />
            <Text style={styles.alarmTagText}>
              {isReRing ? "MISSED CHECK-IN · ALARM AGAIN" : "WAKE UP NOW"}
            </Text>
          </View>
          <Animated.Text style={[styles.time, timeStyle]} testID="ring-time">
            {session.displayTime}
          </Animated.Text>
          <Text style={styles.label}>{session.label}</Text>
        </View>

        <View style={styles.bottom}>
          <Text style={styles.hint}>
            No snooze. Complete a {session.dismissMission} mission to stop the alarm.
          </Text>
          <Button
            title="Stop Alarm"
            testID="stop-alarm-btn"
            variant="urgent"
            size="lg"
            onPress={beginDismissMission}
          />
        </View>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: colors.black },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "#1a0202" },
  content: { flex: 1, justifyContent: "space-between", paddingHorizontal: spacing.lg },
  top: { alignItems: "center", marginTop: spacing.xxl },
  alarmTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: colors.urgent,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  alarmTagText: { fontFamily: fonts.bodyExtra, fontSize: 12, letterSpacing: 2, color: colors.urgent },
  time: {
    fontFamily: fonts.black,
    fontSize: 96,
    color: colors.textPrimary,
    letterSpacing: -2,
    marginTop: spacing.lg,
  },
  label: { fontFamily: fonts.bold, fontSize: 24, color: colors.textPrimary, opacity: 0.9 },
  bottom: { gap: spacing.md },
  hint: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.textPrimary,
    textAlign: "center",
    opacity: 0.85,
  },
});
