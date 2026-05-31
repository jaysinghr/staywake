import React, { useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAlarm } from "@/src/store/AlarmContext";
import { colors, fonts, media, radius, spacing } from "@/src/theme";
import Button from "@/src/components/Button";

interface Slide {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
  image?: string;
}

const SLIDES: Slide[] = [
  {
    icon: "bed",
    title: "THE 6AM TRAP",
    body: "You hear the alarm, turn it off half-asleep… and wake up late. StayWake exists to break that loop.",
    image: media.emptyStateSleep,
  },
  {
    icon: "flash",
    title: "PROVE YOU'RE AWAKE",
    body: "Alarms don't stop with a tap. Solve a quick mission — math, typing or a shake — to actually switch your brain on.",
  },
  {
    icon: "shield-checkmark",
    title: "STAY-AWAKE CHECK-INS",
    body: "After the alarm, StayWake checks in on you. Miss one and it rings again. Your morning only counts when you stay up.",
  },
];

export default function Onboarding() {
  const { completeOnboarding } = useAlarm();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const [index, setIndex] = useState(0);

  const finish = async () => {
    await completeOnboarding();
    router.replace("/");
  };

  const next = () => {
    if (index < SLIDES.length - 1) {
      const ni = index + 1;
      setIndex(ni);
      scrollRef.current?.scrollTo({ x: ni * width, animated: true });
    } else {
      finish();
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom + spacing.lg }]}>
      <View style={styles.head}>
        <Text style={styles.brand}>STAYWAKE</Text>
        <Pressable testID="onboarding-skip" onPress={finish} hitSlop={10}>
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
      </ScrollView>

      <View style={styles.dots}>
        {SLIDES.map((_, i) => (
          <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
        ))}
      </View>

      <View style={styles.footer}>
        <Button
          title={index < SLIDES.length - 1 ? "Next" : "Get Started"}
          testID="onboarding-next"
          variant="primary"
          size="lg"
          onPress={next}
        />
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
  slideTitle: { fontFamily: fonts.black, fontSize: 34, color: colors.textPrimary, textAlign: "center", letterSpacing: -0.5 },
  slideBody: { fontFamily: fonts.body, fontSize: 16, color: colors.textSecondary, textAlign: "center", marginTop: spacing.md, lineHeight: 24 },
  dots: { flexDirection: "row", justifyContent: "center", gap: 8, marginVertical: spacing.lg },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.border },
  dotActive: { backgroundColor: colors.primary, width: 24 },
  footer: { paddingHorizontal: spacing.lg },
});
