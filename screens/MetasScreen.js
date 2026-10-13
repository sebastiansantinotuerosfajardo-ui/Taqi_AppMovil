import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import ProgressBar from "../components/ProgressBar";
import colors from "../constants/colors";

const GOALS = [
  { id: "1", icon: "airplane-outline", title: "Viaje a Cusco", saved: 850, target: 1500, percentage: 57, remaining: "~4 meses restantes" },
  { id: "2", icon: "laptop-outline", title: "Laptop nueva", saved: 1050, target: 3500, percentage: 30, remaining: "~8 meses restantes" },
  { id: "3", icon: "shield-checkmark-outline", title: "Fondo de emergencia", saved: 1200, target: 3000, percentage: 40, remaining: "~6 meses restantes" },
];

export default function MetasScreen() {
  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <View style={styles.flex1}>
            <Text style={styles.subtitle}>Tus sueños estructurados en pequeños pasos</Text>
            <Text style={styles.title}>Mis metas</Text>
          </View>
          <TouchableOpacity style={styles.newGoalButton}>
            <Text style={styles.newGoalButtonText}>+ Nueva meta</Text>
          </TouchableOpacity>
        </View>

        {GOALS.map((goal) => (
          <View key={goal.id} style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <View style={styles.titleRow}>
                <Ionicons name={goal.icon} size={18} color={colors.darkBrown} style={styles.titleIcon} />
                <Text style={styles.cardTitle}>{goal.title}</Text>
              </View>
              <Text style={styles.percentage}>{goal.percentage}%</Text>
            </View>
            <Text style={styles.cardSubtitle}>S/ {goal.saved} / S/ {goal.target}</Text>
            <ProgressBar percentage={goal.percentage} />
            <View style={styles.footerRow}>
              <Text style={styles.footerText}>{goal.remaining}</Text>
              <Text style={styles.footerTextRight}>En camino</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.cream },
  scrollContent: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 },
  flex1: { flex: 1, paddingRight: 12 },
  subtitle: { fontSize: 13, color: colors.textGrey, marginBottom: 4 },
  title: { fontSize: 22, fontWeight: "800", color: colors.textDark },
  newGoalButton: {
    backgroundColor: colors.gold,
    borderRadius: 20,
    paddingHorizontal: 14,
    height: 36,
    justifyContent: "center",
  },
  newGoalButtonText: { color: colors.white, fontSize: 12, fontWeight: "700" },
  card: { backgroundColor: colors.white, borderRadius: 18, padding: 16, marginBottom: 14 },
  cardHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  titleRow: { flexDirection: "row", alignItems: "center", flex: 1 },
  titleIcon: { marginRight: 8 },
  cardTitle: { fontSize: 15, fontWeight: "700", color: colors.textDark },
  percentage: { fontSize: 15, fontWeight: "800", color: colors.gold },
  cardSubtitle: { fontSize: 12, color: colors.textGrey, marginBottom: 10 },
  footerRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 10 },
  footerText: { fontSize: 12, color: colors.textGrey },
  footerTextRight: { fontSize: 12, color: colors.success, fontWeight: "600" },
});