import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import useExchangeRate from "../hooks/useExchangeRate";
import { getRateWithFetch, getRateWithAxios } from "../services/api";
import colors from "../constants/colors";

function RateRow({ label, state }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      {state.loading ? (
        <ActivityIndicator size="small" color={colors.gold} />
      ) : state.error ? (
        <TouchableOpacity onPress={state.reload} style={styles.retryButton}>
          <Text style={styles.errorText}>Error · Reintentar</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.valueCol}>
          <Text style={styles.rowValue}>S/ {state.rate?.toFixed(3)}</Text>
          {state.isMock && <Text style={styles.mockBadge}>(offline)</Text>}
        </View>
      )}
    </View>
  );
}

// Muestra el tipo de cambio del día consumiendo la API de divisas
export default function ExchangeRateCard() {
  const usd = useExchangeRate(getRateWithFetch, "USD");
  const eur = useExchangeRate(getRateWithAxios, "EUR");

  const reloadAll = () => {
    usd.reload();
    eur.reload();
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <Ionicons
            name="trending-up-outline"
            size={18}
            color={colors.gold}
            style={styles.headerIcon}
          />
          <Text style={styles.title}>Tipo de cambio hoy</Text>
        </View>
        <TouchableOpacity onPress={reloadAll} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="refresh-outline" size={18} color={colors.textGrey} />
        </TouchableOpacity>
      </View>
      <RateRow label="Dólar (USD)" state={usd} />
      <RateRow label="Euro (EUR)" state={eur} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.white, borderRadius: 18, padding: 16, marginBottom: 14 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  headerTitleRow: { flexDirection: "row", alignItems: "center" },
  headerIcon: { marginRight: 6 },
  title: { fontSize: 15, fontWeight: "700", color: colors.textDark },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 6 },
  rowLabel: { fontSize: 13, color: colors.textGrey },
  valueCol: { alignItems: "flex-end" },
  rowValue: { fontSize: 14, fontWeight: "800", color: colors.textDark },
  mockBadge: { fontSize: 10, color: colors.textGrey, fontStyle: "italic" },
  retryButton: { paddingVertical: 2, paddingHorizontal: 6 },
  errorText: { fontSize: 12, color: colors.coral, fontWeight: "600" },
});
