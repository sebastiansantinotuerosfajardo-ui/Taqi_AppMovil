import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import { useAppData } from "../context/AppDataContext";
import { formatSoles } from "../utils/format";
import GastoFijoModal from "../components/GastoFijoModal";
import GastoVariableModal from "../components/GastoVariableModal";
import colors from "../constants/colors";

export default function WalletScreen() {
  const { user } = useAuth();
  const {
    totalAhorrado,
    gastosFijos,
    presupuesto,
    totalGastosFijos,
    montoLibreFijo,
    montoLibreVariable,
    perfilVivienda,
    setPerfilVivienda,
    addGastoFijo,
    updateGastoFijo,
    deleteGastoFijo,
    updatePresupuesto,
  } = useAppData();

  const [activeSubTab, setActiveSubTab] = useState(perfilVivienda || "fija"); // 'fija' | 'variable'
  const [modalGastoFijoVisible, setModalGastoFijoVisible] = useState(false);
  const [editingGasto, setEditingGasto] = useState(null);
  const [modalVariableVisible, setModalVariableVisible] = useState(false);

  const owner = user ? user.username.toUpperCase() : "USUARIO TAQI";

  const handleTabChange = (tab) => {
    setActiveSubTab(tab);
    setPerfilVivienda(tab);
  };

  const handleEditGasto = (gasto) => {
    setEditingGasto(gasto);
    setModalGastoFijoVisible(true);
  };

  const handleConfirmDelete = (gasto) => {
    Alert.alert(
      "¿Eliminar gasto?",
      `¿Seguro que quieres eliminar "${gasto.title}" de tus gastos fijos? Esta acción no se puede deshacer.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: () => deleteGastoFijo(gasto.id),
        },
      ]
    );
  };

  const renderHeader = () => (
    <View>
      <Text style={styles.subtitle}>Mi saldo total en metas</Text>
      <Text style={styles.balance}>{formatSoles(totalAhorrado)}</Text>

      {/* Tarjeta Dorada TAQI */}
      <View style={styles.cardDark}>
        <View style={styles.cardDarkHeader}>
          <Ionicons name="card-outline" size={18} color={colors.goldLight} />
          <Text style={styles.cardDarkTitle}>Bolsa de Ahorro</Text>
          <View style={styles.activeDot} />
          <Text style={styles.activeText}>Activa</Text>
        </View>
        <Text style={styles.cardNumber}>•••• •••• •••• 4827</Text>
        <View style={styles.cardDarkFooter}>
          <Text style={styles.cardOwner}>{owner}</Text>
          <Text style={styles.cardType}>Tarjeta Dorada TAQI</Text>
        </View>
      </View>

      <View style={styles.sectionHeaderRow}>
        <View>
          <Text style={styles.sectionTitle}>Tus gastos del mes</Text>
          <Text style={styles.sectionSubtitle}>Controla tus obligaciones recurrentes</Text>
        </View>
      </View>

      {/* Pestañas Segmentadas: Vivienda Fija vs Vivienda Variable */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.segmentTab, activeSubTab === "fija" && styles.segmentTabActive]}
          onPress={() => handleTabChange("fija")}
          activeOpacity={0.8}
        >
          <Text
            style={[styles.segmentText, activeSubTab === "fija" && styles.segmentTextActive]}
          >
            Vivienda fija
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.segmentTab, activeSubTab === "variable" && styles.segmentTabActive]}
          onPress={() => handleTabChange("variable")}
          activeOpacity={0.8}
        >
          <Text
            style={[styles.segmentText, activeSubTab === "variable" && styles.segmentTextActive]}
          >
            Vivienda variable
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderGastoItem = ({ item }) => (
    <View style={styles.expenseRow}>
      <View style={styles.iconCircle}>
        <Ionicons
          name={item.icon || "receipt-outline"}
          size={20}
          color={colors.darkBrown}
        />
      </View>
      <View style={styles.expenseInfo}>
        <Text style={styles.expenseLabel}>{item.title}</Text>
        <Text style={styles.expenseCategory}>{item.category || "Gasto fijo mensual"}</Text>
      </View>
      <Text style={styles.expenseAmount}>{formatSoles(item.amount)}</Text>
      <View style={styles.actionButtons}>
        <TouchableOpacity
          onPress={() => handleEditGasto(item)}
          style={styles.actionBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="create-outline" size={17} color={colors.textGrey} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => handleConfirmDelete(item)}
          style={styles.actionBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="trash-outline" size={17} color={colors.coral} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderFooter = () => {
    if (activeSubTab === "variable") {
      return (
        <View style={styles.variableContainer}>
          <View style={styles.variableCard}>
            <View style={styles.variableHeader}>
              <View>
                <Text style={styles.variableTitle}>Gasto promedio mensual estimado</Text>
                <Text style={styles.variableSubtitle}>
                  Este monto reemplaza el desglose de cuentas individuales para proyectar tu liquidez.
                </Text>
              </View>
              <TouchableOpacity
                style={styles.editVariableButton}
                onPress={() => setModalVariableVisible(true)}
              >
                <Text style={styles.editVariableButtonText}>Editar</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.variableAmount}>
              {formatSoles(presupuesto.gastoVariableEstimado || 0)}
            </Text>
          </View>

          <View style={styles.summaryBox}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Ingreso base registrado:</Text>
              <Text style={styles.summaryValue}>
                {formatSoles(presupuesto.ingresoMensual || 0)}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total gasto variable:</Text>
              <Text style={styles.summaryValue}>
                {formatSoles(presupuesto.gastoVariableEstimado || 0)}
              </Text>
            </View>
            <View style={[styles.summaryRow, styles.summaryRowHighlight]}>
              <Text style={styles.summaryLabelHighlight}>Monto libre estimado:</Text>
              <Text style={styles.summaryValueHighlight}>{formatSoles(montoLibreVariable)}</Text>
            </View>
          </View>
        </View>
      );
    }

    return (
      <View>
        <TouchableOpacity
          style={styles.addGastoButton}
          onPress={() => {
            setEditingGasto(null);
            setModalGastoFijoVisible(true);
          }}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={18} color={colors.darkBrown} style={styles.addIcon} />
          <Text style={styles.addGastoButtonText}>Agregar otra cuenta</Text>
        </TouchableOpacity>

        <View style={styles.summaryBox}>
          <View style={styles.summaryRow}>
            <View style={styles.labelWithAction}>
              <Text style={styles.summaryLabel}>Ingreso base mensual:</Text>
              <TouchableOpacity
                onPress={() => setModalVariableVisible(true)}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <Text style={styles.editLink}>Editar sueldo</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.summaryValue}>
              {formatSoles(presupuesto.ingresoMensual || 0)}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total gasto fijo:</Text>
            <Text style={styles.summaryValue}>{formatSoles(totalGastosFijos)}</Text>
          </View>
          <View style={[styles.summaryRow, styles.summaryRowHighlight]}>
            <Text style={styles.summaryLabelHighlight}>Monto libre:</Text>
            <Text style={styles.summaryValueHighlight}>{formatSoles(montoLibreFijo)}</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <StatusBar style="dark" />
      <FlatList
        data={activeSubTab === "fija" ? gastosFijos : []}
        keyExtractor={(item) => item.id}
        renderItem={renderGastoItem}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={
          activeSubTab === "fija" ? (
            <View style={styles.emptyGastoCard}>
              <Ionicons name="receipt-outline" size={38} color={colors.gold} />
              <Text style={styles.emptyGastoTitle}>¡No hay gastos fijos registrados!</Text>
              <Text style={styles.emptyGastoText}>
                Agrega tus gastos fijos para tener un mejor control de tus finanzas este mes.
              </Text>
            </View>
          ) : null
        }
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      />

      {/* Modal para Crear / Editar Gasto Fijo */}
      <GastoFijoModal
        visible={modalGastoFijoVisible}
        onClose={() => {
          setModalGastoFijoVisible(false);
          setEditingGasto(null);
        }}
        initial={editingGasto}
        onSubmit={(data) => {
          if (editingGasto) {
            updateGastoFijo(editingGasto.id, data);
          } else {
            addGastoFijo(data);
          }
        }}
      />

      {/* Modal para Ajustar Presupuesto (Sueldo e ingresos) */}
      <GastoVariableModal
        visible={modalVariableVisible}
        onClose={() => setModalVariableVisible(false)}
        initial={presupuesto}
        onSubmit={updatePresupuesto}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.cream },
  scrollContent: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 28 },
  subtitle: { fontSize: 13, color: colors.textGrey, marginBottom: 4 },
  balance: { fontSize: 28, fontWeight: "800", color: colors.textDark, marginBottom: 18 },
  cardDark: { backgroundColor: colors.darkBrown, borderRadius: 20, padding: 18, marginBottom: 22 },
  cardDarkHeader: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
  cardDarkTitle: { color: colors.white, fontSize: 14, fontWeight: "700", marginLeft: 8, flex: 1 },
  activeDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: colors.success, marginRight: 5 },
  activeText: { color: colors.success, fontSize: 12, fontWeight: "600" },
  cardNumber: { color: colors.white, fontSize: 16, letterSpacing: 2, marginBottom: 12 },
  cardDarkFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardOwner: { color: colors.cream, fontSize: 12, fontWeight: "700" },
  cardType: { color: colors.goldLight, fontSize: 11 },
  sectionHeaderRow: { marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: "800", color: colors.textDark },
  sectionSubtitle: { fontSize: 12, color: colors.textGrey, marginTop: 2 },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: 4,
    marginBottom: 16,
  },
  segmentTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 11,
  },
  segmentTabActive: {
    backgroundColor: colors.darkBrown,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textGrey,
  },
  segmentTextActive: {
    color: colors.white,
    fontWeight: "700",
  },
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
  addGastoButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.goldLight,
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 8,
    marginBottom: 16,
  },
  addIcon: { marginRight: 6 },
  addGastoButtonText: { fontSize: 13, fontWeight: "700", color: colors.darkBrown },
  summaryBox: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
  },
  labelWithAction: { flexDirection: "row", alignItems: "center", gap: 8 },
  editLink: { fontSize: 11, color: colors.gold, fontWeight: "700", textDecorationLine: "underline" },
  summaryRowHighlight: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: 6,
    paddingTop: 10,
  },
  summaryLabel: { fontSize: 13, color: colors.textGrey },
  summaryValue: { fontSize: 14, fontWeight: "700", color: colors.textDark },
  summaryLabelHighlight: { fontSize: 14, fontWeight: "800", color: colors.darkBrown },
  summaryValueHighlight: { fontSize: 18, fontWeight: "900", color: colors.success },
  variableContainer: { marginTop: 4 },
  variableCard: {
    backgroundColor: colors.white,
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
  },
  variableHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  variableTitle: { fontSize: 14, fontWeight: "700", color: colors.textDark, maxWidth: "75%" },
  variableSubtitle: { fontSize: 11, color: colors.textGrey, marginTop: 4, maxWidth: "85%", lineHeight: 16 },
  editVariableButton: {
    backgroundColor: colors.goldLight,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  editVariableButtonText: { fontSize: 12, fontWeight: "700", color: colors.darkBrown },
  variableAmount: { fontSize: 24, fontWeight: "900", color: colors.textDark },
  emptyGastoCard: {
    backgroundColor: colors.white,
    borderRadius: 18,
    padding: 24,
    alignItems: "center",
    marginVertical: 10,
  },
  emptyGastoTitle: { fontSize: 15, fontWeight: "800", color: colors.textDark, marginTop: 8 },
  emptyGastoText: {
    fontSize: 12,
    color: colors.textGrey,
    textAlign: "center",
    marginTop: 4,
    lineHeight: 16,
  },
});
