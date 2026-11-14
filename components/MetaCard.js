import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import ProgressBar from "./ProgressBar";
import { getSaved, getPercentage } from "../utils/metas";
import { formatSoles } from "../utils/format";
import colors from "../constants/colors";

// Tarjeta de una meta en la lista. React.memo evita volver a dibujarla si su meta no cambió.
function MetaCard({ meta, onPress }) {
  const saved = getSaved(meta);
  const percentage = getPercentage(meta);
  const done = percentage >= 100;

  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.85} onPress={() => onPress(meta.id)}>
      <View style={styles.cardHeaderRow}>
        <View style={styles.titleRow}>
          <Ionicons name="flag-outline" size={18} color={colors.darkBrown} style={styles.titleIcon} />
          <Text style={styles.cardTitle} numberOfLines={1}>
            {meta.title}
          </Text>
        </View>
        <Text style={styles.percentage}>{percentage}%</Text>
      </View>
      <Text style={styles.cardSubtitle}>
        {formatSoles(saved, 0)} / {formatSoles(meta.target, 0)}
      </Text>
      <ProgressBar percentage={percentage} color={done ? colors.success : colors.gold} />
      <View style={styles.footerRow}>
        <Text style={styles.footerText}>
          {done ? "Meta alcanzada" : `Faltan ${formatSoles(Math.max(meta.target - saved, 0), 0)}`}
        </Text>
        <Text style={[styles.footerTextRight, done && styles.footerTextDone]}>
          {done ? "¡Cumplida!" : "En camino"}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

export default React.memo(MetaCard);

const styles = StyleSheet.create({
  card: { backgroundColor: colors.white, borderRadius: 18, padding: 16, marginBottom: 14 },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  titleRow: { flexDirection: "row", alignItems: "center", flex: 1, paddingRight: 8 },
  titleIcon: { marginRight: 8 },
  cardTitle: { fontSize: 15, fontWeight: "700", color: colors.textDark, flexShrink: 1 },
  percentage: { fontSize: 15, fontWeight: "800", color: colors.gold },
  cardSubtitle: { fontSize: 12, color: colors.textGrey, marginBottom: 10 },
  footerRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 10 },
  footerText: { fontSize: 12, color: colors.textGrey },
  footerTextRight: { fontSize: 12, color: colors.gold, fontWeight: "700" },
  footerTextDone: { color: colors.success },
});
