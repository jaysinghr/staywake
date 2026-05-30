import React from "react";
import { ImageBackground, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAlarm } from "@/src/store/AlarmContext";
import { colors, fonts, media, radius, spacing } from "@/src/theme";

export default function StatsScreen() {
  const { history, streak } = useAlarm();
  const insets = useSafeAreaInsets();

  const completed = history.filter((h) => h.status !== "in-progress");
  const wins = completed.filter((h) => h.status === "success").length;
  const losses = completed.filter((h) => h.status === "failed").length;
  const total = wins + losses;
  const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;
  const totalMisses = history.reduce((s, h) => s + h.misses, 0);

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.md }]}>
      <ImageBackground
        source={{ uri: media.successBg }}
        style={styles.hero}
        imageStyle={styles.heroImg}
      >
        <View style={styles.heroOverlay} />
        <Text style={styles.heroLabel}>CURRENT STREAK</Text>
        <View style={styles.streakRow}>
          <Ionicons name="flame" size={40} color={colors.urgent} />
          <Text style={styles.streakNum} testID="streak-number">
            {streak}
          </Text>
        </View>
        <Text style={styles.heroSub}>
          {streak === 0 ? "Win a morning to start your streak" : `${streak} day${streak > 1 ? "s" : ""} of real wake-ups`}
        </Text>
      </ImageBackground>

      <View style={styles.statGrid}>
        <View style={[styles.statBox, { borderColor: colors.success }]}>
          <Text style={[styles.statNum, { color: colors.success }]}>{wins}</Text>
          <Text style={styles.statLabel}>MORNINGS WON</Text>
        </View>
        <View style={[styles.statBox, { borderColor: colors.urgent }]}>
          <Text style={[styles.statNum, { color: colors.urgent }]}>{losses}</Text>
          <Text style={styles.statLabel}>MISSED</Text>
        </View>
      </View>
      <View style={styles.statGrid}>
        <View style={styles.statBox}>
          <Text style={[styles.statNum, { color: colors.primary }]}>{winRate}%</Text>
          <Text style={styles.statLabel}>WIN RATE</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statNum, { color: colors.textPrimary }]}>{totalMisses}</Text>
          <Text style={styles.statLabel}>SNOOZE SLIPS</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>HISTORY</Text>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        {history.length === 0 && (
          <Text style={styles.emptyHistory}>No mornings logged yet. Run a TEST or set an alarm.</Text>
        )}
        {history.slice(0, 50).map((h) => {
          const color =
            h.status === "success"
              ? colors.success
              : h.status === "failed"
                ? colors.urgent
                : colors.textSecondary;
          const icon =
            h.status === "success"
              ? "checkmark-circle"
              : h.status === "failed"
                ? "close-circle"
                : "time";
          return (
            <View key={h.id} style={styles.historyRow} testID={`history-${h.id}`}>
              <Ionicons name={icon} size={22} color={color} />
              <View style={{ flex: 1 }}>
                <Text style={styles.historyLabel}>
                  {h.label} · {h.displayTime}
                </Text>
                <Text style={styles.historyMeta}>
                  {h.dateKey} · {h.checkInsPassed}/{h.checkInTotal} check-ins
                  {h.misses > 0 ? ` · ${h.misses} miss` : ""}
                </Text>
              </View>
              <Text style={[styles.historyStatus, { color }]}>
                {h.status === "in-progress" ? "ACTIVE" : h.status.toUpperCase()}
              </Text>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: spacing.lg },
  hero: {
    borderRadius: radius.card,
    overflow: "hidden",
    padding: spacing.lg,
    marginBottom: spacing.md,
    minHeight: 150,
    justifyContent: "center",
  },
  heroImg: { opacity: 0.5 },
  heroOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(10,10,10,0.55)" },
  heroLabel: {
    fontFamily: fonts.bodyExtra,
    fontSize: 12,
    letterSpacing: 2,
    color: colors.textSecondary,
  },
  streakRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  streakNum: { fontFamily: fonts.black, fontSize: 72, color: colors.textPrimary, lineHeight: 78 },
  heroSub: { fontFamily: fonts.body, fontSize: 14, color: colors.textPrimary },
  statGrid: { flexDirection: "row", gap: spacing.md, marginBottom: spacing.md },
  statBox: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.card,
    padding: spacing.lg,
  },
  statNum: { fontFamily: fonts.black, fontSize: 40 },
  statLabel: {
    fontFamily: fonts.bodyExtra,
    fontSize: 11,
    letterSpacing: 1.5,
    color: colors.textSecondary,
    marginTop: 2,
  },
  sectionTitle: {
    fontFamily: fonts.extraBold,
    fontSize: 18,
    letterSpacing: 1,
    color: colors.textPrimary,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  emptyHistory: { fontFamily: fonts.body, fontSize: 14, color: colors.textSecondary },
  historyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.card,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  historyLabel: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.textPrimary },
  historyMeta: { fontFamily: fonts.body, fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  historyStatus: { fontFamily: fonts.bodyExtra, fontSize: 11, letterSpacing: 1 },
});
