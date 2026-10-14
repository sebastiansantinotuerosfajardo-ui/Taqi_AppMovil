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

export default function GastoVariableModal({ visible, onClose, onSubmit, initial = {} }) {
  const [ingreso, setIngreso] = useState("");
  const [gastoVar, setGastoVar] = useState("");
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (visible) {
      setIngreso(initial.ingresoMensual ? String(initial.ingresoMensual) : "3428.50");
      setGastoVar(initial.gastoVariableEstimado ? String(initial.gastoVariableEstimado) : "1200");
      setErrors({});
    }
  }, [visible, initial]);

  const handleSave = () => {
    const newErrors = {};
    const ingresoNum = Number(String(ingreso).replace(",", "."));
    const gastoVarNum = Number(String(gastoVar).replace(",", "."));

    if (!isFinite(ingresoNum) || ingresoNum <= 0) {
      newErrors.ingreso = "Ingresa tu ingreso mensual estimado";
    }
    if (!isFinite(gastoVarNum) || gastoVarNum < 0) {
      newErrors.gastoVar = "Ingresa un monto válido para gasto variable";
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    onSubmit({
      ingresoMensual: ingresoNum,
      gastoVariableEstimado: gastoVarNum,
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
          <Text style={styles.title}>Editar presupuesto mensual</Text>
          <Text style={styles.subtitle}>
            Ajusta tu sueldo estimado y tu gasto variable promedio para calcular tu liquidez real.
          </Text>

          <Text style={styles.label}>Ingreso mensual libre (S/)</Text>
          <AuthInput
            icon="wallet-outline"
            placeholder="3428.50"
            value={ingreso}
            onChangeText={(t) => {
              setIngreso(t);
              if (errors.ingreso) setErrors((e) => ({ ...e, ingreso: null }));
            }}
            keyboardType="numeric"
          />
          {errors.ingreso && <Text style={styles.errorText}>{errors.ingreso}</Text>}

          <Text style={styles.label}>Gasto variable promedio (S/)</Text>
          <AuthInput
            icon="cart-outline"
            placeholder="1200"
            value={gastoVar}
            onChangeText={(t) => {
              setGastoVar(t);
              if (errors.gastoVar) setErrors((e) => ({ ...e, gastoVar: null }));
            }}
            keyboardType="numeric"
          />
          {errors.gastoVar && <Text style={styles.errorText}>{errors.gastoVar}</Text>}

          <TouchableOpacity style={styles.saveButton} onPress={handleSave} activeOpacity={0.85}>
            <Text style={styles.saveText}>Guardar cambios</Text>
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
  card: { backgroundColor: colors.cream, borderRadius: 24, padding: 22 },
  title: { fontSize: 18, fontWeight: "800", color: colors.textDark },
  subtitle: { fontSize: 12, color: colors.textGrey, marginBottom: 14, lineHeight: 17 },
  label: { fontSize: 13, fontWeight: "600", color: colors.textDark, marginBottom: 8 },
  errorText: { fontSize: 12, color: colors.coral, marginTop: -8, marginBottom: 10 },
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
