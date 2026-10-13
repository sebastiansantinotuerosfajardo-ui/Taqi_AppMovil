import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { resetTo } from "../navigation/rootNavigation";
import colors from "../constants/colors";

const MENU_ITEMS = [
  { id: "1", icon: "home-outline", label: "Perfil de vivienda", badge: "Fija" },
  { id: "2", icon: "notifications-outline", label: "Notificaciones" },
  { id: "3", icon: "wallet-outline", label: "Métodos de ahorro preferidos" },
  { id: "4", icon: "lock-closed-outline", label: "Seguridad" },
];

export default function ProfileScreen({ userName = "Camila Rojas", userEmail = "" }) {
  const initials = userName
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.avatarBlock}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarInitials}>{initials}</Text>
          </View>
          <Text style={styles.name}>{userName}</Text>
          <Text style={styles.email}>{userEmail}</Text>
        </View>

        <View style={styles.menuCard}>
          {MENU_ITEMS.map((item, index) => (
            <View key={item.id} style={[styles.menuRow, index < MENU_ITEMS.length - 1 && styles.menuRowBorder]}>
              <Ionicons name={item.icon} size={18} color={colors.textDark} style={styles.menuIcon} />
              <Text style={styles.menuLabel}>{item.label}</Text>
              {item.badge && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{item.badge}</Text>
                </View>
              )}
              <Ionicons name="chevron-forward" size={16} color={colors.textGrey} />
            </View>
          ))}
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={() => resetTo("Login")}>
          <Ionicons name="log-out-outline" size={18} color={colors.coral} />
          <Text style={styles.logoutText}>Cerrar sesión</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.cream },
  scrollContent: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 24 },
  avatarBlock: { alignItems: "center", marginBottom: 24 },
  avatarCircle: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: colors.darkBrown,
    alignItems: "center", justifyContent: "center", marginBottom: 12,
  },
  avatarInitials: { color: colors.white, fontSize: 24, fontWeight: "800" },
  name: { fontSize: 18, fontWeight: "800", color: colors.textDark },
  email: { fontSize: 13, color: colors.textGrey },
  menuCard: { backgroundColor: colors.white, borderRadius: 18, marginBottom: 18 },
  menuRow: { flexDirection: "row", alignItems: "center", paddingVertical: 16, paddingHorizontal: 16 },
  menuRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  menuIcon: { marginRight: 12 },
  menuLabel: { flex: 1, fontSize: 14, color: colors.textDark, fontWeight: "600" },
  badge: { backgroundColor: colors.goldLight, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2, marginRight: 8 },
  badgeText: { fontSize: 10, fontWeight: "700", color: colors.textDark },
  logoutButton: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    backgroundColor: colors.coralLight, borderRadius: 16, height: 50,
  },
  logoutText: { color: colors.coral, fontWeight: "700", fontSize: 14, marginLeft: 8 },
});