import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import { useAppData } from "../context/AppDataContext";
import { getSaved } from "../utils/metas";
import { formatSoles } from "../utils/format";
import colors from "../constants/colors";

const EXPENSES = [
  { id: "1", icon: "home-outline", label: "Alquiler", amount: "S/ 650" },
  { id: "2", icon: "flash-outline", label: "Servicios (Luz, Internet)", amount: "S/ 280" },
  { id: "3", icon: "bus-outline", label: "Transporte público", amount: "S/ 150" },
];

export default function WalletScreen() {
  const { user } = useAuth();
  const { metas } = useAppData();
  const total = metas.reduce((sum, m) => sum + getSaved(m), 0);
  const owner = user ? user.username.toUpperCase() : "";

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.subtitle}>Mi saldo total</Text>
        <Text style={styles.balance}>{formatSoles(total)}</Text>

        <View style={styles.cardDark}>
          <View style={styles.cardDarkHeader}>
            <Ionicons name="people-outline" size={16} color={colors.white} />
            <Text style={styles.cardDarkTitle}>Ahorro</Text>
            <View style={styles.activeDot} />
            <Text style={styles.activeText}>Activa</Text>
          </View>
          <Text style={styles.cardNumber}>•••• •••• •••• 4827</Text>
          <Text style={styles.cardOwner}>{owner} · Tarjeta Dorada</Text>
        </View>

        <Text style={styles.sectionTitle}>Gastos fijos del mes</Text>
        <Text style={styles.sectionSubtitle}>S/ 2,180 / mes presupuestado</Text>
        {EXPENSES.map((item) => (
          <View key={item.id} style={styles.expenseRow}>
            <Ionicons name={item.icon} size={18} color={colors.textDark} style={styles.expenseIcon} />
            <Text style={styles.expenseLabel}>{item.label}</Text>
            <Text style={styles.expenseAmount}>{item.amount}</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.cream },
  scrollContent: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24 },
  subtitle: { fontSize: 13, color: colors.textGrey, marginBottom: 4 },
  balance: { fontSize: 28, fontWeight: "800", color: colors.textDark, marginBottom: 18 },
  cardDark: { backgroundColor: colors.darkBrown, borderRadius: 20, padding: 18, marginBottom: 22 },
  cardDarkHeader: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
  cardDarkTitle: { color: colors.white, fontSize: 14, fontWeight: "700", marginLeft: 8, flex: 1 },
  activeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.success, marginRight: 4 },
  activeText: { color: colors.success, fontSize: 12, fontWeight: "600" },
  cardNumber: { color: colors.white, fontSize: 16, letterSpacing: 2, marginBottom: 10 },
  cardOwner: { color: colors.goldLight, fontSize: 12 },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: colors.textDark, marginBottom: 2 },
  sectionSubtitle: { fontSize: 12, color: colors.textGrey, marginBottom: 12 },
  expenseRow: { flexDirection: "row", alignItems: "center", backgroundColor: colors.white, borderRadius: 14, padding: 12, marginBottom: 10 },
  expenseIcon: { marginRight: 10 },
  expenseLabel: { flex: 1, fontSize: 13, color: colors.textDark, fontWeight: "600" },
  expenseAmount: { fontSize: 13, color: colors.textDark, fontWeight: "700" },
});
