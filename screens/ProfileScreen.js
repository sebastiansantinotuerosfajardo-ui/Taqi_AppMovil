import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import { useAppData } from "../context/AppDataContext";
import { resetTo } from "../navigation/rootNavigation";
import colors from "../constants/colors";

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const { perfilVivienda, setPerfilVivienda } = useAppData();

  const username = user ? user.username : "Usuario";
  const email = user ? user.email : "";
  const initials = username.slice(0, 2).toUpperCase();

  const handleLogout = async () => {
    await logout();
    resetTo("Login");
  };

  const togglePerfilVivienda = () => {
    const nuevoPerfil = perfilVivienda === "fija" ? "variable" : "fija";
    setPerfilVivienda(nuevoPerfil);
  };

  const badgeText = perfilVivienda === "variable" ? "Variable" : "Fija";

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.avatarBlock}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarInitials}>{initials}</Text>
          </View>
          <Text style={styles.name}>{username}</Text>
          <Text style={styles.email}>{email}</Text>
        </View>

        <View style={styles.menuCard}>
          <TouchableOpacity
            style={[styles.menuRow, styles.menuRowBorder]}
            onPress={togglePerfilVivienda}
            activeOpacity={0.7}
          >
            <Ionicons name="home-outline" size={18} color={colors.textDark} style={styles.menuIcon} />
            <Text style={styles.menuLabel}>Perfil de vivienda</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{badgeText}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textGrey} />
          </TouchableOpacity>

          <View style={[styles.menuRow, styles.menuRowBorder]}>
            <Ionicons name="notifications-outline" size={18} color={colors.textDark} style={styles.menuIcon} />
            <Text style={styles.menuLabel}>Notificaciones</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textGrey} />
          </View>

          <View style={[styles.menuRow, styles.menuRowBorder]}>
            <Ionicons name="wallet-outline" size={18} color={colors.textDark} style={styles.menuIcon} />
            <Text style={styles.menuLabel}>Métodos de ahorro preferidos</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textGrey} />
          </View>

          <View style={styles.menuRow}>
            <Ionicons name="lock-closed-outline" size={18} color={colors.textDark} style={styles.menuIcon} />
            <Text style={styles.menuLabel}>Seguridad</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textGrey} />
          </View>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.85}>
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
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.darkBrown,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.coralLight,
    borderRadius: 16,
    height: 50,
  },
  logoutText: { color: colors.coral, fontWeight: "700", fontSize: 14, marginLeft: 8 },
});
