import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  ViewStyle,
} from "react-native";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

import { colors, fonts, radius, spacing } from "@/src/theme";

type Variant = "primary" | "urgent" | "ghost" | "success";

interface Props {
  title: string;
  onPress?: () => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
  testID?: string;
  style?: ViewStyle;
  size?: "lg" | "md";
}

export default function Button({
  title,
  onPress,
  variant = "primary",
  disabled,
  loading,
  testID,
  style,
  size = "md",
}: Props) {
  const handlePress = () => {
    if (disabled || loading) return;
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    }
    onPress?.();
  };

  const bg: Record<Variant, string> = {
    primary: colors.primary,
    urgent: colors.urgent,
    success: colors.success,
    ghost: "transparent",
  };
  const fg: Record<Variant, string> = {
    primary: colors.black,
    urgent: colors.textPrimary,
    success: colors.black,
    ghost: colors.textPrimary,
  };

  return (
    <Pressable
      testID={testID}
      onPress={handlePress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        size === "lg" && styles.lg,
        { backgroundColor: bg[variant] },
        variant === "ghost" && styles.ghost,
        (disabled || loading) && styles.disabled,
        pressed && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg[variant]} />
      ) : (
        <Text
          style={[
            styles.text,
            size === "lg" && styles.textLg,
            { color: fg[variant] },
          ]}
        >
          {title}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.button,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  lg: {
    paddingVertical: spacing.lg,
  },
  ghost: {
    borderWidth: 1,
    borderColor: colors.border,
  },
  disabled: {
    opacity: 0.4,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  text: {
    fontFamily: fonts.extraBold,
    fontSize: 20,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  textLg: {
    fontSize: 26,
  },
});
