import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import ProgressBar from "../components/ProgressBar";
import ExchangeRateCard from "../components/ExchangeRateCard";
import { useAuth } from "../context/AuthContext";
import { useAppData } from "../context/AppDataContext";
import { getSaved, getPercentage } from "../utils/metas";
import { formatSoles } from "../utils/format";
import colors from "../constants/colors";

export default function HomeScreen({ navigation }) {
  const { user } = useAuth();
  const { metas, totalAhorrado, totalGastosFijos, montoLibre, gastosFijos } = useAppData();

  const userName = user ? user.username : "Amigo";
  const featured = metas.find((m) => getPercentage(m) < 100) || metas[0];
  const completed = metas.filter((m) => getPercentage(m) >= 100).length;

  // Primer gasto fijo para la tarjeta de alerta preventiva
  const mainExpense = gastosFijos && gastosFijos.length > 0 ? gastosFijos[0] : null;

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <StatusBar style="dark" />
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.headerTextBlock}>
            <Text style={styles.greeting}>Hola, {userName} 👋</Text>
            <Text style={styles.headerTitle}>Esto es lo que te conviene ver hoy</Text>
          </View>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {userName.slice(0, 1).toUpperCase()}
            </Text>
          </View>
        </View>

        {/* Tarjeta de Consejo Financiero Inteligente */}
        <View style={styles.adviceCard}>
          <View style={styles.advicePill}>
            <Text style={styles.advicePillText}>CONSEJO FINANCIERO</Text>
          </View>
          <View style={styles.adviceRow}>
            <View style={styles.adviceIconCircle}>
              <Ionicons name="cash-outline" size={18} color={colors.white} />
            </View>
            <Text style={styles.adviceText}>
              Te quedan <Text style={styles.adviceHighlight}>{formatSoles(montoLibre)}</Text> libres este mes tras cubrir tus obligaciones.
            </Text>
          </View>
          <TouchableOpacity
            style={styles.adviceButton}
            activeOpacity={0.85}
            onPress={() => navigation.navigate("metas")}
          >
            <Text style={styles.adviceButtonText}>Apartar a una meta →</Text>
          </TouchableOpacity>
        </View>

        {/* Tarjeta de Alerta Preventiva de Gastos Fijos */}
        {mainExpense ? (
          <TouchableOpacity
            style={styles.alertCard}
            onPress={() => navigation.navigate("bolsa")}
            activeOpacity={0.85}
          >
            <Ionicons name="alert-circle" size={20} color={colors.coral} style={styles.alertIcon} />
            <View style={styles.flex1}>
              <Text style={styles.alertTitle}>Tu {mainExpense.title.toLowerCase()} vence pronto</Text>
              <Text style={styles.alertSubtitle}>
                {formatSoles(mainExpense.amount)} · Ya descontado de tu saldo libre mensual
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.coral} />
          </TouchableOpacity>
        ) : (
          <View style={styles.alertCard}>
            <Ionicons name="checkmark-circle" size={20} color={colors.success} style={styles.alertIcon} />
            <View style={styles.flex1}>
              <Text style={[styles.alertTitle, { color: colors.success }]}>Sin deudas pendientes</Text>
              <Text style={styles.alertSubtitle}>Registra tus obligaciones fijas en Mi Bolsa</Text>
            </View>
          </View>
        )}

        {/* Meta Destacada en Progreso */}
        {featured ? (
          <TouchableOpacity
            style={styles.goalCard}
            activeOpacity={0.85}
            onPress={() => navigation.navigate("MetaDetalle", { id: featured.id })}
          >
            <View style={styles.goalHeaderRow}>
              <Text style={styles.goalTitle} numberOfLines={1}>
                {featured.title}
              </Text>
              <Text style={styles.goalPercentage}>{getPercentage(featured)}%</Text>
            </View>
            <Text style={styles.goalSubtitle}>Meta: {formatSoles(featured.target, 0)}</Text>
            <ProgressBar percentage={getPercentage(featured)} />
            <View style={styles.goalFooterRow}>
              <Text style={styles.goalFooterText}>{formatSoles(getSaved(featured), 0)} guardados</Text>
              <Text style={styles.goalFooterText}>¡Sigue así!</Text>
            </View>
          </TouchableOpacity>
        ) : (
          <View style={styles.goalCard}>
            <Text style={styles.goalTitle}>Aún no tienes metas</Text>
            <Text style={styles.goalSubtitle}>Crea una para ver tu progreso aquí.</Text>
            <TouchableOpacity
              style={styles.createGoalButton}
              onPress={() => navigation.navigate("metas")}
            >
              <Text style={styles.createGoalText}>Crear mi primera meta</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Mini Métricas de Liquidez y Metas */}
        <View style={styles.miniRow}>
          <TouchableOpacity
            style={styles.miniCard}
            onPress={() => navigation.navigate("bolsa")}
            activeOpacity={0.85}
          >
            <Text style={styles.miniLabel}>Mi Bolsa (Ahorro)</Text>
            <Text style={styles.miniValue}>{formatSoles(totalAhorrado, 0)}</Text>
            <Text style={styles.miniPositive}>↗ En metas de ahorro</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.miniCard}
            onPress={() => navigation.navigate("bolsa")}
            activeOpacity={0.85}
          >
            <Text style={styles.miniLabel}>Gastos fijos/mes</Text>
            <Text style={styles.miniValue}>{formatSoles(totalGastosFijos, 0)}</Text>
            <Text style={styles.miniNeutral}>📋 {gastosFijos.length} obligaciones</Text>
          </TouchableOpacity>
        </View>

        {/* Card de Tipo de Cambio Consumiendo API Externa (fetch + axios) */}
        <ExchangeRateCard />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.cream },
  flex: { flex: 1 },
  flex1: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  headerTextBlock: { flex: 1, paddingRight: 12 },
  greeting: { fontSize: 13, color: colors.textGrey, marginBottom: 4 },
  headerTitle: { fontSize: 21, fontWeight: "800", color: colors.textDark, lineHeight: 26 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.goldLight,
    borderWidth: 2,
    borderColor: colors.gold,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 16, fontWeight: "800", color: colors.darkBrown },
  adviceCard: { backgroundColor: colors.goldLight, borderRadius: 20, padding: 16, marginBottom: 14 },
  advicePill: {
    alignSelf: "flex-start",
    backgroundColor: colors.darkBrown,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 12,
  },
  advicePillText: { fontSize: 10, fontWeight: "700", color: colors.cream, letterSpacing: 0.5 },
  adviceRow: { flexDirection: "row", alignItems: "center" },
  adviceIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.darkBrown,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  adviceText: { flex: 1, fontSize: 14, color: colors.textDark, lineHeight: 19 },
  adviceHighlight: { fontWeight: "800", color: colors.darkBrown },
  adviceButton: {
    alignSelf: "flex-start",
    backgroundColor: colors.darkBrown,
    borderRadius: 20,
    paddingHorizontal: 16,
    height: 38,
    justifyContent: "center",
    marginTop: 14,
  },
  adviceButtonText: { color: colors.white, fontSize: 13, fontWeight: "700" },
  alertCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.coralLight,
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
  },
  alertIcon: { marginRight: 10 },
  alertTitle: { fontSize: 14, fontWeight: "700", color: colors.coral, marginBottom: 3 },
  alertSubtitle: { fontSize: 12, color: colors.textGrey },
  goalCard: { backgroundColor: colors.white, borderRadius: 20, padding: 16, marginBottom: 14 },
  goalHeaderRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  goalTitle: { fontSize: 15, fontWeight: "700", color: colors.textDark, flexShrink: 1, paddingRight: 8 },
  goalPercentage: { fontSize: 15, fontWeight: "800", color: colors.gold },
  goalSubtitle: { fontSize: 12, color: colors.textGrey, marginBottom: 10 },
  goalFooterRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 10 },
  goalFooterText: { fontSize: 12, color: colors.textGrey },
  createGoalButton: {
    alignSelf: "flex-start",
    backgroundColor: colors.darkBrown,
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 40,
    justifyContent: "center",
  },
  createGoalText: { color: colors.white, fontSize: 13, fontWeight: "700" },
  miniRow: { flexDirection: "row", gap: 12, marginBottom: 14 },
  miniCard: { flex: 1, backgroundColor: colors.white, borderRadius: 16, padding: 14 },
  miniLabel: { fontSize: 12, color: colors.textGrey, marginBottom: 6 },
  miniValue: { fontSize: 17, fontWeight: "800", color: colors.textDark, marginBottom: 4 },
  miniPositive: { fontSize: 11, color: colors.success, fontWeight: "600" },
  miniNeutral: { fontSize: 11, color: colors.textGrey, fontWeight: "600" },
});
