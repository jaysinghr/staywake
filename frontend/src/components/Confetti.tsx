import React, { useEffect, useMemo } from "react";
import { Dimensions, StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";

import { colors } from "@/src/theme";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");
const PALETTE = [colors.primary, colors.success, colors.urgent, "#FFD166", "#5BC0EB", "#FFFFFF"];

interface PieceProps {
  index: number;
  count: number;
}

function Piece({ index, count }: PieceProps) {
  const cfg = useMemo(() => {
    const startX = Math.random() * SCREEN_W;
    return {
      startX,
      drift: (Math.random() - 0.5) * 120,
      size: 7 + Math.random() * 8,
      color: PALETTE[index % PALETTE.length],
      delay: Math.random() * 600,
      duration: 2200 + Math.random() * 1600,
      rotateTo: (Math.random() > 0.5 ? 1 : -1) * (360 + Math.random() * 720),
      round: Math.random() > 0.5,
    };
  }, [index]);

  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      cfg.delay,
      withTiming(1, { duration: cfg.duration, easing: Easing.out(Easing.quad) }),
    );
  }, [progress, cfg.delay, cfg.duration]);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateY: -40 + progress.value * (SCREEN_H + 80) },
      { translateX: progress.value * cfg.drift },
      { rotate: `${progress.value * cfg.rotateTo}deg` },
    ],
    opacity: progress.value < 0.85 ? 1 : 1 - (progress.value - 0.85) / 0.15,
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: "absolute",
          left: cfg.startX,
          top: 0,
          width: cfg.size,
          height: cfg.round ? cfg.size : cfg.size * 0.5,
          borderRadius: cfg.round ? cfg.size : 2,
          backgroundColor: cfg.color,
        },
        style,
      ]}
    />
  );
}

export default function Confetti({ count = 80 }: { count?: number }) {
  const pieces = useMemo(() => Array.from({ length: count }, (_, i) => i), [count]);
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {pieces.map((i) => (
        <Piece key={i} index={i} count={count} />
      ))}
    </View>
  );
}
