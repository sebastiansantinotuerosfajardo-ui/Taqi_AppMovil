import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import colors from "../constants/colors";

const TABS = [
  { key: "actividad", label: "Actividad", icon: "pulse-outline" },
  { key: "metas", label: "Metas", icon: "locate-outline" },
  { key: "principal", label: "Principal", icon: "home-outline" },
  { key: "bolsa", label: "Mi bolsa", icon: "wallet-outline" },
  { key: "perfil", label: "Perfil", icon: "person-outline" },
];

export default function BottomTabBar({ activeTab = "principal", onTabPress }) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 12) + 6 }]}>
      {TABS.map((tab) => {
        const isActive = tab.key === activeTab;
        return (
          <TouchableOpacity
            key={tab.key}
            style={styles.tab}
            onPress={() => onTabPress && onTabPress(tab.key)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={isActive ? tab.icon.replace("-outline", "") : tab.icon}
              size={22}
              color={isActive ? colors.textDark : colors.textGrey}
            />
            <Text style={[styles.label, isActive && styles.labelActive]}>{tab.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 10,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: 11,
    color: colors.textGrey,
    marginTop: 4,
    fontWeight: "500",
  },
  labelActive: {
    color: colors.textDark,
    fontWeight: "700",
  },
});