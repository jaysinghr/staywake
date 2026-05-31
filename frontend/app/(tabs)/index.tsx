import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAlarm, FREE_ALARM_LIMIT } from "@/src/store/AlarmContext";
import { Alarm, MissionType } from "@/src/types";
import { colors, fonts, media, radius, spacing } from "@/src/theme";
import { repeatLabel, to12h } from "@/src/lib/time";
import { STAY_AWAKE_MODES, currentStreak } from "@/src/lib/staywake";

const MISSION_META: Record<MissionType, { icon: keyof typeof Ionicons.glyphMap; label: string }> = {
  math: { icon: "calculator", label: "Math" },
  typing: { icon: "create", label: "Type" },
  shake: { icon: "phone-portrait", label: "Shake" },
  qr: { icon: "qr-code", label: "QR Scan" },
  step: { icon: "walk", label: "Steps" },
};

function AwakeBanner() {
  const { session } = useAlarm();
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!session || session.phase !== "awake" || !session.nextCheckInAt) return null;
  const remaining = Math.max(0, Math.ceil((session.nextCheckInAt - now) / 1000));

  return (
    <View style={styles.banner} testID="stay-awake-banner">
      <View style={styles.bannerRow}>
        <View style={styles.bannerDot} />
        <Text style={styles.bannerTitle}>STAY-AWAKE MODE ACTIVE</Text>
      </View>
      <Text style={styles.bannerSub}>
        Don&apos;t go back to bed. Next check-in in{" "}
        <Text style={styles.bannerCountdown}>{remaining}s</Text>
      </Text>
      <Text style={styles.bannerProgress}>
        Check-ins passed: {session.checkInsPassed}/{session.checkInTotal}
        {session.checkInsMissed > 0
          ? `  ·  ${session.checkInsMissed} miss${session.checkInsMissed > 1 ? "es" : ""}`
          : ""}
      </Text>
    </View>
  );
}

function AlarmCard({ alarm }: { alarm: Alarm }) {
  const { toggleAlarm, fireAlarmNow } = useAlarm();
  const router = useRouter();
  const { time, period } = to12h(alarm.hour, alarm.minute);
  const mission = MISSION_META[alarm.missionType];

  return (
    <View testID={`alarm-card-${alarm.id}`} style={[styles.card, alarm.enabled && styles.cardActive]}>
      <View style={styles.cardTop}>
        <View style={styles.timeRow}>
          <Text style={[styles.time, !alarm.enabled && styles.dim]}>{time}</Text>
          <Text style={[styles.period, !alarm.enabled && styles.dim]}>{period}</Text>
        </View>
        <Switch
          testID={`alarm-toggle-${alarm.id}`}
          value={alarm.enabled}
          onValueChange={(v) => toggleAlarm(alarm.id, v)}
          trackColor={{ false: colors.border, true: colors.primary }}
          thumbColor={colors.textPrimary}
          ios_backgroundColor={colors.border}
        />
      </View>

      <Text style={[styles.cardLabel, !alarm.enabled && styles.dim]} numberOfLines={1}>
        {alarm.label || "Alarm"}
      </Text>

      <View style={styles.metaRow}>
        <View style={styles.chip}>
          <Ionicons name="repeat" size={13} color={colors.textSecondary} />
          <Text style={styles.chipText}>{repeatLabel(alarm.repeatDays)}</Text>
        </View>
        <View style={styles.chip}>
          <Ionicons name={mission.icon} size={13} color={colors.textSecondary} />
          <Text style={styles.chipText}>{mission.label}</Text>
        </View>
        <View style={styles.chip}>
          <Ionicons name="shield-checkmark" size={13} color={colors.textSecondary} />
          <Text style={styles.chipText}>{STAY_AWAKE_MODES[alarm.stayAwakeMode].label}</Text>
        </View>
      </View>

      <View style={styles.cardActions}>
        <Pressable
          testID={`alarm-test-${alarm.id}`}
          onPress={() => fireAlarmNow(alarm.id)}
          style={styles.testBtn}
          hitSlop={8}
        >
          <Ionicons name="play" size={14} color={colors.primary} />
          <Text style={styles.testBtnText}>TEST RUN (FAST)</Text>
        </Pressable>
        <Pressable
          testID={`alarm-edit-${alarm.id}`}
          onPress={() => router.push(`/set-alarm?id=${alarm.id}`)}
          style={styles.editBtn}
          hitSlop={8}
        >
          <Ionicons name="create-outline" size={14} color={colors.textSecondary} />
          <Text style={styles.editBtnText}>EDIT</Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function AlarmsScreen() {
  const { alarms, history, loading, meta, isPro } = useAlarm();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const streak = currentStreak(history);

  // First-run onboarding redirect.
  useEffect(() => {
    if (!loading && !meta.onboardingDone) {
      router.replace("/onboarding");
    }
  }, [loading, meta.onboardingDone, router]);

  const onAdd = () => {
    if (!isPro && alarms.length >= FREE_ALARM_LIMIT) {
      router.push("/paywall");
      return;
    }
    router.push("/set-alarm");
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.md }]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.brand}>STAYWAKE</Text>
          <Text style={styles.slogan}>Wake up. Stay up.</Text>
        </View>
        <View style={styles.headerRight}>
          {!isPro && (
            <Pressable testID="header-pro-btn" onPress={() => router.push("/paywall")} style={styles.proPill}>
              <Ionicons name="star" size={13} color={colors.black} />
              <Text style={styles.proPillText}>PRO</Text>
            </Pressable>
          )}
          {streak > 0 && (
            <View style={styles.streakPill} testID="header-streak">
              <Ionicons name="flame" size={16} color={colors.urgent} />
              <Text style={styles.streakText}>{streak}</Text>
            </View>
          )}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <AwakeBanner />

        {!loading && alarms.length === 0 && (
          <View style={styles.empty} testID="empty-state">
            <Image source={{ uri: media.emptyStateSleep }} style={styles.emptyImg} contentFit="contain" />
            <Text style={styles.emptyTitle}>NO ALARMS YET</Text>
            <Text style={styles.emptySub}>
              Set your first wake-up and prove you&apos;re awake — for real this time.
            </Text>
          </View>
        )}

        {alarms.map((a) => (
          <AlarmCard key={a.id} alarm={a} />
        ))}

        {!isPro && alarms.length > 0 && (
          <Text style={styles.limitNote}>
            Free plan: {alarms.length}/{FREE_ALARM_LIMIT} alarms used
          </Text>
        )}

        <View style={{ height: 110 }} />
      </ScrollView>

      <Pressable testID="add-alarm-fab" onPress={onAdd} style={[styles.fab, { bottom: spacing.lg }]}>
        <Ionicons name="add" size={28} color={colors.black} />
        <Text style={styles.fabText}>ADD ALARM</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: spacing.lg },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: spacing.md },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  brand: { fontFamily: fonts.black, fontSize: 34, color: colors.textPrimary, letterSpacing: -1 },
  slogan: { fontFamily: fonts.body, fontSize: 13, color: colors.primary, letterSpacing: 0.5 },
  proPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  proPillText: { fontFamily: fonts.extraBold, fontSize: 13, color: colors.black, letterSpacing: 1 },
  streakPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  streakText: { fontFamily: fonts.black, fontSize: 18, color: colors.textPrimary },
  scroll: { paddingTop: spacing.sm },
  banner: {
    backgroundColor: colors.surfaceHighlight,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.card,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  bannerRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  bannerDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
  bannerTitle: { fontFamily: fonts.bodyExtra, fontSize: 12, letterSpacing: 2, color: colors.primary },
  bannerSub: { fontFamily: fonts.body, fontSize: 15, color: colors.textPrimary },
  bannerCountdown: { fontFamily: fonts.monoBold, color: colors.primary },
  bannerProgress: { fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary, marginTop: 4 },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.card,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  cardActive: { borderColor: colors.primary, backgroundColor: colors.surfaceHighlight },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  timeRow: { flexDirection: "row", alignItems: "flex-end", gap: 6 },
  time: { fontFamily: fonts.black, fontSize: 56, color: colors.textPrimary, lineHeight: 58 },
  period: { fontFamily: fonts.bold, fontSize: 22, color: colors.textPrimary, marginBottom: 8 },
  dim: { color: colors.textSecondary },
  cardLabel: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.textPrimary, marginTop: 4 },
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: spacing.md },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  chipText: { fontFamily: fonts.body, fontSize: 12, color: colors.textSecondary },
  cardActions: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  testBtn: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: spacing.md, paddingVertical: 6 },
  testBtnText: { fontFamily: fonts.bodyExtra, fontSize: 12, letterSpacing: 1.5, color: colors.primary },
  editBtn: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: spacing.md, paddingVertical: 6 },
  editBtnText: { fontFamily: fonts.bodyExtra, fontSize: 12, letterSpacing: 1.5, color: colors.textSecondary },
  limitNote: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: spacing.xs,
  },
  empty: { alignItems: "center", paddingTop: spacing.xxl, paddingHorizontal: spacing.lg },
  emptyImg: { width: 180, height: 180, marginBottom: spacing.lg },
  emptyTitle: { fontFamily: fonts.black, fontSize: 26, color: colors.textPrimary },
  emptySub: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: spacing.sm,
    lineHeight: 22,
  },
  fab: {
    position: "absolute",
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  fabText: { fontFamily: fonts.extraBold, fontSize: 16, color: colors.black, letterSpacing: 1 },
});
