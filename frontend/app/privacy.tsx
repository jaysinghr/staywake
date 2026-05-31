import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import SubScreen from "@/src/components/SubScreen";
import { colors, fonts, radius, spacing } from "@/src/theme";

const POINTS = [
  { icon: "phone-portrait", text: "Everything is local-first. Your alarms and wake history are stored on your device." },
  { icon: "cloud-offline", text: "No account or login required. We don't have a server holding your data." },
  { icon: "camera", text: "QR-scan missions run entirely on-device. Camera images are never uploaded or saved." },
  { icon: "location", text: "We do not collect your location, contacts, or microphone audio." },
  { icon: "analytics", text: "No third-party advertising or tracking SDKs in the MVP. If analytics is added later, it will be clearly disclosed." },
  { icon: "trash", text: "You can wipe all data anytime from Settings → Reset all data." },
];

export default function Privacy() {
  return (
    <SubScreen title="PRIVACY">
      <Text style={styles.lead}>StayWake is built privacy-first. Here&apos;s exactly how your data is handled.</Text>
      {POINTS.map((p, i) => (
        <View key={i} style={styles.row}>
          <View style={styles.iconWrap}>
            <Ionicons name={p.icon as keyof typeof Ionicons.glyphMap} size={20} color={colors.primary} />
          </View>
          <Text style={styles.text}>{p.text}</Text>
        </View>
      ))}
      <Text style={styles.footer}>Last updated: 2026</Text>
    </SubScreen>
  );
}

const styles = StyleSheet.create({
  lead: { fontFamily: fonts.body, fontSize: 16, color: colors.textPrimary, lineHeight: 24, marginBottom: spacing.lg },
  row: { flexDirection: "row", gap: spacing.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.card, padding: spacing.md, marginBottom: spacing.sm },
  iconWrap: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surfaceHighlight, alignItems: "center", justifyContent: "center" },
  text: { flex: 1, fontFamily: fonts.body, fontSize: 14, color: colors.textSecondary, lineHeight: 21 },
  footer: { fontFamily: fonts.body, fontSize: 12, color: colors.textSecondary, marginTop: spacing.lg, textAlign: "center" },
});
