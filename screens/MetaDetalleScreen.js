import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import ProgressBar from "../components/ProgressBar";
import MetaFormModal from "../components/MetaFormModal";
import AporteModal from "../components/AporteModal";
import { useAppData } from "../context/AppDataContext";
import { getSaved, getPercentage } from "../utils/metas";
import { formatSoles, formatDate } from "../utils/format";
import colors from "../constants/colors";

export default function MetaDetalleScreen({ navigation, route }) {
  const { id } = route.params;
  const { metas, updateMeta, deleteMeta, addAporte } = useAppData();
  const meta = metas.find((m) => m.id === id);

  const [editVisible, setEditVisible] = useState(false);
  const [aporteVisible, setAporteVisible] = useState(false);

  // Si la meta ya no existe (por ejemplo, se eliminó) se vuelve a la lista
  useEffect(() => {
    if (!meta) navigation.goBack();
  }, [meta, navigation]);

  if (!meta) return null;

  const saved = getSaved(meta);
  const percentage = getPercentage(meta);
  const done = percentage >= 100;

  const confirmDelete = () => {
    Alert.alert(
      "¿Eliminar meta?",
      `Se eliminará "${meta.title}" y todos sus aportes. Esta acción no se puede deshacer.`,
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Eliminar", style: "destructive", onPress: () => deleteMeta(meta.id) },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.topRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconButton}>
            <Ionicons name="arrow-back" size={20} color={colors.textDark} />
          </TouchableOpacity>
          <View style={styles.topActions}>
            <TouchableOpacity onPress={() => setEditVisible(true)} style={styles.iconButton}>
              <Ionicons name="create-outline" size={20} color={colors.textDark} />
            </TouchableOpacity>
            <TouchableOpacity onPress={confirmDelete} style={styles.iconButton}>
              <Ionicons name="trash-outline" size={20} color={colors.coral} />
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.title}>{meta.title}</Text>

        {done && (
          <View style={styles.celebration}>
            <Text style={styles.celebrationEmoji}>🎉</Text>
            <Text style={styles.celebrationText}>¡Meta cumplida! Lo lograste.</Text>
          </View>
        )}

        <View style={styles.summaryCard}>
          <Text style={styles.percentage}>{percentage}%</Text>
          <Text style={styles.savedText}>{formatSoles(saved)} ahorrados</Text>
          <Text style={styles.targetText}>de {formatSoles(meta.target)}</Text>
          <View style={styles.progressWrapper}>
            <ProgressBar percentage={percentage} color={done ? colors.success : colors.gold} />
          </View>
        </View>

        <TouchableOpacity style={styles.addButton} onPress={() => setAporteVisible(true)} activeOpacity={0.85}>
          <Text style={styles.addButtonText}>Agregar aporte</Text>
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Historial de aportes</Text>
        {(meta.aportes || []).length === 0 ? (
          <Text style={styles.emptyText}>Todavía no hay aportes. ¡Agrega el primero!</Text>
        ) : (
          meta.aportes.map((a) => (
            <View key={a.id} style={styles.aporteRow}>
              <View>
                <Text style={styles.aporteLabel}>Aporte</Text>
                <Text style={styles.aporteDate}>{formatDate(a.date)}</Text>
              </View>
              <Text style={styles.aporteAmount}>+{formatSoles(a.amount)}</Text>
            </View>
          ))
        )}
      </ScrollView>

      <MetaFormModal
        visible={editVisible}
        onClose={() => setEditVisible(false)}
        initial={meta}
        onSubmit={(changes) => updateMeta(meta.id, changes)}
      />
      <AporteModal
        visible={aporteVisible}
        onClose={() => setAporteVisible(false)}
        goalTitle={meta.title}
        onSubmit={(amount) => addAporte(meta.id, amount)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.cream },
  scrollContent: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 32 },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  topActions: { flexDirection: "row", gap: 10 },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 22, fontWeight: "800", color: colors.textDark, marginBottom: 14 },
  celebration: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.goldLight,
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
  },
  celebrationEmoji: { fontSize: 22, marginRight: 10 },
  celebrationText: { flex: 1, fontSize: 14, fontWeight: "700", color: colors.textDark },
  summaryCard: { backgroundColor: colors.white, borderRadius: 20, padding: 20, alignItems: "center", marginBottom: 14 },
  percentage: { fontSize: 40, fontWeight: "800", color: colors.gold },
  savedText: { fontSize: 16, fontWeight: "700", color: colors.textDark, marginTop: 4 },
  targetText: { fontSize: 13, color: colors.textGrey, marginBottom: 14 },
  progressWrapper: { width: "100%" },
  addButton: {
    backgroundColor: colors.darkBrown,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 22,
  },
  addButtonText: { color: colors.white, fontSize: 15, fontWeight: "700" },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: colors.textDark, marginBottom: 10 },
  emptyText: { fontSize: 13, color: colors.textGrey },
  aporteRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  aporteLabel: { fontSize: 14, fontWeight: "600", color: colors.textDark },
  aporteDate: { fontSize: 12, color: colors.textGrey, marginTop: 2 },
  aporteAmount: { fontSize: 14, fontWeight: "800", color: colors.success },
});
