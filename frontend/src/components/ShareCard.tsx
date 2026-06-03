import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

import { colors, fonts, radius, spacing } from "@/src/theme";
import { scoreGrade } from "@/src/lib/staywake";

interface Props {
  score: number;
  streak: number;
  dateLabel: string;
}

// Branded card meant to be captured to an image and shared. Self-contained so
// it renders identically off-screen during capture.
export default function ShareCard({ score, streak, dateLabel }: Props) {
  const grade = scoreGrade(score).label;
  return (
    <LinearGradient
      colors={["#1a1206", colors.background, "#06121a"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.card}
    >
      <View style={styles.header}>
        <Text style={styles.brand}>STAYWAKE</Text>
        <Text style={styles.date}>{dateLabel}</Text>
      </View>

      <View style={styles.body}>
        <Text style={styles.label}>WAKE SCORE</Text>
        <Text style={styles.score}>{score}</Text>
        <Text style={styles.grade}>{grade.toUpperCase()}</Text>
      </View>

      <View style={styles.footer}>
        <View style={styles.streakPill}>
          <Ionicons name="flame" size={20} color={colors.urgent} />
          <Text style={styles.streakNum}>{streak}</Text>
          <Text style={styles.streakLabel}>DAY STREAK</Text>
        </View>
        <Text style={styles.tagline}>I woke up and stayed up.</Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 320,
    height: 400,
    borderRadius: radius.card,
    padding: spacing.lg,
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: colors.border,
  },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  brand: { fontFamily: fonts.black, fontSize: 22, color: colors.textPrimary, letterSpacing: -0.5 },
  date: { fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary },
  body: { alignItems: "center" },
  label: { fontFamily: fonts.bodyExtra, fontSize: 13, letterSpacing: 3, color: colors.textSecondary },
  score: { fontFamily: fonts.black, fontSize: 140, lineHeight: 150, color: colors.primary, letterSpacing: -4 },
  grade: { fontFamily: fonts.bold, fontSize: 22, letterSpacing: 4, color: colors.textPrimary },
  footer: { gap: spacing.md },
  streakPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    alignSelf: "flex-start",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
  },
  streakNum: { fontFamily: fonts.black, fontSize: 22, color: colors.textPrimary },
  streakLabel: { fontFamily: fonts.bodyExtra, fontSize: 12, letterSpacing: 1.5, color: colors.textSecondary },
  tagline: { fontFamily: fonts.bold, fontSize: 18, color: colors.textPrimary },
});
