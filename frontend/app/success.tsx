import React, { useEffect, useMemo, useRef, useState } from "react";
import { ImageBackground, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown, ZoomIn } from "react-native-reanimated";
import { captureRef } from "react-native-view-shot";
import * as Sharing from "expo-sharing";

import { useAlarm } from "@/src/store/AlarmContext";
import { colors, fonts, media, radius, spacing } from "@/src/theme";
import { computeWakeScore, currentStreak, scoreGrade, hypeLine } from "@/src/lib/staywake";
import Button from "@/src/components/Button";
import Confetti from "@/src/components/Confetti";
import ShareCard from "@/src/components/ShareCard";

export default function SuccessScreen() {
  const { session, history, clearSession } = useAlarm();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const streak = currentStreak(history);
  const cardRef = useRef<View>(null);
  const [sharing, setSharing] = useState(false);

  const score = useMemo(() => {
    if (!session) return 100;
    const ringToMissionSec = session.missionCompletedAt
      ? Math.round((session.missionCompletedAt - session.ringAt) / 1000)
      : 0;
    return computeWakeScore({
      ringToMissionSec,
      checkInsMissed: session.checkInsMissed,
      reAlarms: session.reAlarms,
      snoozesUsed: session.snoozesUsed,
    });
  }, [session]);

  const dateLabel = useMemo(
    () => new Date().toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }),
    [],
  );

  useEffect(() => {
    if (!session) router.replace("/");
  }, [session, router]);

  if (!session) return null;

  const done = () => {
    clearSession();
    router.replace("/");
  };

  const onShare = async () => {
    if (sharing) return;
    setSharing(true);
    try {
      const uri = await captureRef(cardRef, { format: "png", quality: 1 });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: "image/png",
          dialogTitle: "Share your Wake Score",
        });
      }
    } catch {
      // sharing unavailable in this environment — fail quietly
    } finally {
      setSharing(false);
    }
  };

  return (
    <ImageBackground source={{ uri: media.successBg }} style={styles.bg} imageStyle={styles.bgImg}>
      <View style={styles.overlay} />
      <Confetti count={90} />

      {/* Off-screen card rendered for image capture only. */}
      <View style={styles.offscreen} pointerEvents="none">
        <View ref={cardRef} collapsable={false}>
          <ShareCard score={score} streak={streak} dateLabel={dateLabel} />
        </View>
      </View>

      <View style={[styles.content, { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.xl }]}>
        <View style={styles.center}>
          <Animated.View entering={ZoomIn.duration(500)} style={styles.badge}>
            <Ionicons name="checkmark" size={56} color={colors.black} />
          </Animated.View>
          <Animated.Text entering={FadeInDown.delay(200)} style={styles.title}>
            YOU BEAT{"\n"}THE BED
          </Animated.Text>
          <Animated.Text entering={FadeInDown.delay(350)} style={styles.sub}>
            {hypeLine(score, streak)}
          </Animated.Text>

          <Animated.View entering={ZoomIn.delay(450)} style={styles.scoreWrap} testID="success-score">
            <Text style={styles.scoreLabel}>WAKE SCORE</Text>
            <Text style={styles.scoreNum}>{score}</Text>
            <Text style={styles.scoreGrade}>{scoreGrade(score).label}</Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(550)} style={styles.statsRow}>
            <View style={styles.statBox}>
              <Ionicons name="flame" size={20} color={colors.urgent} />
              <Text style={styles.statNum}>{streak}</Text>
              <Text style={styles.statLabel}>STREAK</Text>
            </View>
            <View style={styles.statBox}>
              <Ionicons name="checkmark-done" size={20} color={colors.success} />
              <Text style={styles.statNum}>{session.checkInTotal}</Text>
              <Text style={styles.statLabel}>CHECK-INS</Text>
            </View>
            <View style={styles.statBox}>
              <Ionicons name="warning" size={20} color={colors.textSecondary} />
              <Text style={styles.statNum}>{session.checkInsMissed}</Text>
              <Text style={styles.statLabel}>MISSES</Text>
            </View>
          </Animated.View>
        </View>

        <View style={styles.actions}>
          <Pressable testID="success-share-btn" onPress={onShare} disabled={sharing} style={styles.shareBtn}>
            <Ionicons name="share-social" size={18} color={colors.textPrimary} />
            <Text style={styles.shareText}>{sharing ? "PREPARING…" : "SHARE MY SCORE"}</Text>
          </Pressable>
          <Button title="Start My Day" testID="success-done-btn" variant="success" size="lg" onPress={done} />
        </View>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: colors.background },
  bgImg: { opacity: 0.45 },
  offscreen: { position: "absolute", left: -9999, top: 0 },
  actions: { gap: spacing.sm },
  shareBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: spacing.md,
    borderRadius: radius.button,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  shareText: { fontFamily: fonts.bodyExtra, fontSize: 14, letterSpacing: 1.5, color: colors.textPrimary },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(10,10,10,0.6)" },
  content: { flex: 1, justifyContent: "space-between", paddingHorizontal: spacing.lg },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  badge: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.success,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  title: {
    fontFamily: fonts.black,
    fontSize: 48,
    color: colors.textPrimary,
    textAlign: "center",
    letterSpacing: -1,
    lineHeight: 48,
  },
  sub: { fontFamily: fonts.body, fontSize: 15, color: colors.textSecondary, textAlign: "center", marginTop: spacing.sm },
  scoreWrap: {
    alignItems: "center",
    marginTop: spacing.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.card,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  scoreLabel: { fontFamily: fonts.bodyExtra, fontSize: 11, letterSpacing: 2, color: colors.textSecondary },
  scoreNum: { fontFamily: fonts.black, fontSize: 56, color: colors.primary, lineHeight: 60 },
  scoreGrade: { fontFamily: fonts.bold, fontSize: 16, color: colors.textPrimary, letterSpacing: 1 },
  statsRow: { flexDirection: "row", gap: spacing.md, marginTop: spacing.lg },
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
  statNum: { fontFamily: fonts.black, fontSize: 26, color: colors.textPrimary },
  statLabel: { fontFamily: fonts.bodyExtra, fontSize: 10, letterSpacing: 1, color: colors.textSecondary },
});
