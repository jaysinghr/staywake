import React, { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAwareScrollView, KeyboardStickyView } from "react-native-keyboard-controller";

import { useAlarm } from "@/src/store/AlarmContext";
import { Difficulty, MissionType, StayAwakeMode } from "@/src/types";
import { colors, fonts, radius, spacing } from "@/src/theme";
import { DAY_LABELS } from "@/src/lib/time";
import { presetDays, presetOf, RepeatPreset } from "@/src/lib/repeat";
import { STAY_AWAKE_MODES } from "@/src/lib/staywake";
import { SOUNDS } from "@/src/lib/sounds";
import TimePicker from "@/src/components/TimePicker";
import Button from "@/src/components/Button";

const MISSIONS: { key: MissionType; label: string; icon: keyof typeof Ionicons.glyphMap; pro: boolean; build?: boolean }[] = [
  { key: "math", label: "Math", icon: "calculator", pro: false },
  { key: "memory", label: "Memory", icon: "grid", pro: false },
  { key: "shake", label: "Shake", icon: "phone-portrait", pro: false },
  { key: "order", label: "Order", icon: "reorder-four", pro: true },
  { key: "qr", label: "QR Scan", icon: "qr-code", pro: true, build: true },
  { key: "step", label: "Steps", icon: "walk", pro: true, build: true },
];
const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"];
const EMOJIS = ["⏰", "💪", "🏃", "☀️", "💼", "📚", "🧘", "🚀", "🔥", "🐓"];
const PRESETS: { key: RepeatPreset; label: string }[] = [
  { key: "once", label: "Once" },
  { key: "everyday", label: "Every day" },
  { key: "weekdays", label: "Weekdays" },
  { key: "weekends", label: "Weekends" },
];

function Pill({ active, locked, onPress, children, testID }: { active: boolean; locked?: boolean; onPress: () => void; children: React.ReactNode; testID?: string }) {
  return (
    <Pressable testID={testID} onPress={onPress} style={[styles.pill, active && styles.pillActive, locked && styles.pillLocked]}>
      {children}
    </Pressable>
  );
}

export default function SetAlarmScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { getAlarm, addAlarm, updateAlarm, deleteAlarm, settings, isPro } = useAlarm();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const existing = id ? getAlarm(id) : undefined;

  const [hour, setHour] = useState(existing?.hour ?? 7);
  const [minute, setMinute] = useState(existing?.minute ?? 0);
  const [label, setLabel] = useState(existing?.label ?? "Wake Up");
  const [emoji, setEmoji] = useState(existing?.emoji ?? EMOJIS[0]);
  const [repeatDays, setRepeatDays] = useState<number[]>(existing?.repeatDays ?? [1, 2, 3, 4, 5]);
  const [missionType, setMissionType] = useState<MissionType>(existing?.missionType ?? settings.defaultMission);
  const [difficulty, setDifficulty] = useState<Difficulty>(existing?.difficulty ?? "medium");
  const [mode, setMode] = useState<StayAwakeMode>(existing?.stayAwakeMode ?? settings.defaultMode);
  const [sound, setSound] = useState(existing?.sound ?? settings.defaultSound);

  const preset = presetOf(repeatDays);

  const toggleDay = (d: number) => {
    setRepeatDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort()));
  };

  const pickMission = (m: typeof MISSIONS[number]) => {
    if (m.pro && !isPro) {
      router.push("/paywall");
      return;
    }
    setMissionType(m.key);
  };

  const pickMode = (m: StayAwakeMode) => {
    if (STAY_AWAKE_MODES[m].pro && !isPro) {
      router.push("/paywall");
      return;
    }
    setMode(m);
  };

  const pickSound = (sid: string, pro: boolean) => {
    if (pro && !isPro) {
      router.push("/paywall");
      return;
    }
    setSound(sid);
  };

  const onSave = async () => {
    const data = {
      label: label.trim() || "Alarm",
      emoji,
      hour,
      minute,
      enabled: true,
      repeatDays,
      missionType,
      difficulty,
      stayAwakeMode: mode,
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

  const selectedMission = MISSIONS.find((m) => m.key === missionType);

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.sm }]}>
      <View style={styles.topBar}>
        <Pressable testID="close-set-alarm" onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="close" size={28} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.title}>{existing ? "EDIT ALARM" : "NEW ALARM"}</Text>
        <View style={{ width: 28 }} />
      </View>

      <View style={styles.pickerWrap}>
        <TimePicker hour={hour} minute={minute} onChange={(h, m) => { setHour(h); setMinute(m); }} />
      </View>

      <KeyboardAwareScrollView bottomOffset={90} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        <Text style={[styles.sectionLabel, { marginTop: 0 }]}>ICON</Text>
        <View style={styles.emojiRow}>
          {EMOJIS.map((e) => (
            <Pressable
              key={e}
              testID={`emoji-${e}`}
              onPress={() => setEmoji(e)}
              style={[styles.emojiBtn, emoji === e && styles.emojiBtnActive]}
            >
              <Text style={styles.emojiText}>{e}</Text>
            </Pressable>
          ))}
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
        <View style={styles.presetRow}>
          {PRESETS.map((p) => (
            <Pill key={p.key} testID={`preset-${p.key}`} active={preset === p.key} onPress={() => setRepeatDays(presetDays(p.key, repeatDays))}>
              <Text style={[styles.pillText, preset === p.key && styles.pillTextActive]}>{p.label}</Text>
            </Pill>
          ))}
        </View>
        <View style={styles.daysRow}>
          {DAY_LABELS.map((d, i) => (
            <Pressable key={i} testID={`day-${i}`} onPress={() => toggleDay(i)} style={[styles.dayBtn, repeatDays.includes(i) && styles.dayBtnActive]}>
              <Text style={[styles.dayText, repeatDays.includes(i) && styles.dayTextActive]}>{d}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.sectionLabel}>PROOF MISSION (TO STOP ALARM)</Text>
        <View style={styles.grid}>
          {MISSIONS.map((m) => {
            const locked = m.pro && !isPro;
            return (
              <Pill key={m.key} testID={`mission-${m.key}`} active={missionType === m.key} locked={locked} onPress={() => pickMission(m)}>
                <Ionicons name={m.icon} size={16} color={missionType === m.key ? colors.primary : colors.textSecondary} />
                <Text style={[styles.pillText, missionType === m.key && styles.pillTextActive]}>{m.label}</Text>
                {locked && <Ionicons name="lock-closed" size={11} color={colors.textSecondary} />}
              </Pill>
            );
          })}
        </View>
        {selectedMission?.build && (
          <Text style={styles.buildNote}>
            <Ionicons name="information-circle" size={12} color={colors.primary} /> {selectedMission.label} runs on a real device build. In preview it falls back to Math.
          </Text>
        )}

        <Text style={styles.sectionLabel}>MISSION TARGET</Text>
        <View style={styles.grid}>
          {DIFFICULTIES.map((d) => (
            <Pill key={d} testID={`difficulty-${d}`} active={difficulty === d} onPress={() => setDifficulty(d)}>
              <Text style={[styles.pillText, difficulty === d && styles.pillTextActive]}>{d.toUpperCase()}</Text>
            </Pill>
          ))}
        </View>

        <Text style={styles.sectionLabel}>STAY-AWAKE MODE</Text>
        <View style={styles.modeCol}>
          {(["light", "standard", "strict"] as StayAwakeMode[]).map((m) => {
            const cfg = STAY_AWAKE_MODES[m];
            const locked = cfg.pro && !isPro;
            const active = mode === m;
            return (
              <Pressable key={m} testID={`mode-${m}`} onPress={() => pickMode(m)} style={[styles.modeCard, active && styles.modeCardActive]}>
                <View style={styles.modeLeft}>
                  <Text style={[styles.modeLabel, active && { color: colors.primary }]}>{cfg.label}</Text>
                  <Text style={styles.modeDesc}>{cfg.desc}</Text>
                </View>
                <Ionicons name={active ? "radio-button-on" : "radio-button-off"} size={22} color={active ? colors.primary : colors.textSecondary} />
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.sectionLabel}>ALARM SOUND</Text>
        <View style={styles.grid}>
          {SOUNDS.map((s) => {
            const locked = s.pro && !isPro;
            return (
              <Pill key={s.id} testID={`sound-${s.id}`} active={sound === s.id} locked={locked} onPress={() => pickSound(s.id, s.pro)}>
                <Text style={[styles.pillText, sound === s.id && styles.pillTextActive]}>{s.label}</Text>
                {locked && <Ionicons name="lock-closed" size={11} color={colors.textSecondary} />}
              </Pill>
            );
          })}
        </View>

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
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.md },
  title: { fontFamily: fonts.extraBold, fontSize: 20, letterSpacing: 1, color: colors.textPrimary },
  pickerWrap: { alignItems: "center", marginBottom: spacing.md },
  sectionLabel: { fontFamily: fonts.bodyExtra, fontSize: 12, letterSpacing: 2, color: colors.textSecondary, marginTop: spacing.lg, marginBottom: spacing.sm },
  input: { backgroundColor: colors.background, borderWidth: 2, borderColor: colors.border, borderRadius: radius.input, color: colors.textPrimary, fontFamily: fonts.body, fontSize: 16, padding: spacing.md },
  emojiRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  emojiBtn: { width: 48, height: 48, borderRadius: radius.button, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" },
  emojiBtnActive: { borderColor: colors.primary, backgroundColor: colors.surfaceHighlight },
  emojiText: { fontSize: 24 },
  presetRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.md },
  daysRow: { flexDirection: "row", justifyContent: "space-between" },
  dayBtn: { width: 42, height: 42, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface },
  dayBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  dayText: { fontFamily: fonts.bold, fontSize: 16, color: colors.textSecondary },
  dayTextActive: { color: colors.black },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  pill: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: spacing.md, paddingVertical: 10, borderRadius: radius.button, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  pillActive: { borderColor: colors.primary, backgroundColor: colors.surfaceHighlight },
  pillLocked: { opacity: 0.7 },
  pillText: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.textSecondary },
  pillTextActive: { color: colors.primary },
  buildNote: { fontFamily: fonts.body, fontSize: 12, color: colors.textSecondary, marginTop: spacing.sm, lineHeight: 18 },
  modeCol: { gap: spacing.sm },
  modeCard: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.card, padding: spacing.md },
  modeCardActive: { borderColor: colors.primary, backgroundColor: colors.surfaceHighlight },
  modeLeft: { flex: 1 },
  modeLabel: { fontFamily: fonts.bold, fontSize: 18, color: colors.textPrimary },
  modeDesc: { fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  deleteBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: spacing.xl, paddingVertical: spacing.md },
  deleteText: { fontFamily: fonts.bodyExtra, fontSize: 14, letterSpacing: 1, color: colors.urgent },
  saveBar: { paddingTop: spacing.sm, backgroundColor: colors.background, borderTopWidth: 1, borderTopColor: colors.border },
});
