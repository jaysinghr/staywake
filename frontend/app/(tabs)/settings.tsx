import React from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAlarm } from "@/src/store/AlarmContext";
import { MissionType, StayAwakeMode } from "@/src/types";
import { colors, fonts, radius, spacing } from "@/src/theme";
import { STAY_AWAKE_MODES } from "@/src/lib/staywake";
import { SOUNDS } from "@/src/lib/sounds";

const MISSIONS: { id: MissionType; label: string }[] = [
  { id: "math", label: "Math" },
  { id: "shake", label: "Shake" },
];
const MODES: StayAwakeMode[] = ["light", "standard", "strict"];

function Pill({ active, locked, onPress, label, testID }: { active: boolean; locked?: boolean; onPress: () => void; label: string; testID?: string }) {
  return (
    <Pressable testID={testID} onPress={onPress} style={[styles.pill, active && styles.pillActive]}>
      {locked && <Ionicons name="lock-closed" size={11} color={colors.textSecondary} />}
      <Text style={[styles.pillText, active && styles.pillTextActive]}>{label}</Text>
    </Pressable>
  );
}

function LinkRow({ icon, label, onPress, testID }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void; testID?: string }) {
  return (
    <Pressable testID={testID} onPress={onPress} style={styles.linkRow}>
      <Ionicons name={icon} size={20} color={colors.primary} />
      <Text style={styles.linkText}>{label}</Text>
      <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
    </Pressable>
  );
}

export default function SettingsScreen() {
  const { settings, updateSettings, isPro, setPro, resetData } = useAlarm();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const onReset = () => {
    Alert.alert("Reset all data?", "This deletes all alarms and wake history. This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      { text: "Reset", style: "destructive", onPress: () => resetData() },
    ]);
  };

  const pickSound = (id: string, pro: boolean) => {
    if (pro && !isPro) {
      router.push("/paywall");
      return;
    }
    updateSettings({ defaultSound: id });
  };

  const pickMode = (m: StayAwakeMode) => {
    if (STAY_AWAKE_MODES[m].pro && !isPro) {
      router.push("/paywall");
      return;
    }
    updateSettings({ defaultMode: m });
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.md }]}>
      <Text style={styles.screenTitle}>SETTINGS</Text>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 110 }}>
        {/* Pro status */}
        <Pressable
          testID="settings-pro-card"
          onPress={() => (isPro ? null : router.push("/paywall"))}
          style={[styles.proCard, isPro && styles.proCardActive]}
        >
          <View style={styles.proIcon}>
            <Ionicons name="star" size={22} color={colors.black} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.proTitle}>{isPro ? "StayWake Pro Active" : "Upgrade to StayWake Pro"}</Text>
            <Text style={styles.proSub}>
              {isPro ? "All features unlocked. Thank you!" : "Unlimited alarms, Strict mode, QR & Step missions, analytics"}
            </Text>
          </View>
          {!isPro && <Ionicons name="chevron-forward" size={20} color={colors.black} />}
        </Pressable>

        <Text style={styles.sectionLabel}>DEFAULT MISSION</Text>
        <View style={styles.row}>
          {MISSIONS.map((m) => (
            <Pill key={m.id} testID={`set-mission-${m.id}`} active={settings.defaultMission === m.id} label={m.label} onPress={() => updateSettings({ defaultMission: m.id })} />
          ))}
        </View>

        <Text style={styles.sectionLabel}>DEFAULT STAY-AWAKE MODE</Text>
        <View style={styles.row}>
          {MODES.map((m) => (
            <Pill
              key={m}
              testID={`set-mode-${m}`}
              active={settings.defaultMode === m}
              locked={STAY_AWAKE_MODES[m].pro && !isPro}
              label={STAY_AWAKE_MODES[m].label}
              onPress={() => pickMode(m)}
            />
          ))}
        </View>

        <Text style={styles.sectionLabel}>DEFAULT ALARM SOUND</Text>
        <View style={styles.row}>
          {SOUNDS.map((s) => (
            <Pill
              key={s.id}
              testID={`set-sound-${s.id}`}
              active={settings.defaultSound === s.id}
              locked={s.pro && !isPro}
              label={s.label}
              onPress={() => pickSound(s.id, s.pro)}
            />
          ))}
        </View>

        <View style={styles.toggleRow}>
          <View style={styles.toggleLeft}>
            <Ionicons name="phone-portrait" size={20} color={colors.primary} />
            <Text style={styles.toggleText}>Haptic feedback</Text>
          </View>
          <Switch
            testID="settings-haptics"
            value={settings.hapticsEnabled}
            onValueChange={(v) => updateSettings({ hapticsEnabled: v })}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={colors.textPrimary}
          />
        </View>

        <Text style={styles.sectionLabel}>RELIABILITY & HELP</Text>
        <View style={styles.card}>
          <LinkRow testID="link-reliability" icon="shield-checkmark" label="Reliability & permissions" onPress={() => router.push("/reliability")} />
          <View style={styles.divider} />
          <LinkRow testID="link-help" icon="help-circle" label="Help / FAQ" onPress={() => router.push("/help")} />
          <View style={styles.divider} />
          <LinkRow testID="link-privacy" icon="lock-closed" label="Privacy" onPress={() => router.push("/privacy")} />
        </View>

        <Text style={styles.sectionLabel}>ACCOUNT</Text>
        <View style={styles.card}>
          <LinkRow testID="restore-purchases" icon="refresh" label="Restore purchases" onPress={() => Alert.alert("Restore", "Purchase restore connects after a native build is generated.")} />
          {isPro && (
            <>
              <View style={styles.divider} />
              <LinkRow testID="dev-disable-pro" icon="star-outline" label="Turn off Pro (demo)" onPress={() => setPro(false)} />
            </>
          )}
          <View style={styles.divider} />
          <Pressable testID="reset-data" onPress={onReset} style={styles.linkRow}>
            <Ionicons name="trash" size={20} color={colors.urgent} />
            <Text style={[styles.linkText, { color: colors.urgent }]}>Reset all data</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
          </Pressable>
        </View>

        <Text style={styles.footer}>StayWake · Wake up. Stay up. · v1.0</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: spacing.lg },
  screenTitle: { fontFamily: fonts.black, fontSize: 30, color: colors.textPrimary, marginBottom: spacing.md },
  proCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: radius.card,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  proCardActive: { backgroundColor: colors.surfaceHighlight, borderWidth: 1, borderColor: colors.success },
  proIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(0,0,0,0.15)", alignItems: "center", justifyContent: "center" },
  proTitle: { fontFamily: fonts.extraBold, fontSize: 18, color: colors.black },
  proSub: { fontFamily: fonts.body, fontSize: 13, color: "rgba(0,0,0,0.7)", marginTop: 2 },
  sectionLabel: { fontFamily: fonts.bodyExtra, fontSize: 12, letterSpacing: 2, color: colors.textSecondary, marginTop: spacing.lg, marginBottom: spacing.sm },
  row: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radius.button,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  pillActive: { borderColor: colors.primary, backgroundColor: colors.surfaceHighlight },
  pillText: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.textSecondary },
  pillTextActive: { color: colors.primary },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.card,
    padding: spacing.md,
    marginTop: spacing.lg,
  },
  toggleLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  toggleText: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.textPrimary },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.card, overflow: "hidden" },
  linkRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md },
  linkText: { flex: 1, fontFamily: fonts.bodyBold, fontSize: 15, color: colors.textPrimary },
  divider: { height: 1, backgroundColor: colors.border, marginLeft: 48 },
  footer: { fontFamily: fonts.body, fontSize: 12, color: colors.textSecondary, textAlign: "center", marginTop: spacing.xl },
});
