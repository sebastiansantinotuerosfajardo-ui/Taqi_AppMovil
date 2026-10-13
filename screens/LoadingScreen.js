import React, { useEffect, useState } from "react";
import { View, Text, Image, StyleSheet } from "react-native";
import { StatusBar } from "expo-status-bar";
import colors from "../constants/colors";

const FRAMES = [
  { source: require("../assets/bear-frame-25.png"), percentage: "25%" },
  { source: require("../assets/bear-frame-50.png"), percentage: "50%" },
  { source: require("../assets/bear-frame-75.png"), percentage: "75%" },
  { source: require("../assets/bear-frame-100.png"), percentage: "100%" },
];

// Pantallas de carga. 4 frames (25%, 50%. 75% y 100%)
export default function LoadingScreen({ onFinish }) {
  const [frameIndex, setFrameIndex] = useState(0);

  useEffect(() => {
    if (frameIndex >= FRAMES.length - 1) {
      const finishTimer = setTimeout(() => {
        if (onFinish) onFinish();
      }, 500);
      return () => clearTimeout(finishTimer);
    }
    const timer = setTimeout(() => {
      setFrameIndex((prev) => prev + 1);
    }, 500);
    return () => clearTimeout(timer);
  }, [frameIndex, onFinish]);

  const current = FRAMES[frameIndex];

  return (
    <View style={styles.container}>
    <StatusBar style="dark" />
      <Image source={current.source} style={styles.bear} />
      <Text style={styles.percentage}>{current.percentage}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.cream,
    alignItems: "center",
    justifyContent: "center",
  },
  bear: {
    width: 180,
    height: 130,
    resizeMode: "contain",
    marginBottom: 20,
  },
  percentage: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.textDark,
  },
});