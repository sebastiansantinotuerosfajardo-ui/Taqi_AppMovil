import React, { useEffect } from "react";
import { View, Text, Image, StyleSheet } from "react-native";
import { StatusBar } from "expo-status-bar";
import colors from "../constants/colors";

// Pantalla de inicio
export default function SplashScreen({ onFinish }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      if (onFinish) onFinish();
    }, 1500);

    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <View style={styles.container}>
    <StatusBar style="light" />
      <Image
        source={require("../assets/app-icon-light.png")}
        style={styles.icon}
      />
      <Text style={styles.brand}>TAQI</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.darkBrown,
    alignItems: "center",
    justifyContent: "center",
  },
  icon: {
    width: 130,
    height: 130,
    borderRadius: 28,
    resizeMode: "contain",
    marginBottom: 16,
  },
  brand: {
    fontSize: 24,
    fontWeight: "800",
    color: colors.white,
    letterSpacing: 1,
  },
});