import React, { useCallback, useEffect, useState } from "react";
import { AppState, Linking, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import SubScreen from "@/src/components/SubScreen";
import Button from "@/src/components/Button";
import { colors, fonts, radius, spacing } from "@/src/theme";
import {
  ensureNotificationPermission,
  getNotificationPermissionStatus,
  PermStatus,
} from "@/src/lib/notifications";
import { scheduleTestAlarm } from "@/src/lib/alarm-notify";

const TIPS = [
  { icon: "battery-charging", title: "Disable battery optimisation", text: "Android may kill background apps to save power. Allow StayWake to run unrestricted in your phone's battery settings." },
  { icon: "alarm", title: "Allow exact alarms", text: "On Android 12+, grant the 'Alarms & reminders' permission so wake-ups fire at the precise second." },
  { icon: "notifications", title: "Keep notifications on", text: "StayWake uses a high-priority alarm notification channel to ring and show the full-screen alarm." },
  { icon: "moon", title: "Do Not Disturb", text: "DND can mute sound. Add StayWake as an allowed app, or rely on vibration + the full-screen alarm." },
  { icon: "refresh", title: "Restart resilience", text: "On a device build, StayWake restores scheduled alarms after a reboot so an overnight restart won't cancel your wake-up." },
];

const STATUS_META: Record<PermStatus, { label: string; color: string; icon: keyof typeof Ionicons.glyphMap }> = {
  granted: { label: "Notifications ON", color: colors.success, icon: "checkmark-circle" },
  denied: { label: "Notifications BLOCKED", color: colors.urgent, icon: "close-circle" },
  undetermined: { label: "Notifications not set", color: colors.urgent, icon: "alert-circle" },
  unavailable: { label: "Preview mode", color: colors.textSecondary, icon: "information-circle" },
};

export default function Reliability() {
  const [status, setStatus] = useState<PermStatus>("unavailable");
  const [testMsg, setTestMsg] = useState<string | null>(null);

  const refresh = useCallback(() => {
    getNotificationPermissionStatus().then(setStatus);
  }, []);

  useEffect(() => {
    refresh();
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") refresh();
    });
    return () => sub.remove();
  }, [refresh]);

  const onEnable = async () => {
    if (status === "denied") {
      Linking.openSettings();
      return;
    }
    await ensureNotificationPermission();
    refresh();
  };

  const onTest = async () => {
    const ok = await scheduleTestAlarm(60);
    setTestMsg(
      ok
        ? "Test alarm set for 60 seconds from now. Lock your phone and wait."
        : "Couldn't schedule — enable notifications first (or you're in preview mode).",
    );
    refresh();
  };

  const meta = STATUS_META[status];
  const healthy = status === "granted";

  return (
    <SubScreen title="RELIABILITY">
      <View style={[styles.statusCard, { borderColor: meta.color }]}>
        <View style={styles.statusRow}>
          <Ionicons name={meta.icon} size={26} color={meta.color} />
          <Text style={[styles.statusLabel, { color: meta.color }]}>{meta.label}</Text>
        </View>
        <Text style={styles.statusText}>
          {healthy
            ? "Your alarms can break through. Run a test below to be 100% sure."
            : "StayWake can't ring reliably until notifications are allowed."}
        </Text>
        {!healthy && status !== "unavailable" && (
          <Button
            title={status === "denied" ? "Open Settings" : "Enable Notifications"}
            testID="reliability-enable"
            onPress={onEnable}
          />
        )}
      </View>

      <Pressable testID="reliability-test" onPress={onTest} style={styles.testCard}>
        <Ionicons name="play-circle" size={24} color={colors.primary} />
        <View style={styles.testTextWrap}>
          <Text style={styles.testTitle}>Send a test alarm (60s)</Text>
          <Text style={styles.testSub}>Lock your phone and confirm it actually wakes you.</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
      </Pressable>
      {testMsg && <Text style={styles.testMsg}>{testMsg}</Text>}

      <View style={styles.callout}>
        <Ionicons name="shield-checkmark" size={22} color={colors.primary} />
        <Text style={styles.calloutText}>
          We follow Android alarm best practices, but no app can promise 100% reliability. For critical mornings, keep a backup alarm.
        </Text>
      </View>

      {TIPS.map((t, i) => (
        <View key={i} style={styles.card}>
          <View style={styles.cardHead}>
            <Ionicons name={t.icon as keyof typeof Ionicons.glyphMap} size={20} color={colors.primary} />
            <Text style={styles.cardTitle}>{t.title}</Text>
          </View>
          <Text style={styles.cardText}>{t.text}</Text>
        </View>
      ))}

      {Platform.OS !== "web" && (
        <View style={styles.note}>
          <Text style={styles.noteText}>
            Native background ringing, full-screen lock-screen alarms, boot-restore, QR-scan and Step missions activate once you Publish and generate an Android build. They can&apos;t run in the Expo Go preview.
          </Text>
        </View>
      )}
    </SubScreen>
  );
}

const styles = StyleSheet.create({
  statusCard: { backgroundColor: colors.surface, borderWidth: 2, borderRadius: radius.card, padding: spacing.md, marginBottom: spacing.md, gap: spacing.sm },
  statusRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  statusLabel: { fontFamily: fonts.bodyExtra, fontSize: 15, letterSpacing: 1 },
  statusText: { fontFamily: fonts.body, fontSize: 14, color: colors.textSecondary, lineHeight: 21 },
  testCard: { flexDirection: "row", alignItems: "center", gap: spacing.md, backgroundColor: colors.surfaceHighlight, borderWidth: 1, borderColor: colors.primary, borderRadius: radius.card, padding: spacing.md, marginBottom: spacing.sm },
  testTextWrap: { flex: 1 },
  testTitle: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.textPrimary },
  testSub: { fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  testMsg: { fontFamily: fonts.body, fontSize: 13, color: colors.primary, marginBottom: spacing.md, lineHeight: 19 },
  callout: { flexDirection: "row", gap: spacing.md, backgroundColor: colors.surfaceHighlight, borderWidth: 1, borderColor: colors.primary, borderRadius: radius.card, padding: spacing.md, marginBottom: spacing.lg },
  calloutText: { flex: 1, fontFamily: fonts.body, fontSize: 14, color: colors.textPrimary, lineHeight: 21 },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.card, padding: spacing.md, marginBottom: spacing.sm },
  cardHead: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: 6 },
  cardTitle: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.textPrimary },
  cardText: { fontFamily: fonts.body, fontSize: 14, color: colors.textSecondary, lineHeight: 21 },
  note: { marginTop: spacing.md, padding: spacing.md, borderRadius: radius.card, borderWidth: 1, borderColor: colors.border, borderStyle: "dashed" },
  noteText: { fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary, lineHeight: 20 },
});
