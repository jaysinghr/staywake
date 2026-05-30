import React, { useEffect } from "react";
import { ImageBackground, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown, ZoomIn } from "react-native-reanimated";

import { useAlarm } from "@/src/store/AlarmContext";
import { colors, fonts, media, radius, spacing } from "@/src/theme";
import Button from "@/src/components/Button";

export default function SuccessScreen() {
  const { session, streak, clearSession } = useAlarm();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!session) router.replace("/");
  }, [session, router]);

  if (!session) return null;

  const done = () => {
    clearSession();
    router.replace("/");
  };

  return (
    <ImageBackground source={{ uri: media.successBg }} style={styles.bg} imageStyle={styles.bgImg}>
      <View style={styles.overlay} />
      <View style={[styles.content, { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.xl }]}>
        <View style={styles.center}>
          <Animated.View entering={ZoomIn.duration(500)} style={styles.badge}>
            <Ionicons name="checkmark" size={56} color={colors.black} />
          </Animated.View>
          <Animated.Text entering={FadeInDown.delay(200)} style={styles.title}>
            MORNING{"\n"}COMPLETE
          </Animated.Text>
          <Animated.Text entering={FadeInDown.delay(350)} style={styles.sub}>
            You stayed up. No going back to bed today.
          </Animated.Text>

          <Animated.View entering={FadeInDown.delay(500)} style={styles.statsRow}>
            <View style={styles.statBox}>
              <Ionicons name="flame" size={22} color={colors.urgent} />
              <Text style={styles.statNum}>{streak}</Text>
              <Text style={styles.statLabel}>DAY STREAK</Text>
            </View>
            <View style={styles.statBox}>
              <Ionicons name="checkmark-done" size={22} color={colors.success} />
              <Text style={styles.statNum}>{session.checkInTotal}</Text>
              <Text style={styles.statLabel}>CHECK-INS</Text>
            </View>
            <View style={styles.statBox}>
              <Ionicons name="warning" size={22} color={colors.textSecondary} />
              <Text style={styles.statNum}>{session.misses}</Text>
              <Text style={styles.statLabel}>SLIPS</Text>
            </View>
          </Animated.View>
        </View>

        <Button title="Start My Day" testID="success-done-btn" variant="success" size="lg" onPress={done} />
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: colors.background },
  bgImg: { opacity: 0.45 },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(10,10,10,0.6)" },
  content: { flex: 1, justifyContent: "space-between", paddingHorizontal: spacing.lg },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  badge: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: colors.success,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
  },
  title: {
    fontFamily: fonts.black,
    fontSize: 52,
    color: colors.textPrimary,
    textAlign: "center",
    letterSpacing: -1,
    lineHeight: 52,
  },
  sub: {
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: spacing.md,
  },
  statsRow: { flexDirection: "row", gap: spacing.md, marginTop: spacing.xl },
  statBox: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.card,
    paddingVertical: spacing.md,
    alignItems: "center",
    gap: 2,
  },
  statNum: { fontFamily: fonts.black, fontSize: 28, color: colors.textPrimary },
  statLabel: { fontFamily: fonts.bodyExtra, fontSize: 10, letterSpacing: 1, color: colors.textSecondary },
});
