import React, { useEffect, useState } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Image,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AuthInput from "./AuthInput";
import colors from "../constants/colors";
import { tomarFoto } from "../services/camera";

// Modal para registrar un aporte (dinero que se suma a una meta)
export default function AporteModal({ visible, onClose, onSubmit, goalTitle }) {
  const [amount, setAmount] = useState("");
  const [error, setError] = useState(null);
  const [fotoUri, setFotoUri] = useState(null);

  useEffect(() => {
    if (visible) {
      setAmount("");
      setError(null);
      setFotoUri(null);
    }
  }, [visible]);

  const handleSave = () => {
    const value = Number(String(amount).replace(",", "."));
    if (!isFinite(value) || value <= 0) {
      setError("Ingresa un monto mayor a 0");
      return;
    }
    onSubmit(value, fotoUri);
    onClose();
  };

  const handleFoto = async () => {
    const resultado = await tomarFoto();
    if (resultado.ok) {
      setFotoUri(resultado.uri);
    } else if (resultado.motivo === "permiso") {
      Alert.alert("Permiso de cámara", "Activa el permiso de cámara en los ajustes del teléfono para adjuntar fotos.");
    } else if (resultado.motivo === "error") {
      Alert.alert("Error", "No se pudo abrir la cámara.");
    }
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

          {fotoUri && (
            <View style={styles.previewContainer}>
              <Image source={{ uri: fotoUri }} style={styles.preview} />
              <TouchableOpacity
                style={styles.removePhotoButton}
                onPress={() => setFotoUri(null)}
                activeOpacity={0.8}
              >
                <Ionicons name="trash-outline" size={14} color={colors.coral} />
                <Text style={styles.removePhotoText}>Quitar comprobante</Text>
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity style={styles.photoButton} onPress={handleFoto} activeOpacity={0.85}>
            <Ionicons name="camera-outline" size={18} color={colors.darkBrown} />
            <Text style={styles.photoText}>
              {fotoUri ? "Cambiar foto del comprobante" : "Adjuntar comprobante (Opcional)"}
            </Text>
          </TouchableOpacity>
          <Text style={styles.optionalHint}>
            * El registro del monto es manual. Adjuntar un comprobante es solo un respaldo opcional.
          </Text>

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
  previewContainer: { marginBottom: 10 },
  preview: { width: "100%", height: 140, borderRadius: 12, marginBottom: 6 },
  removePhotoButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-end",
    gap: 4,
    paddingVertical: 4,
  },
  removePhotoText: { color: colors.coral, fontSize: 12, fontWeight: "600" },
  photoButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.darkBrown,
    marginBottom: 6,
  },
  photoText: { color: colors.darkBrown, fontSize: 13, fontWeight: "700" },
  optionalHint: {
    fontSize: 11,
    color: colors.textGrey,
    fontStyle: "italic",
    marginBottom: 12,
    lineHeight: 15,
  },
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
