import React, { useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAlarm } from "@/src/store/AlarmContext";
import { colors, fonts, media, spacing } from "@/src/theme";
import { ensureNotificationPermission } from "@/src/lib/notifications";
import Button from "@/src/components/Button";
import TimePicker from "@/src/components/TimePicker";

interface Slide {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
  image?: string;
}

const SLIDES: Slide[] = [
  {
    icon: "bed",
    title: "OTHER ALARMS\nQUIT ON YOU",
    body: "You tap it half-asleep and crash back into bed. The alarm did its job and left. That's the trap.",
    image: media.emptyStateSleep,
  },
  {
    icon: "flash",
    title: "PROVE YOU'RE\nAWAKE",
    body: "No tap-to-dismiss. Solve a 10-second mission — math, memory, a shake — so your brain actually switches on.",
  },
  {
    icon: "shield-checkmark",
    title: "IT WON'T LET\nYOU CRASH",
    body: "Here's the part other alarms skip: minutes after you're up, StayWake checks in again. Miss it and it rings back. You don't just wake up — you stay up.",
  },
];

const DEFAULT_DAYS = [1, 2, 3, 4, 5];

export default function Onboarding() {
  const { addAlarm, updateAlarm, alarms, settings, completeOnboarding } = useAlarm();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const [index, setIndex] = useState(0);
  const [hour, setHour] = useState(7);
  const [minute, setMinute] = useState(0);
  const [saving, setSaving] = useState(false);

  const TOTAL = SLIDES.length + 1; // last step is "set your first alarm"
  const onSetup = index === SLIDES.length;

  const goNext = () => {
    const ni = index + 1;
    setIndex(ni);
    scrollRef.current?.scrollTo({ x: ni * width, animated: true });
  };

  const skip = async () => {
    await completeOnboarding();
    router.replace("/");
  };

  // Final step: ask for notification permission at the natural moment, then
  // leave the user with a real, enabled alarm instead of an empty screen.
  const setupAndFinish = async () => {
    if (saving) return;
    setSaving(true);
    await ensureNotificationPermission();
    const data = {
      label: "Wake Up",
      emoji: "⏰",
      hour,
      minute,
      enabled: true,
      repeatDays: DEFAULT_DAYS,
      missionType: settings.defaultMission,
      difficulty: "medium" as const,
      stayAwakeMode: settings.defaultMode,
      sound: settings.defaultSound,
    };
    const sample = alarms.find((a) => a.id === "sample-wakeup");
    if (alarms.length === 1 && sample) {
      await updateAlarm(sample.id, data);
    } else {
      await addAlarm(data);
    }
    await completeOnboarding();
    router.replace("/");
  };

  const onPrimary = () => {
    if (!onSetup) return goNext();
    setupAndFinish();
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom + spacing.lg }]}>
      <View style={styles.head}>
        <Text style={styles.brand}>STAYWAKE</Text>
        <Pressable testID="onboarding-skip" onPress={skip} hitSlop={10}>
          <Text style={styles.skip}>Skip</Text>
        </Pressable>
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEnabled={false}
        style={{ flex: 1 }}
      >
        {SLIDES.map((s, i) => (
          <View key={i} style={[styles.slide, { width }]}>
            {s.image ? (
              <Image source={{ uri: s.image }} style={styles.slideImg} contentFit="contain" />
            ) : (
              <View style={styles.iconCircle}>
                <Ionicons name={s.icon} size={64} color={colors.primary} />
              </View>
            )}
            <Text style={styles.slideTitle}>{s.title}</Text>
            <Text style={styles.slideBody}>{s.body}</Text>
          </View>
        ))}

        {/* Final step: set the first alarm */}
        <View style={[styles.slide, { width }]}>
          <Text style={styles.setupTitle}>SET YOUR{"\n"}FIRST WAKE-UP</Text>
          <Text style={styles.setupSub}>Pick a time — we&apos;ll handle the rest. Weekdays, easy mission, you can tweak it later.</Text>
          <View style={styles.pickerWrap}>
            <TimePicker hour={hour} minute={minute} onChange={(h, m) => { setHour(h); setMinute(m); }} />
          </View>
        </View>
      </ScrollView>

      <View style={styles.dots}>
        {Array.from({ length: TOTAL }, (_, i) => (
          <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
        ))}
      </View>

      <View style={styles.footer}>
        <Button
          title={onSetup ? (saving ? "Setting…" : "Set My Alarm") : "Next"}
          testID="onboarding-next"
          variant="primary"
          size="lg"
          onPress={onPrimary}
        />
        {onSetup && (
          <Text style={styles.permNote}>
            We&apos;ll ask for notification access so the alarm can actually fire.
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  head: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  brand: { fontFamily: fonts.black, fontSize: 22, color: colors.textPrimary, letterSpacing: -0.5 },
  skip: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.textSecondary },
  slide: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.xl },
  slideImg: { width: 200, height: 200, marginBottom: spacing.xl },
  iconCircle: { width: 140, height: 140, borderRadius: 70, borderWidth: 1, borderColor: colors.primary, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center", marginBottom: spacing.xl },
  slideTitle: { fontFamily: fonts.black, fontSize: 34, color: colors.textPrimary, textAlign: "center", letterSpacing: -0.5, lineHeight: 36 },
  slideBody: { fontFamily: fonts.body, fontSize: 16, color: colors.textSecondary, textAlign: "center", marginTop: spacing.md, lineHeight: 24 },
  setupTitle: { fontFamily: fonts.black, fontSize: 34, color: colors.textPrimary, textAlign: "center", letterSpacing: -0.5, lineHeight: 36 },
  setupSub: { fontFamily: fonts.body, fontSize: 15, color: colors.textSecondary, textAlign: "center", marginTop: spacing.md, lineHeight: 22 },
  pickerWrap: { marginTop: spacing.xl, alignItems: "center" },
  dots: { flexDirection: "row", justifyContent: "center", gap: 8, marginVertical: spacing.lg },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.border },
  dotActive: { backgroundColor: colors.primary, width: 24 },
  footer: { paddingHorizontal: spacing.lg },
  permNote: { fontFamily: fonts.body, fontSize: 12, color: colors.textSecondary, textAlign: "center", marginTop: spacing.sm },
});
