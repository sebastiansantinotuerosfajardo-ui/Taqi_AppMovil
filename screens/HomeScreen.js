import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import ProgressBar from "../components/ProgressBar";
import BottomTabBar from "../components/BottomTabBar";
import colors from "../constants/colors";

export default function HomeScreen({ userName = "Camila" }) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Encabezado */}
        <View style={styles.header}>
          <View style={styles.headerTextBlock}>
            <Text style={styles.greeting}>Hola, {userName} 👋</Text>
            <Text style={styles.headerTitle}>Esto es lo que te conviene ver hoy</Text>
          </View>
          <View style={styles.avatar} />
        </View>

        {/* Tarjeta de consejo financiero */}
        <View style={styles.adviceCard}>
          <View style={styles.advicePill}>
            <Text style={styles.advicePillText}>CONSEJO FINANCIERO</Text>
          </View>
          <View style={styles.adviceRow}>
            <View style={styles.adviceIconCircle}>
              <Ionicons name="cash-outline" size={18} color={colors.white} />
            </View>
            <Text style={styles.adviceText}>
              Te quedan S/ 1,130 libres este mes. Podrías apartar S/ 150 sin impacto.
            </Text>
          </View>
          <TouchableOpacity style={styles.adviceButton} activeOpacity={0.85}>
            <Text style={styles.adviceButtonText}>Apartar ahora →</Text>
          </TouchableOpacity>
        </View>

        {/* Alerta de alquiler */}
        <View style={styles.alertCard}>
          <Ionicons name="alert-circle" size={20} color={colors.coral} style={styles.alertIcon} />
          <View style={styles.flex1}>
            <Text style={styles.alertTitle}>Tu alquiler vence en 3 días</Text>
            <Text style={styles.alertSubtitle}>S/ 650 · Ya retenido de tu saldo libre</Text>
          </View>
        </View>

        {/* Meta: Viaje a Cusco */}
        <View style={styles.goalCard}>
          <View style={styles.goalHeaderRow}>
            <Text style={styles.goalTitle}>Viaje a Cusco</Text>
            <Text style={styles.goalPercentage}>57%</Text>
          </View>
          <Text style={styles.goalSubtitle}>Meta: S/ 1,500</Text>
          <ProgressBar percentage={57} />
          <View style={styles.goalFooterRow}>
            <Text style={styles.goalFooterText}>S/ 850 guardados</Text>
            <Text style={styles.goalFooterText}>¡Vas por buen camino para Mayo!</Text>
          </View>
        </View>

        {/* Tarjetas pequeñas: Mi Bolsa / Fondo Emergencia */}
        <View style={styles.miniRow}>
          <View style={styles.miniCard}>
            <Text style={styles.miniLabel}>Mi Bolsa</Text>
            <Text style={styles.miniValue}>S/ 3,428</Text>
            <Text style={styles.miniPositive}>↗ +S/ 120 esta sem.</Text>
          </View>
          <View style={styles.miniCard}>
            <Text style={styles.miniLabel}>Fondo Emergencia</Text>
            <Text style={styles.miniValue}>40% Meta</Text>
            <Text style={styles.miniNeutral}>🛡 S/ 1,200 de S/ 3,000</Text>
          </View>
        </View>
      </ScrollView>

      <BottomTabBar activeTab="principal" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  flex: {
    flex: 1,
  },
  flex1: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  headerTextBlock: {
    flex: 1,
    paddingRight: 12,
  },
  greeting: {
    fontSize: 13,
    color: colors.textGrey,
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 21,
    fontWeight: "800",
    color: colors.textDark,
    lineHeight: 26,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.goldLight,
    borderWidth: 2,
    borderColor: colors.gold,
  },
  adviceCard: {
    backgroundColor: colors.goldLight,
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
  },
  advicePill: {
    alignSelf: "flex-start",
    backgroundColor: colors.darkBrown,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 12,
  },
  advicePillText: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.cream,
    letterSpacing: 0.5,
  },
  adviceRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  adviceIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.darkBrown,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  adviceText: {
    flex: 1,
    fontSize: 14,
    color: colors.textDark,
    lineHeight: 19,
  },
  adviceButton: {
    alignSelf: "flex-start",
    backgroundColor: colors.darkBrown,
    borderRadius: 20,
    paddingHorizontal: 16,
    height: 38,
    justifyContent: "center",
    marginTop: 14,
  },
  adviceButtonText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: "700",
  },
  alertCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: colors.coralLight,
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
  },
  alertIcon: {
    marginRight: 10,
    marginTop: 2,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.coral,
    marginBottom: 3,
  },
  alertSubtitle: {
    fontSize: 12,
    color: colors.textGrey,
  },
  goalCard: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
  },
  goalHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  goalTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.textDark,
  },
  goalPercentage: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.gold,
  },
  goalSubtitle: {
    fontSize: 12,
    color: colors.textGrey,
    marginBottom: 10,
  },
  goalFooterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
  goalFooterText: {
    fontSize: 12,
    color: colors.textGrey,
  },
  miniRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 8,
  },
  miniCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 14,
  },
  miniLabel: {
    fontSize: 12,
    color: colors.textGrey,
    marginBottom: 6,
  },
  miniValue: {
    fontSize: 17,
    fontWeight: "800",
    color: colors.textDark,
    marginBottom: 4,
  },
  miniPositive: {
    fontSize: 11,
    color: colors.success,
    fontWeight: "600",
  },
  miniNeutral: {
    fontSize: 11,
    color: colors.textGrey,
    fontWeight: "600",
  },
});