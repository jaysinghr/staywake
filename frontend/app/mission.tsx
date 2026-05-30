import React, { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAlarm } from "@/src/store/AlarmContext";
import { colors, fonts, spacing } from "@/src/theme";
import MissionRunner from "@/src/components/MissionRunner";

export default function MissionScreen() {
  const { session, onDismissPassed, onCheckInPassed } = useAlarm();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!session) {
      router.replace("/");
    }
  }, [session, router]);

  if (!session) return null;

  const isCheckin = session.phase === "checkin-mission";
  const type = isCheckin ? "math" : session.dismissMission;
  const difficulty = isCheckin ? "easy" : session.difficulty;
  const accent = isCheckin ? colors.primary : colors.urgent;

  const handleSolved = () => {
    if (isCheckin) onCheckInPassed();
    else onDismissPassed();
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom }]}>
      <View style={styles.header}>
        <View style={[styles.tag, { borderColor: accent }]}>
          <Ionicons
            name={isCheckin ? "checkmark-done" : "lock-closed"}
            size={14}
            color={accent}
          />
          <Text style={[styles.tagText, { color: accent }]}>
            {isCheckin ? "STAY-AWAKE CHECK-IN" : "PROOF MISSION"}
          </Text>
        </View>
        <Text style={styles.title}>
          {isCheckin ? "PROVE YOU'RE STILL UP" : "PROVE YOU'RE AWAKE"}
        </Text>
        {isCheckin && (
          <Text style={styles.sub}>
            Check-in {session.checkInsPassed + 1} of {session.checkInTotal}
          </Text>
        )}
      </View>
      <MissionRunner type={type} difficulty={difficulty} accent={accent} onSolved={handleSolved} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: spacing.lg, alignItems: "center" },
  tag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
  },
  tagText: { fontFamily: fonts.bodyExtra, fontSize: 11, letterSpacing: 2 },
  title: {
    fontFamily: fonts.black,
    fontSize: 32,
    color: colors.textPrimary,
    marginTop: spacing.sm,
    textAlign: "center",
  },
  sub: { fontFamily: fonts.body, fontSize: 14, color: colors.textSecondary, marginTop: 2 },
});
