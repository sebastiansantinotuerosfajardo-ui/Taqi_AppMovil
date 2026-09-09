import React from "react";
import { View, StyleSheet } from "react-native";
import colors from "../constants/colors";

export default function ProgressBar({ percentage = 0, color = colors.gold }) {
  const clamped = Math.max(0, Math.min(100, percentage));
  return (
    <View style={styles.track}>
      <View style={[styles.fill, { width: `${clamped}%`, backgroundColor: color }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: "100%",
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: 4,
  },
});