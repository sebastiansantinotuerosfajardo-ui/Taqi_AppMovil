import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { formatSoles } from "../utils/format";
import colors from "../constants/colors";

// Fila de un gasto fijo con sus botones de editar y eliminar. Memoizada para no redibujarse sin necesidad.
function GastoRow({ gasto, onEdit, onDelete }) {
  return (
    <View style={styles.expenseRow}>
      <View style={styles.iconCircle}>
        <Ionicons name={gasto.icon || "receipt-outline"} size={20} color={colors.darkBrown} />
      </View>
      <View style={styles.expenseInfo}>
        <Text style={styles.expenseLabel}>{gasto.title}</Text>
        <Text style={styles.expenseCategory}>
          {gasto.category || "Gasto fijo mensual"} · día {gasto.diaVencimiento || 1}
        </Text>
      </View>
      <Text style={styles.expenseAmount}>{formatSoles(gasto.amount)}</Text>
      <View style={styles.actionButtons}>
        <TouchableOpacity
          onPress={() => onEdit(gasto)}
          style={styles.actionBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="create-outline" size={17} color={colors.textGrey} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => onDelete(gasto)}
          style={styles.actionBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="trash-outline" size={17} color={colors.coral} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default React.memo(GastoRow);

const styles = StyleSheet.create({
  expenseRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.goldLight,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  expenseInfo: { flex: 1, paddingRight: 8 },
  expenseLabel: { fontSize: 14, color: colors.textDark, fontWeight: "700" },
  expenseCategory: { fontSize: 11, color: colors.textGrey, marginTop: 2 },
  expenseAmount: { fontSize: 14, color: colors.textDark, fontWeight: "800", marginRight: 8 },
  actionButtons: { flexDirection: "row", alignItems: "center", gap: 6 },
  actionBtn: { padding: 4 },
});
