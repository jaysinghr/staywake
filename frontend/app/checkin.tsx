import React, { useEffect, useRef, useState } from "react";
import { ImageBackground, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAlarm } from "@/src/store/AlarmContext";
import { colors, fonts, media, radius, spacing } from "@/src/theme";
import Button from "@/src/components/Button";

export default function CheckInScreen() {
  const { session, beginCheckInMission, onCheckInMissed } = useAlarm();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const totalSecs = session?.fast ? 20 : 60;
  const [secs, setSecs] = useState(totalSecs);
  const firedMiss = useRef(false);

  useEffect(() => {
    if (!session) {
      router.replace("/");
      return;
    }
    const id = setInterval(() => {
      setSecs((s) => {
        if (s <= 1) {
          clearInterval(id);
          if (!firedMiss.current) {
            firedMiss.current = true;
            onCheckInMissed();
          }
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!session) return null;

  const progress = secs / totalSecs;

  return (
    <ImageBackground source={{ uri: media.successBg }} style={styles.bg} imageStyle={styles.bgImg}>
      <View style={styles.overlay} />
      <View style={[styles.content, { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.xl }]}>
        <View style={styles.top}>
          <View style={styles.tag}>
            <Ionicons name="pulse" size={16} color={colors.primary} />
            <Text style={styles.tagText}>STAY-AWAKE CHECK-IN</Text>
          </View>
          <Text style={styles.title}>STILL AWAKE?</Text>
          <Text style={styles.sub}>
            Respond before the timer runs out — or the alarm comes back.
          </Text>
        </View>

        <View style={styles.center}>
          <Text style={[styles.count, secs <= 5 && { color: colors.urgent }]} testID="checkin-countdown">
            {secs}
          </Text>
          <Text style={styles.countLabel}>SECONDS LEFT</Text>
          <View style={styles.track}>
            <View
              style={[
                styles.fill,
                { width: `${progress * 100}%`, backgroundColor: secs <= 5 ? colors.urgent : colors.primary },
              ]}
            />
          </View>
          <Text style={styles.progressText}>
            {session.checkInsPassed}/{session.checkInTotal} check-ins passed
          </Text>
        </View>

        <Button
          title="I Am Awake"
          testID="i-am-awake-btn"
          variant="primary"
          size="lg"
          onPress={beginCheckInMission}
        />
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: colors.background },
  bgImg: { opacity: 0.35 },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(10,10,10,0.7)" },
  content: { flex: 1, justifyContent: "space-between", paddingHorizontal: spacing.lg },
  top: { alignItems: "center", marginTop: spacing.lg },
  tag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
  },
  tagText: { fontFamily: fonts.bodyExtra, fontSize: 11, letterSpacing: 2, color: colors.primary },
  title: { fontFamily: fonts.black, fontSize: 44, color: colors.textPrimary, marginTop: spacing.md },
  sub: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  center: { alignItems: "center" },
  count: { fontFamily: fonts.black, fontSize: 110, color: colors.primary, lineHeight: 116 },
  countLabel: { fontFamily: fonts.bodyExtra, fontSize: 12, letterSpacing: 3, color: colors.textSecondary },
  track: {
    width: "100%",
    height: 14,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceHighlight,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
    marginTop: spacing.lg,
  },
  fill: { height: "100%", borderRadius: radius.pill },
  progressText: { fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary, marginTop: spacing.md },
});
