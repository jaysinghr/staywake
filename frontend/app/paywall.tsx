import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAlarm } from "@/src/store/AlarmContext";
import { colors, fonts, radius, spacing } from "@/src/theme";
import Button from "@/src/components/Button";

const FEATURES = [
  "Unlimited alarms",
  "Strict stay-awake mode (3 check-ins)",
  "QR-scan & Step missions (device build)",
  "Full wake history + wake score analytics",
  "Challenges & goals",
  "Premium alarm sounds",
];

interface Plan {
  id: string;
  label: string;
  price: string;
  per: string;
  note?: string;
  best?: boolean;
}

const PLANS: Plan[] = [
  { id: "yearly", label: "Yearly", price: "₹999", per: "/year", note: "Save 44% · ₹83/mo", best: true },
  { id: "monthly", label: "Monthly", price: "₹149", per: "/month" },
  { id: "lifetime", label: "Lifetime", price: "₹1,999", per: "one-time" },
];

export default function Paywall() {
  const { setPro, isPro } = useAlarm();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [plan, setPlan] = useState("yearly");

  const purchase = async () => {
    // MOCKED purchase — RevenueCat wiring happens in the native build (Phase 2).
    await setPro(true);
    router.back();
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.sm }]}>
      <Pressable testID="paywall-close" onPress={() => router.back()} style={styles.close} hitSlop={10}>
        <Ionicons name="close" size={28} color={colors.textPrimary} />
      </Pressable>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 160 }}>
        <View style={styles.hero}>
          <View style={styles.proBadge}>
            <Ionicons name="star" size={16} color={colors.black} />
            <Text style={styles.proBadgeText}>PRO</Text>
          </View>
          <Text style={styles.title}>WAKE UP LIKE{"\n"}YOU MEAN IT</Text>
          <Text style={styles.sub}>Unlock everything StayWake has to keep you out of bed.</Text>
        </View>

        <View style={styles.features}>
          {FEATURES.map((f) => (
            <View key={f} style={styles.featureRow}>
              <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
              <Text style={styles.featureText}>{f}</Text>
            </View>
          ))}
        </View>

        {isPro ? (
          <View style={styles.activeCard}>
            <Ionicons name="checkmark-circle" size={22} color={colors.success} />
            <Text style={styles.activeText}>Pro is active. You&apos;re all set!</Text>
          </View>
        ) : (
          <View style={styles.plans}>
            {PLANS.map((p) => {
              const active = plan === p.id;
              return (
                <Pressable key={p.id} testID={`plan-${p.id}`} onPress={() => setPlan(p.id)} style={[styles.plan, active && styles.planActive]}>
                  {p.best && (
                    <View style={styles.bestTag}>
                      <Text style={styles.bestTagText}>BEST VALUE</Text>
                    </View>
                  )}
                  <View style={styles.planLeft}>
                    <Ionicons name={active ? "radio-button-on" : "radio-button-off"} size={22} color={active ? colors.primary : colors.textSecondary} />
                    <Text style={styles.planLabel}>{p.label}</Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={styles.planPrice}>{p.price}<Text style={styles.planPer}> {p.per}</Text></Text>
                    {p.note && <Text style={styles.planNote}>{p.note}</Text>}
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>

      {!isPro && (
        <View style={[styles.footer, { paddingBottom: insets.bottom || spacing.md }]}>
          <Button title="Continue" testID="paywall-continue" variant="primary" size="lg" onPress={purchase} />
          <Text style={styles.demoNote}>Demo: unlocks instantly. Real billing connects in the native build.</Text>
          <Pressable testID="paywall-later" onPress={() => router.back()}>
            <Text style={styles.later}>Maybe later</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: spacing.lg },
  close: { alignSelf: "flex-end", padding: 4 },
  hero: { alignItems: "center", marginTop: spacing.sm },
  proBadge: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: colors.primary, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: 5 },
  proBadgeText: { fontFamily: fonts.extraBold, fontSize: 13, letterSpacing: 1, color: colors.black },
  title: { fontFamily: fonts.black, fontSize: 38, color: colors.textPrimary, textAlign: "center", marginTop: spacing.md, letterSpacing: -1, lineHeight: 38 },
  sub: { fontFamily: fonts.body, fontSize: 15, color: colors.textSecondary, textAlign: "center", marginTop: spacing.sm },
  features: { marginTop: spacing.xl, gap: spacing.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.card, padding: spacing.lg },
  featureRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  featureText: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.textPrimary, flex: 1 },
  plans: { marginTop: spacing.xl, gap: spacing.sm },
  plan: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.card, padding: spacing.md },
  planActive: { borderColor: colors.primary, backgroundColor: colors.surfaceHighlight },
  bestTag: { position: "absolute", top: -10, left: spacing.md, backgroundColor: colors.primary, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2 },
  bestTagText: { fontFamily: fonts.bodyExtra, fontSize: 9, letterSpacing: 1, color: colors.black },
  planLeft: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  planLabel: { fontFamily: fonts.bold, fontSize: 18, color: colors.textPrimary },
  planPrice: { fontFamily: fonts.black, fontSize: 20, color: colors.textPrimary },
  planPer: { fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary },
  planNote: { fontFamily: fonts.body, fontSize: 12, color: colors.primary, marginTop: 2 },
  activeCard: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginTop: spacing.xl, backgroundColor: colors.surfaceHighlight, borderWidth: 1, borderColor: colors.success, borderRadius: radius.card, padding: spacing.lg },
  activeText: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.textPrimary },
  footer: { position: "absolute", left: spacing.lg, right: spacing.lg, bottom: 0, gap: spacing.sm, backgroundColor: colors.background, paddingTop: spacing.sm },
  demoNote: { fontFamily: fonts.body, fontSize: 11, color: colors.textSecondary, textAlign: "center" },
  later: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.textSecondary, textAlign: "center", paddingVertical: 6 },
});
