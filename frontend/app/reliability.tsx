import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import SubScreen from "@/src/components/SubScreen";
import { colors, fonts, radius, spacing } from "@/src/theme";

const TIPS = [
  { icon: "battery-charging", title: "Disable battery optimisation", text: "Android may kill background apps to save power. Allow StayWake to run unrestricted in your phone's battery settings." },
  { icon: "alarm", title: "Allow exact alarms", text: "On Android 12+, grant the 'Alarms & reminders' permission so wake-ups fire at the precise second." },
  { icon: "notifications", title: "Keep notifications on", text: "StayWake uses a high-priority alarm notification channel to ring and show the full-screen alarm." },
  { icon: "moon", title: "Do Not Disturb", text: "DND can mute sound. Add StayWake as an allowed app, or rely on vibration + the full-screen alarm." },
  { icon: "refresh", title: "Restart resilience", text: "On a device build, StayWake restores scheduled alarms after a reboot so an overnight restart won't cancel your wake-up." },
];

export default function Reliability() {
  return (
    <SubScreen title="RELIABILITY">
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

      <View style={styles.note}>
        <Text style={styles.noteText}>
          Native background ringing, full-screen lock-screen alarms, boot-restore, QR-scan and Step missions activate once you Publish and generate an Android build. They can&apos;t run in the Expo Go preview.
        </Text>
      </View>
    </SubScreen>
  );
}

const styles = StyleSheet.create({
  callout: { flexDirection: "row", gap: spacing.md, backgroundColor: colors.surfaceHighlight, borderWidth: 1, borderColor: colors.primary, borderRadius: radius.card, padding: spacing.md, marginBottom: spacing.lg },
  calloutText: { flex: 1, fontFamily: fonts.body, fontSize: 14, color: colors.textPrimary, lineHeight: 21 },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.card, padding: spacing.md, marginBottom: spacing.sm },
  cardHead: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: 6 },
  cardTitle: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.textPrimary },
  cardText: { fontFamily: fonts.body, fontSize: 14, color: colors.textSecondary, lineHeight: 21 },
  note: { marginTop: spacing.md, padding: spacing.md, borderRadius: radius.card, borderWidth: 1, borderColor: colors.border, borderStyle: "dashed" },
  noteText: { fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary, lineHeight: 20 },
});
