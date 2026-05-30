import React, { useEffect, useRef } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { colors, fonts } from "@/src/theme";

const ITEM_HEIGHT = 56;
const VISIBLE = 5;
const PICKER_HEIGHT = ITEM_HEIGHT * VISIBLE;

interface ColumnProps {
  data: string[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  testID?: string;
  width: number;
}

function WheelColumn({ data, selectedIndex, onSelect, testID, width }: ColumnProps) {
  const ref = useRef<ScrollView>(null);
  const isMounted = useRef(false);

  useEffect(() => {
    const t = setTimeout(() => {
      ref.current?.scrollTo({ y: selectedIndex * ITEM_HEIGHT, animated: false });
      isMounted.current = true;
    }, 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <ScrollView
      ref={ref}
      testID={testID}
      showsVerticalScrollIndicator={false}
      snapToInterval={ITEM_HEIGHT}
      decelerationRate="fast"
      style={{ width, height: PICKER_HEIGHT }}
      contentContainerStyle={{ paddingVertical: ITEM_HEIGHT * 2 }}
      onMomentumScrollEnd={(e) => {
        const idx = Math.round(e.nativeEvent.contentOffset.y / ITEM_HEIGHT);
        const clamped = Math.max(0, Math.min(data.length - 1, idx));
        if (clamped !== selectedIndex) onSelect(clamped);
      }}
    >
      {data.map((label, i) => {
        const active = i === selectedIndex;
        return (
          <View key={`${label}-${i}`} style={styles.item}>
            <Text style={[styles.itemText, active ? styles.active : styles.inactive]}>
              {label}
            </Text>
          </View>
        );
      })}
    </ScrollView>
  );
}

interface Props {
  hour: number; // 0-23
  minute: number;
  onChange: (hour: number, minute: number) => void;
}

const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1));
const MINUTES = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, "0"));
const PERIODS = ["AM", "PM"];

export default function TimePicker({ hour, minute, onChange }: Props) {
  const period = hour >= 12 ? 1 : 0;
  let h12 = hour % 12;
  if (h12 === 0) h12 = 12;
  const hourIndex = h12 - 1;

  const emit = (hIdx: number, mIdx: number, pIdx: number) => {
    const h12v = hIdx + 1;
    let h24 = h12v % 12;
    if (pIdx === 1) h24 += 12;
    onChange(h24, mIdx);
  };

  return (
    <View style={styles.container}>
      <View style={styles.centerBand} pointerEvents="none" />
      <WheelColumn
        testID="time-picker-hour"
        width={70}
        data={HOURS}
        selectedIndex={hourIndex}
        onSelect={(i) => emit(i, minute, period)}
      />
      <Text style={styles.colon}>:</Text>
      <WheelColumn
        testID="time-picker-minute"
        width={70}
        data={MINUTES}
        selectedIndex={minute}
        onSelect={(i) => emit(hourIndex, i, period)}
      />
      <WheelColumn
        testID="time-picker-period"
        width={70}
        data={PERIODS}
        selectedIndex={period}
        onSelect={(i) => emit(hourIndex, minute, i)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: PICKER_HEIGHT,
  },
  centerBand: {
    position: "absolute",
    left: 0,
    right: 0,
    top: ITEM_HEIGHT * 2,
    height: ITEM_HEIGHT,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.surfaceHighlight,
  },
  item: {
    height: ITEM_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
  },
  itemText: {
    fontFamily: fonts.black,
    fontSize: 40,
  },
  active: {
    color: colors.textPrimary,
  },
  inactive: {
    color: colors.textSecondary,
    opacity: 0.4,
  },
  colon: {
    fontFamily: fonts.black,
    fontSize: 40,
    color: colors.textSecondary,
    marginHorizontal: 2,
  },
});
