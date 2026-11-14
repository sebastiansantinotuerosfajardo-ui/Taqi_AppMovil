import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import MetaCard from "../components/MetaCard";
import MetaFormModal from "../components/MetaFormModal";
import { useAppData } from "../context/AppDataContext";
import colors from "../constants/colors";

export default function MetasScreen({ navigation }) {
  const { metas, loaded, addMeta } = useAppData();
  const [formVisible, setFormVisible] = useState(false);

  const renderHeader = () => (
    <View style={styles.headerRow}>
      <View style={styles.flex1}>
        <Text style={styles.subtitle}>Tus sueños estructurados en pequeños pasos</Text>
        <Text style={styles.title}>Mis metas</Text>
      </View>
      <TouchableOpacity
        style={styles.newGoalButton}
        onPress={() => setFormVisible(true)}
        activeOpacity={0.85}
      >
        <Text style={styles.newGoalButtonText}>+ Nueva meta</Text>
      </TouchableOpacity>
    </View>
  );

  const renderEmpty = () => {
    if (!loaded) {
      return <ActivityIndicator color={colors.gold} style={styles.loader} size="large" />;
    }
    return (
      <View style={styles.emptyCard}>
        <Ionicons name="flag-outline" size={44} color={colors.gold} />
        <Text style={styles.emptyTitle}>¡Aún no tienes metas!</Text>
        <Text style={styles.emptyText}>
          Crea tu primera meta y empieza a ahorrar paso a paso hacia tus objetivos.
        </Text>
        <TouchableOpacity
          style={styles.emptyButton}
          onPress={() => setFormVisible(true)}
          activeOpacity={0.85}
        >
          <Text style={styles.emptyButtonText}>Crear mi primera meta</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const abrirMeta = useCallback((id) => navigation.navigate("MetaDetalle", { id }), [navigation]);

  const renderGoalCard = useCallback(
    ({ item }) => <MetaCard meta={item} onPress={abrirMeta} />,
    [abrirMeta]
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <StatusBar style="dark" />
      <FlatList
        data={loaded ? metas : []}
        keyExtractor={(item) => item.id}
        renderItem={renderGoalCard}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      />

      <MetaFormModal
        visible={formVisible}
        onClose={() => setFormVisible(false)}
        onSubmit={addMeta}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.cream },
  scrollContent: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 28 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 18,
  },
  flex1: { flex: 1, paddingRight: 12 },
  subtitle: { fontSize: 13, color: colors.textGrey, marginBottom: 4 },
  title: { fontSize: 22, fontWeight: "800", color: colors.textDark },
  newGoalButton: {
    backgroundColor: colors.gold,
    borderRadius: 20,
    paddingHorizontal: 14,
    height: 36,
    justifyContent: "center",
  },
  newGoalButtonText: { color: colors.white, fontSize: 12, fontWeight: "700" },
  loader: { marginTop: 40 },
  emptyCard: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    marginTop: 20,
  },
  emptyTitle: { fontSize: 17, fontWeight: "800", color: colors.textDark, marginTop: 10 },
  emptyText: {
    fontSize: 13,
    color: colors.textGrey,
    textAlign: "center",
    marginTop: 6,
    marginBottom: 18,
    lineHeight: 18,
  },
  emptyButton: {
    backgroundColor: colors.darkBrown,
    borderRadius: 14,
    paddingHorizontal: 20,
    height: 46,
    justifyContent: "center",
  },
  emptyButtonText: { color: colors.white, fontWeight: "700", fontSize: 14 },
});
