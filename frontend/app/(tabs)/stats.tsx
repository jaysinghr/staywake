import React from "react";
import { ImageBackground, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAlarm } from "@/src/store/AlarmContext";
import { colors, fonts, media, radius, spacing } from "@/src/theme";
import {
  bestStreak,
  computeChallenges,
  currentStreak,
  weeklyWins,
} from "@/src/lib/staywake";

function scoreColor(score: number) {
  if (score >= 90) return colors.success;
  if (score >= 75) return colors.primary;
  if (score >= 50) return "#FFB020";
  return colors.urgent;
}

export default function ProgressScreen() {
  const { history, isPro } = useAlarm();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const streak = currentStreak(history);
  const best = bestStreak(history);
  const weekly = weeklyWins(history);

  const completed = history.filter((h) => h.status !== "in-progress");
  const wins = completed.filter((h) => h.status === "success" || h.status === "recovered").length;
  const losses = completed.filter((h) => h.status === "failed").length;
  const scored = completed.filter((h) => h.wakeScore > 0);
  const avgScore = scored.length
    ? Math.round(scored.reduce((s, h) => s + h.wakeScore, 0) / scored.length)
    : 0;
  const totalReAlarms = history.reduce((s, h) => s + h.reAlarms, 0);
  const challenges = computeChallenges(history);

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.md }]}>
      <Text style={styles.screenTitle}>PROGRESS</Text>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 110 }}>
        <ImageBackground source={{ uri: media.successBg }} style={styles.hero} imageStyle={styles.heroImg}>
          <View style={styles.heroOverlay} />
          <View style={styles.heroRow}>
            <View style={styles.heroBlock}>
              <Ionicons name="flame" size={24} color={colors.urgent} />
              <Text style={styles.heroNum} testID="streak-number">{streak}</Text>
              <Text style={styles.heroLabel}>CURRENT</Text>
            </View>
            <View style={styles.heroDivider} />
            <View style={styles.heroBlock}>
              <Ionicons name="trophy" size={24} color={colors.primary} />
              <Text style={styles.heroNum} testID="best-streak">{best}</Text>
              <Text style={styles.heroLabel}>BEST</Text>
            </View>
            <View style={styles.heroDivider} />
            <View style={styles.heroBlock}>
              <Ionicons name="calendar" size={24} color={colors.success} />
              <Text style={styles.heroNum} testID="weekly-wins">{weekly}</Text>
              <Text style={styles.heroLabel}>THIS WEEK</Text>
            </View>
          </View>
        </ImageBackground>

        <View style={styles.statGrid}>
          <View style={[styles.statBox, { borderColor: colors.success }]}>
            <Text style={[styles.statNum, { color: colors.success }]}>{wins}</Text>
            <Text style={styles.statLabel}>MORNINGS WON</Text>
          </View>
          <View style={[styles.statBox, { borderColor: colors.primary }]}>
            <Text style={[styles.statNum, { color: colors.primary }]}>{avgScore}</Text>
            <Text style={styles.statLabel}>AVG WAKE SCORE</Text>
          </View>
        </View>
        <View style={styles.statGrid}>
          <View style={styles.statBox}>
            <Text style={[styles.statNum, { color: colors.urgent }]}>{losses}</Text>
            <Text style={styles.statLabel}>FAILED</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statNum, { color: colors.textPrimary }]}>{totalReAlarms}</Text>
            <Text style={styles.statLabel}>RE-ALARMS</Text>
          </View>
        </View>

        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>CHALLENGES</Text>
          {!isPro && (
            <View style={styles.lockTag}>
              <Ionicons name="lock-closed" size={11} color={colors.primary} />
              <Text style={styles.lockTagText}>PRO</Text>
            </View>
          )}
        </View>

        <View style={styles.challengeWrap}>
          {challenges.map((c) => {
            const pct = c.target > 0 ? c.value / c.target : 0;
            return (
              <View key={c.id} style={styles.challenge} testID={`challenge-${c.id}`}>
                <View style={styles.challengeTop}>
                  <Text style={styles.challengeLabel} numberOfLines={1}>{c.label}</Text>
                  <Text style={styles.challengeCount}>{c.value}/{c.target}</Text>
                </View>
                <View style={styles.track}>
                  <View style={[styles.fill, { width: `${pct * 100}%` }]} />
                </View>
              </View>
            );
          })}
          {!isPro && (
            <Pressable testID="challenges-upgrade" onPress={() => router.push("/paywall")} style={styles.lockOverlay}>
              <Ionicons name="lock-closed" size={26} color={colors.primary} />
              <Text style={styles.lockOverlayText}>Unlock challenges with Pro</Text>
              <Text style={styles.lockOverlayCta}>UPGRADE</Text>
            </Pressable>
          )}
        </View>

        <Text style={styles.sectionTitle}>HISTORY</Text>
        {history.length === 0 && (
          <Text style={styles.emptyHistory}>No mornings logged yet. Run a TEST or set an alarm.</Text>
        )}
        {history.slice(0, 50).map((h) => {
          const color =
            h.status === "success"
              ? colors.success
              : h.status === "recovered"
                ? colors.primary
                : h.status === "failed"
                  ? colors.urgent
                  : colors.textSecondary;
          const icon =
            h.status === "failed" ? "close-circle" : h.status === "in-progress" ? "time" : "checkmark-circle";
          return (
            <View key={h.id} style={styles.historyRow} testID={`history-${h.id}`}>
              <Ionicons name={icon} size={22} color={color} />
              <View style={{ flex: 1 }}>
                <Text style={styles.historyLabel}>{h.label} · {h.displayTime}</Text>
                <Text style={styles.historyMeta}>
                  {h.dateKey} · {h.checkInsPassed}/{h.checkInTotal} check-ins
                  {h.reAlarms > 0 ? ` · ${h.reAlarms} re-alarm` : ""}
                </Text>
              </View>
              {h.wakeScore > 0 ? (
                <View style={[styles.scoreBadge, { borderColor: scoreColor(h.wakeScore) }]}>
                  <Text style={[styles.scoreBadgeText, { color: scoreColor(h.wakeScore) }]}>{h.wakeScore}</Text>
                </View>
              ) : (
                <Text style={[styles.historyStatus, { color }]}>
                  {h.status === "in-progress" ? "ACTIVE" : h.status.toUpperCase()}
                </Text>
              )}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: spacing.lg },
  screenTitle: { fontFamily: fonts.black, fontSize: 30, color: colors.textPrimary, marginBottom: spacing.md },
  hero: { borderRadius: radius.card, overflow: "hidden", padding: spacing.lg, marginBottom: spacing.md, minHeight: 120, justifyContent: "center" },
  heroImg: { opacity: 0.4 },
  heroOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(10,10,10,0.6)" },
  heroRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  heroBlock: { flex: 1, alignItems: "center", gap: 2 },
  heroDivider: { width: 1, height: 60, backgroundColor: colors.border },
  heroNum: { fontFamily: fonts.black, fontSize: 40, color: colors.textPrimary, lineHeight: 44 },
  heroLabel: { fontFamily: fonts.bodyExtra, fontSize: 10, letterSpacing: 1.5, color: colors.textSecondary },
  statGrid: { flexDirection: "row", gap: spacing.md, marginBottom: spacing.md },
  statBox: { flex: 1, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.card, padding: spacing.lg },
  statNum: { fontFamily: fonts.black, fontSize: 36 },
  statLabel: { fontFamily: fonts.bodyExtra, fontSize: 11, letterSpacing: 1.5, color: colors.textSecondary, marginTop: 2 },
  sectionHead: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: spacing.sm, marginBottom: spacing.md },
  sectionTitle: { fontFamily: fonts.extraBold, fontSize: 18, letterSpacing: 1, color: colors.textPrimary, marginTop: spacing.sm, marginBottom: spacing.md },
  lockTag: { flexDirection: "row", alignItems: "center", gap: 3, borderWidth: 1, borderColor: colors.primary, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2 },
  lockTagText: { fontFamily: fonts.bodyExtra, fontSize: 10, letterSpacing: 1, color: colors.primary },
  challengeWrap: { position: "relative", gap: spacing.sm, marginBottom: spacing.lg },
  challenge: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.card, padding: spacing.md },
  challengeTop: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  challengeLabel: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.textPrimary, flex: 1, marginRight: 8 },
  challengeCount: { fontFamily: fonts.monoBold, fontSize: 14, color: colors.primary },
  track: { height: 10, borderRadius: radius.pill, backgroundColor: colors.surfaceHighlight, overflow: "hidden" },
  fill: { height: "100%", backgroundColor: colors.primary, borderRadius: radius.pill },
  lockOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(10,10,10,0.82)",
    borderRadius: radius.card,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  lockOverlayText: { fontFamily: fonts.body, fontSize: 14, color: colors.textPrimary },
  lockOverlayCta: { fontFamily: fonts.extraBold, fontSize: 14, letterSpacing: 1, color: colors.primary, marginTop: 4 },
  emptyHistory: { fontFamily: fonts.body, fontSize: 14, color: colors.textSecondary },
  historyRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.card, padding: spacing.md, marginBottom: spacing.sm },
  historyLabel: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.textPrimary },
  historyMeta: { fontFamily: fonts.body, fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  historyStatus: { fontFamily: fonts.bodyExtra, fontSize: 11, letterSpacing: 1 },
  scoreBadge: { borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4, minWidth: 40, alignItems: "center" },
  scoreBadgeText: { fontFamily: fonts.black, fontSize: 16 },
});
