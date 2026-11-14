import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import colors from "../constants/colors";
import { logger } from "../services/logger";

// "Límite de errores": si una pantalla lanza un error al dibujarse, en lugar de cerrar
// toda la app se muestra este aviso con un botón para reintentar.
// Debe ser un componente de clase: React solo permite capturar errores de dibujo así.
export default class ErrorBoundary extends React.Component {
  state = { hasError: false };

  // React llama a este método cuando un componente hijo lanza un error al dibujarse.
  static getDerivedStateFromError() {
    return { hasError: true };
  }

  // Aquí se registra el error con el logger para poder revisarlo después.
  componentDidCatch(error, info) {
    logger.error("ErrorBoundary", info?.componentStack ?? "Error al dibujar", error);
  }

  reintentar = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <View style={styles.container}>
        <Ionicons name="alert-circle-outline" size={56} color={colors.coral} />
        <Text style={styles.title}>Algo salió mal</Text>
        <Text style={styles.text}>
          Ocurrió un error inesperado. Tus datos guardados siguen a salvo.
        </Text>
        <TouchableOpacity style={styles.button} onPress={this.reintentar} activeOpacity={0.85}>
          <Text style={styles.buttonText}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    backgroundColor: colors.cream,
  },
  title: { fontSize: 22, fontWeight: "800", color: colors.textDark, marginTop: 16 },
  text: {
    fontSize: 14,
    color: colors.textGrey,
    textAlign: "center",
    marginTop: 8,
    marginBottom: 24,
  },
  button: {
    backgroundColor: colors.darkBrown,
    paddingHorizontal: 28,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: { color: colors.white, fontSize: 15, fontWeight: "700" },
});
