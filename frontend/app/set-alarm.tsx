import React, { useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  KeyboardAwareScrollView,
  KeyboardStickyView,
} from "react-native-keyboard-controller";

import { useAlarm } from "@/src/store/AlarmContext";
import { Difficulty, MissionType } from "@/src/types";
import { colors, fonts, radius, spacing } from "@/src/theme";
import { DAY_LABELS } from "@/src/lib/time";
import TimePicker from "@/src/components/TimePicker";
import Button from "@/src/components/Button";

const MISSIONS: { key: MissionType; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: "math", label: "Math", icon: "calculator" },
  { key: "typing", label: "Type", icon: "create" },
  { key: "shake", label: "Shake", icon: "phone-portrait" },
  { key: "random", label: "Random", icon: "shuffle" },
];
const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"];
const COUNTS = [1, 2, 3, 4];
const INTERVALS = [1, 3, 5, 10, 15];

function Pill({
  active,
  onPress,
  children,
  testID,
}: {
  active: boolean;
  onPress: () => void;
  children: React.ReactNode;
  testID?: string;
}) {
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      style={[styles.pill, active && styles.pillActive]}
    >
      {children}
    </Pressable>
  );
}

export default function SetAlarmScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { getAlarm, addAlarm, updateAlarm, deleteAlarm } = useAlarm();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const existing = id ? getAlarm(id) : undefined;

  const [hour, setHour] = useState(existing?.hour ?? 7);
  const [minute, setMinute] = useState(existing?.minute ?? 0);
  const [label, setLabel] = useState(existing?.label ?? "Wake Up");
  const [repeatDays, setRepeatDays] = useState<number[]>(existing?.repeatDays ?? [1, 2, 3, 4, 5]);
  const [missionType, setMissionType] = useState<MissionType>(existing?.missionType ?? "math");
  const [difficulty, setDifficulty] = useState<Difficulty>(existing?.difficulty ?? "medium");
  const [checkInCount, setCheckInCount] = useState(existing?.checkInCount ?? 2);
  const [interval, setIntervalVal] = useState(existing?.checkInIntervalMin ?? 5);
  const [sound, setSound] = useState(existing?.sound ?? true);

  const toggleDay = (d: number) => {
    setRepeatDays((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort(),
    );
  };

  const onSave = async () => {
    const data = {
      label: label.trim() || "Alarm",
      hour,
      minute,
      enabled: true,
      repeatDays,
      missionType,
      difficulty,
      checkInCount,
      checkInIntervalMin: interval,
      sound,
    };
    if (existing) await updateAlarm(existing.id, data);
    else await addAlarm(data);
    router.back();
  };

  const onDelete = async () => {
    if (existing) await deleteAlarm(existing.id);
    router.back();
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.sm }]}>
      <View style={styles.topBar}>
        <Pressable testID="close-set-alarm" onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="close" size={28} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.title}>{existing ? "EDIT ALARM" : "NEW ALARM"}</Text>
        <View style={{ width: 28 }} />
      </View>

      <KeyboardAwareScrollView
        bottomOffset={90}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        <View style={styles.pickerWrap}>
          <TimePicker hour={hour} minute={minute} onChange={(h, m) => { setHour(h); setMinute(m); }} />
        </View>

        <Text style={styles.sectionLabel}>LABEL</Text>
        <TextInput
          testID="alarm-label-input"
          value={label}
          onChangeText={setLabel}
          placeholder="Wake Up"
          placeholderTextColor={colors.textSecondary}
          style={styles.input}
        />

        <Text style={styles.sectionLabel}>REPEAT</Text>
        <View style={styles.daysRow}>
          {DAY_LABELS.map((d, i) => (
            <Pressable
              key={i}
              testID={`day-${i}`}
              onPress={() => toggleDay(i)}
              style={[styles.dayBtn, repeatDays.includes(i) && styles.dayBtnActive]}
            >
              <Text style={[styles.dayText, repeatDays.includes(i) && styles.dayTextActive]}>
                {d}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.sectionLabel}>PROOF MISSION (TO STOP ALARM)</Text>
        <View style={styles.grid}>
          {MISSIONS.map((m) => (
            <Pill
              key={m.key}
              testID={`mission-${m.key}`}
              active={missionType === m.key}
              onPress={() => setMissionType(m.key)}
            >
              <Ionicons
                name={m.icon}
                size={16}
                color={missionType === m.key ? colors.primary : colors.textSecondary}
              />
              <Text style={[styles.pillText, missionType === m.key && styles.pillTextActive]}>
                {m.label}
              </Text>
            </Pill>
          ))}
        </View>

        <Text style={styles.sectionLabel}>DIFFICULTY</Text>
        <View style={styles.grid}>
          {DIFFICULTIES.map((d) => (
            <Pill
              key={d}
              testID={`difficulty-${d}`}
              active={difficulty === d}
              onPress={() => setDifficulty(d)}
            >
              <Text style={[styles.pillText, difficulty === d && styles.pillTextActive]}>
                {d.toUpperCase()}
              </Text>
            </Pill>
          ))}
        </View>

        <Text style={styles.sectionLabel}>STAY-AWAKE CHECK-INS</Text>
        <View style={styles.grid}>
          {COUNTS.map((c) => (
            <Pill
              key={c}
              testID={`checkin-count-${c}`}
              active={checkInCount === c}
              onPress={() => setCheckInCount(c)}
            >
              <Text style={[styles.pillText, checkInCount === c && styles.pillTextActive]}>
                {c}×
              </Text>
            </Pill>
          ))}
        </View>

        <Text style={styles.sectionLabel}>CHECK-IN INTERVAL</Text>
        <View style={styles.grid}>
          {INTERVALS.map((iv) => (
            <Pill
              key={iv}
              testID={`interval-${iv}`}
              active={interval === iv}
              onPress={() => setIntervalVal(iv)}
            >
              <Text style={[styles.pillText, interval === iv && styles.pillTextActive]}>
                {iv} min
              </Text>
            </Pill>
          ))}
        </View>

        <Pressable
          testID="sound-toggle"
          onPress={() => setSound((s) => !s)}
          style={styles.soundRow}
        >
          <View style={styles.soundLeft}>
            <Ionicons
              name={sound ? "volume-high" : "volume-mute"}
              size={20}
              color={sound ? colors.primary : colors.textSecondary}
            />
            <Text style={styles.soundText}>Alarm sound</Text>
          </View>
          <View style={[styles.checkbox, sound && styles.checkboxOn]}>
            {sound && <Ionicons name="checkmark" size={16} color={colors.black} />}
          </View>
        </Pressable>

        {existing && (
          <Pressable testID="delete-alarm" onPress={onDelete} style={styles.deleteBtn}>
            <Ionicons name="trash-outline" size={18} color={colors.urgent} />
            <Text style={styles.deleteText}>DELETE ALARM</Text>
          </Pressable>
        )}
      </KeyboardAwareScrollView>

      <KeyboardStickyView offset={{ closed: 0, opened: 0 }}>
        <View style={[styles.saveBar, { paddingBottom: insets.bottom || spacing.md }]}>
          <Button title="Save Alarm" testID="save-alarm" onPress={onSave} />
        </View>
      </KeyboardStickyView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: spacing.lg },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  title: { fontFamily: fonts.extraBold, fontSize: 20, letterSpacing: 1, color: colors.textPrimary },
  pickerWrap: { alignItems: "center", marginBottom: spacing.md },
  sectionLabel: {
    fontFamily: fonts.bodyExtra,
    fontSize: 12,
    letterSpacing: 2,
    color: colors.textSecondary,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.background,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius.input,
    color: colors.textPrimary,
    fontFamily: fonts.body,
    fontSize: 16,
    padding: spacing.md,
  },
  daysRow: { flexDirection: "row", justifyContent: "space-between" },
  dayBtn: {
    width: 42,
    height: 42,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
  },
  dayBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  dayText: { fontFamily: fonts.bold, fontSize: 16, color: colors.textSecondary },
  dayTextActive: { color: colors.black },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
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
  soundRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.card,
    padding: spacing.md,
  },
  soundLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  soundText: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.textPrimary },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: spacing.xl,
    paddingVertical: spacing.md,
  },
  deleteText: { fontFamily: fonts.bodyExtra, fontSize: 14, letterSpacing: 1, color: colors.urgent },
  saveBar: {
    paddingTop: spacing.sm,
    paddingHorizontal: 0,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
