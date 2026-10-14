import React, { useEffect, useState } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import AuthInput from "./AuthInput";
import colors from "../constants/colors";

// Modal para registrar un aporte (dinero que se suma a una meta)
export default function AporteModal({ visible, onClose, onSubmit, goalTitle }) {
  const [amount, setAmount] = useState("");
  const [error, setError] = useState(null);

  useEffect(() => {
    if (visible) {
      setAmount("");
      setError(null);
    }
  }, [visible]);

  const handleSave = () => {
    const value = Number(String(amount).replace(",", "."));
    if (!isFinite(value) || value <= 0) {
      setError("Ingresa un monto mayor a 0");
      return;
    }
    onSubmit(value);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.card}>
          <Text style={styles.title}>Agregar aporte</Text>
          <Text style={styles.subtitle}>{goalTitle}</Text>

          <Text style={styles.label}>Monto (S/)</Text>
          <AuthInput
            icon="cash-outline"
            placeholder="50"
            value={amount}
            onChangeText={(t) => {
              setAmount(t);
              if (error) setError(null);
            }}
            keyboardType="numeric"
          />
          {error && <Text style={styles.errorText}>{error}</Text>}

          <TouchableOpacity style={styles.saveButton} onPress={handleSave} activeOpacity={0.85}>
            <Text style={styles.saveText}>Guardar aporte</Text>
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
    paddingHorizontal: 24,
  },
  card: { backgroundColor: colors.cream, borderRadius: 22, padding: 20 },
  title: { fontSize: 18, fontWeight: "800", color: colors.textDark },
  subtitle: { fontSize: 13, color: colors.textGrey, marginBottom: 16 },
  label: { fontSize: 13, fontWeight: "600", color: colors.textDark, marginBottom: 8 },
  errorText: { fontSize: 12, color: colors.coral, marginTop: -10, marginBottom: 12 },
  saveButton: {
    backgroundColor: colors.darkBrown,
    height: 50,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  saveText: { color: colors.white, fontSize: 15, fontWeight: "700" },
  cancelButton: { alignItems: "center", paddingVertical: 12 },
  cancelText: { color: colors.textGrey, fontSize: 14, fontWeight: "600" },
});
