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
        <TouchableOpacity onPress={state.reload}>
          <Text style={styles.errorText}>{state.error} · Reintentar</Text>
        </TouchableOpacity>
      ) : (
        <Text style={styles.rowValue}>S/ {state.rate.toFixed(3)}</Text>
      )}
    </View>
  );
}

// Muestra el tipo de cambio consumiendo una API pública (dólar con fetch, euro con axios)
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
        <Text style={styles.title}>Tipo de cambio hoy</Text>
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
  title: { fontSize: 15, fontWeight: "700", color: colors.textDark },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 6 },
  rowLabel: { fontSize: 13, color: colors.textGrey },
  rowValue: { fontSize: 14, fontWeight: "800", color: colors.textDark },
  errorText: { fontSize: 12, color: colors.coral, fontWeight: "600" },
});
