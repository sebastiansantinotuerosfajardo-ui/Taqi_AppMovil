import React, { useEffect, useState } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AuthInput from "./AuthInput";
import colors from "../constants/colors";

const ICON_OPTIONS = [
  { name: "home-outline", label: "Vivienda" },
  { name: "flash-outline", label: "Luz" },
  { name: "water-outline", label: "Agua" },
  { name: "wifi-outline", label: "Internet" },
  { name: "flame-outline", label: "Gas" },
  { name: "bus-outline", label: "Transporte" },
  { name: "cart-outline", label: "Comestibles" },
  { name: "receipt-outline", label: "Servicios" },
];

export default function GastoFijoModal({ visible, onClose, onSubmit, initial = null }) {
  const isEdit = !!initial;
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [selectedIcon, setSelectedIcon] = useState("home-outline");
  const [category, setCategory] = useState("Servicios");
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (visible) {
      setTitle(initial ? initial.title : "");
      setAmount(initial ? String(initial.amount) : "");
      setSelectedIcon(initial ? initial.icon || "receipt-outline" : "home-outline");
      setCategory(initial ? initial.category || "Servicios" : "Servicios");
      setErrors({});
    }
  }, [visible, initial]);

  const handleSave = () => {
    const newErrors = {};
    const amountNum = Number(String(amount).replace(",", "."));
    if (title.trim().length < 2) newErrors.title = "Ingresa el nombre del gasto";
    if (!isFinite(amountNum) || amountNum <= 0) newErrors.amount = "Ingresa un monto válido mayor a 0";

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    onSubmit({
      title: title.trim(),
      amount: amountNum,
      icon: selectedIcon,
      category,
    });
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.card}>
          <Text style={styles.title}>{isEdit ? "Editar gasto" : "Agregar gasto"}</Text>
          <Text style={styles.subtitle}>Define tus obligaciones mensuales recurrentes</Text>

          <Text style={styles.label}>Nombre del gasto</Text>
          <AuthInput
            icon="receipt-outline"
            placeholder="Ej: Internet, Luz, Alquiler"
            value={title}
            onChangeText={(t) => {
              setTitle(t);
              if (errors.title) setErrors((e) => ({ ...e, title: null }));
            }}
            autoCapitalize="sentences"
          />
          {errors.title && <Text style={styles.errorText}>{errors.title}</Text>}

          <Text style={styles.label}>Monto mensual (S/)</Text>
          <AuthInput
            icon="cash-outline"
            placeholder="Ej: 89"
            value={amount}
            onChangeText={(t) => {
              setAmount(t);
              if (errors.amount) setErrors((e) => ({ ...e, amount: null }));
            }}
            keyboardType="numeric"
          />
          {errors.amount && <Text style={styles.errorText}>{errors.amount}</Text>}

          <Text style={styles.label}>Selecciona un icono</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.iconScroll}>
            {ICON_OPTIONS.map((item) => {
              const isSelected = selectedIcon === item.name;
              return (
                <TouchableOpacity
                  key={item.name}
                  style={[styles.iconBox, isSelected && styles.iconBoxSelected]}
                  onPress={() => {
                    setSelectedIcon(item.name);
                    setCategory(item.label);
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={item.name}
                    size={22}
                    color={isSelected ? colors.white : colors.textDark}
                  />
                  <Text style={[styles.iconLabel, isSelected && styles.iconLabelSelected]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <TouchableOpacity style={styles.saveButton} onPress={handleSave} activeOpacity={0.85}>
            <Text style={styles.saveText}>{isEdit ? "Guardar cambios" : "Agregar gasto"}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelText}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(43,31,23,0.55)",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  card: { backgroundColor: colors.cream, borderRadius: 24, padding: 20 },
  title: { fontSize: 18, fontWeight: "800", color: colors.textDark },
  subtitle: { fontSize: 12, color: colors.textGrey, marginBottom: 14 },
  label: { fontSize: 13, fontWeight: "600", color: colors.textDark, marginBottom: 8 },
  errorText: { fontSize: 12, color: colors.coral, marginTop: -8, marginBottom: 10 },
  iconScroll: { flexDirection: "row", marginBottom: 16 },
  iconBox: {
    width: 68,
    height: 64,
    borderRadius: 14,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  iconBoxSelected: {
    backgroundColor: colors.darkBrown,
    borderColor: colors.darkBrown,
  },
  iconLabel: { fontSize: 10, color: colors.textGrey, marginTop: 4, fontWeight: "600" },
  iconLabelSelected: { color: colors.white },
  saveButton: {
    backgroundColor: colors.darkBrown,
    height: 50,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
  },
  saveText: { color: colors.white, fontSize: 15, fontWeight: "700" },
  cancelButton: { alignItems: "center", paddingVertical: 12 },
  cancelText: { color: colors.textGrey, fontSize: 14, fontWeight: "600" },
});
