import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import BottomTabBar from "../components/BottomTabBar";
import colors from "../constants/colors";

const ACTIVITIES = [
  { id: "1", icon: "sync-outline", title: "Redondeo automático", desc: "Ahorra los céntimos vueltos de tus compras diarias." },
  { id: "2", icon: "calendar-outline", title: "Ahorro programado", desc: "Separa automáticamente S/ 20 cada quincena." },
  { id: "3", icon: "trending-up-outline", title: "Próxima salida", desc: "Guarda S/ 50 hoy para el fin de semana sin culpa." },
  { id: "4", icon: "flash-outline", title: "Reto de ahorro semanal", desc: "Empieza con S/ 5 y aumenta S/ 5 cada semana." },
];

export default function ActivityScreen({ activeTab, onTabPress }) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.subtitle}>Ideas para aprovechar tu dinero libre. Sin presión, solo sugerencias.</Text>
        <Text style={styles.title}>Actividades</Text>

        {ACTIVITIES.map((item) => (
          <View key={item.id} style={styles.card}>
            <View style={styles.iconCircle}>
              <Ionicons name={item.icon} size={18} color={colors.darkBrown} />
            </View>
            <View style={styles.cardTextBlock}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardDesc}>{item.desc}</Text>
            </View>
            <TouchableOpacity style={styles.activateButton}>
              <Text style={styles.activateButtonText}>Activar</Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
      <BottomTabBar activeTab={activeTab} onTabPress={onTabPress} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.cream },
  scrollContent: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24 },
  subtitle: { fontSize: 13, color: colors.textGrey, marginBottom: 6 },
  title: { fontSize: 22, fontWeight: "800", color: colors.textDark, marginBottom: 18 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.goldLight,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  cardTextBlock: { flex: 1, paddingRight: 8 },
  cardTitle: { fontSize: 14, fontWeight: "700", color: colors.textDark, marginBottom: 2 },
  cardDesc: { fontSize: 12, color: colors.textGrey },
  activateButton: {
    backgroundColor: colors.darkBrown,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 32,
    justifyContent: "center",
  },
  activateButtonText: { color: colors.white, fontSize: 12, fontWeight: "700" },
});