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

// Modal para crear o editar una meta. Si recibe "initial" funciona como edición.
export default function MetaFormModal({ visible, onClose, onSubmit, initial = null }) {
  const isEdit = !!initial;
  const [title, setTitle] = useState("");
  const [target, setTarget] = useState("");
  const [errors, setErrors] = useState({});

  // Cada vez que se abre el modal se cargan los valores iniciales
  useEffect(() => {
    if (visible) {
      setTitle(initial ? initial.title : "");
      setTarget(initial ? String(initial.target) : "");
      setErrors({});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const handleSave = () => {
    const newErrors = {};
    const targetNumber = Number(String(target).replace(",", "."));
    if (title.trim().length < 2) newErrors.title = "Escribe un nombre (mínimo 2 letras)";
    if (!isFinite(targetNumber) || targetNumber <= 0) newErrors.target = "Ingresa un monto mayor a 0";
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    onSubmit({ title: title.trim(), target: targetNumber });
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.card}>
          <Text style={styles.title}>{isEdit ? "Editar meta" : "Nueva meta"}</Text>

          <Text style={styles.label}>Nombre de la meta</Text>
          <AuthInput
            icon="flag-outline"
            placeholder="Viaje a Cusco"
            value={title}
            onChangeText={setTitle}
            autoCapitalize="sentences"
          />
          {errors.title && <Text style={styles.errorText}>{errors.title}</Text>}

          <Text style={styles.label}>Monto objetivo (S/)</Text>
          <AuthInput
            icon="cash-outline"
            placeholder="1500"
            value={target}
            onChangeText={setTarget}
            keyboardType="numeric"
          />
          {errors.target && <Text style={styles.errorText}>{errors.target}</Text>}

          <TouchableOpacity style={styles.saveButton} onPress={handleSave} activeOpacity={0.85}>
            <Text style={styles.saveText}>{isEdit ? "Guardar cambios" : "Crear meta"}</Text>
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
  card: {
    backgroundColor: colors.cream,
    borderRadius: 22,
    padding: 20,
  },
  title: { fontSize: 18, fontWeight: "800", color: colors.textDark, marginBottom: 16 },
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
