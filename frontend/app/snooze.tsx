import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAlarm } from "@/src/store/AlarmContext";
import { colors, fonts, spacing } from "@/src/theme";
import Button from "@/src/components/Button";

function fmt(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function SnoozeScreen() {
  const { session, endSnoozeEarly } = useAlarm();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!session) router.replace("/");
  }, [session, router]);

  if (!session || session.phase !== "snoozed" || !session.snoozeUntil) return null;

  const remaining = session.snoozeUntil - now;

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.xl }]}>
      <View style={styles.center}>
        <Ionicons name="moon" size={48} color={colors.primary} />
        <Text style={styles.tag}>SNOOZING</Text>
        <Text style={styles.countdown} testID="snooze-countdown">{fmt(remaining)}</Text>
        <Text style={styles.sub}>
          You earned this one. The alarm comes back when it hits zero — and there&apos;s no snooze left.
        </Text>
      </View>
      <Button
        title="Wake Up Now"
        testID="snooze-wake-now"
        variant="urgent"
        size="lg"
        onPress={endSnoozeEarly}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: spacing.lg, justifyContent: "space-between" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  tag: { fontFamily: fonts.bodyExtra, fontSize: 12, letterSpacing: 3, color: colors.primary, marginTop: spacing.md },
  countdown: { fontFamily: fonts.black, fontSize: 88, color: colors.textPrimary, letterSpacing: -2, marginTop: spacing.sm },
  sub: { fontFamily: fonts.body, fontSize: 15, color: colors.textSecondary, textAlign: "center", marginTop: spacing.md, lineHeight: 22, paddingHorizontal: spacing.lg },
});
