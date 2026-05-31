import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import SubScreen from "@/src/components/SubScreen";
import { colors, fonts, radius, spacing } from "@/src/theme";

const FAQS = [
  {
    q: "How is StayWake different from a normal alarm?",
    a: "A normal alarm stops the moment you tap it — which is exactly when half-asleep you crawls back to bed. StayWake makes you complete a proof mission to stop the alarm, then runs stay-awake check-ins afterwards. Your morning only counts when you actually stay up.",
  },
  {
    q: "What are stay-awake check-ins?",
    a: "After you dismiss the alarm, StayWake pings you again after a few minutes (Light, Standard or Strict mode). You confirm you're still awake with a quick mission. Miss a check-in and the alarm rings again.",
  },
  {
    q: "What is the Wake Score?",
    a: "A simple score out of 100 for each morning. You lose points for finishing the mission slowly, missing check-ins, and re-alarms. Aim for 90+ to hit 'Elite'.",
  },
  {
    q: "Will the alarm ring if the app is closed or phone is locked?",
    a: "On a real device build, StayWake schedules native alarms that ring even when the app is closed or the screen is locked. In the Expo Go preview, alarms run while the app is open — use TEST RUN to experience the full loop instantly.",
  },
  {
    q: "Do QR-scan and Step missions work now?",
    a: "They require a real device build (camera and step sensor). In the preview they gracefully fall back to a Math mission so nothing breaks.",
  },
  {
    q: "Can I trust it for an important wake-up?",
    a: "StayWake follows Android best practices, but no alarm app can guarantee 100% reliability due to battery optimisation and Do Not Disturb. See Reliability & permissions for setup tips, and keep a backup alarm for critical mornings.",
  },
];

function Item({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <Pressable onPress={() => setOpen((o) => !o)} style={styles.item}>
      <View style={styles.qRow}>
        <Text style={styles.q}>{q}</Text>
        <Ionicons name={open ? "chevron-up" : "chevron-down"} size={20} color={colors.primary} />
      </View>
      {open && <Text style={styles.a}>{a}</Text>}
    </Pressable>
  );
}

export default function Help() {
  return (
    <SubScreen title="HELP / FAQ">
      {FAQS.map((f, i) => (
        <Item key={i} q={f.q} a={f.a} />
      ))}
    </SubScreen>
  );
}

const styles = StyleSheet.create({
  item: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.card, padding: spacing.md, marginBottom: spacing.sm },
  qRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md },
  q: { flex: 1, fontFamily: fonts.bodyBold, fontSize: 15, color: colors.textPrimary },
  a: { fontFamily: fonts.body, fontSize: 14, color: colors.textSecondary, lineHeight: 21, marginTop: spacing.sm },
});
