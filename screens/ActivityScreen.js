import React from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { useAppData } from "../context/AppDataContext";
import colors from "../constants/colors";

const ACTIVITIES = [
  {
    id: "redondeo",
    icon: "sync-outline",
    title: "Redondeo automático",
    desc: "Ahorra los céntimos vueltos de tus compras diarias.",
  },
  {
    id: "programado",
    icon: "calendar-outline",
    title: "Ahorro programado",
    desc: "Separa automáticamente S/ 20 cada quincena.",
  },
  {
    id: "salida",
    icon: "trending-up-outline",
    title: "Próxima salida",
    desc: "Guarda S/ 50 hoy para el fin de semana sin culpa.",
  },
  {
    id: "reto",
    icon: "flash-outline",
    title: "Reto de ahorro semanal",
    desc: "Empieza con S/ 5 y aumenta S/ 5 cada semana.",
  },
  {
    id: "almuerzo",
    icon: "cafe-outline",
    title: "Ahorro almuerzo de casa",
    desc: "Lleva almuerzo 2 veces por semana y ahorra S/ 30 semanales.",
  },
  {
    id: "suscripcion",
    icon: "shield-checkmark-outline",
    title: "Auditoría de suscripciones",
    desc: "Revisa servicios de streaming en desuso para recortar gastos.",
  },
];

export default function ActivityScreen() {
  const { activas, toggleActividad } = useAppData();

  const renderHeader = () => (
    <View style={styles.headerBlock}>
      <Text style={styles.subtitle}>
        Ideas para aprovechar tu dinero libre. Sin presión, solo sugerencias.
      </Text>
      <Text style={styles.title}>Actividades de Ahorro</Text>
    </View>
  );

  const renderActivityItem = ({ item }) => {
    const active = !!activas[item.id];
    return (
      <View style={styles.card}>
        <View style={styles.iconCircle}>
          <Ionicons name={item.icon} size={20} color={colors.darkBrown} />
        </View>
        <View style={styles.cardTextBlock}>
          <Text style={styles.cardTitle}>{item.title}</Text>
          <Text style={styles.cardDesc}>{item.desc}</Text>
        </View>
        <TouchableOpacity
          style={[styles.activateButton, active && styles.activateButtonOn]}
          onPress={() => toggleActividad(item.id)}
          activeOpacity={0.85}
        >
          <Text style={[styles.activateButtonText, active && styles.activateButtonTextOn]}>
            {active ? "Activa ✓" : "Activar"}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <StatusBar style="dark" />
      <FlatList
        data={ACTIVITIES}
        keyExtractor={(item) => item.id}
        renderItem={renderActivityItem}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.cream },
  scrollContent: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24 },
  headerBlock: { marginBottom: 18 },
  subtitle: { fontSize: 13, color: colors.textGrey, marginBottom: 6 },
  title: { fontSize: 22, fontWeight: "800", color: colors.textDark },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.goldLight,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  cardTextBlock: { flex: 1, paddingRight: 8 },
  cardTitle: { fontSize: 14, fontWeight: "700", color: colors.textDark, marginBottom: 3 },
  cardDesc: { fontSize: 12, color: colors.textGrey, lineHeight: 16 },
  activateButton: {
    backgroundColor: colors.darkBrown,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 34,
    justifyContent: "center",
  },
  activateButtonOn: { backgroundColor: colors.goldLight },
  activateButtonText: { color: colors.white, fontSize: 12, fontWeight: "700" },
  activateButtonTextOn: { color: colors.darkBrown },
});
