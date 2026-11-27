import React, { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, BackHandler } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import { useBloqueo } from "../context/BloqueoContext";
import { resetTo } from "../navigation/rootNavigation";
import colors from "../constants/colors";

// Pantalla que cubre TODA la app mientras está bloqueada. Pide la huella o el rostro automáticamente.
// Si la biometría deja de funcionar (por ejemplo, el usuario borró sus huellas), siempre queda
// la salida "Cerrar sesión" para no quedarse fuera de la app.
export default function BloqueoOverlay() {
  const { bloqueada, desbloquear } = useBloqueo();
  const { logout } = useAuth();
  const [verificando, setVerificando] = useState(false);
  const [mensaje, setMensaje] = useState("");

  const intentar = useCallback(async () => {
    setVerificando(true);
    setMensaje("");
    const r = await desbloquear();
    setVerificando(false);
    if (!r.ok && !r.cancelado && r.mensaje) setMensaje(r.mensaje);
  }, [desbloquear]);

  // Una sola vez por bloqueo se pide la huella sin que el usuario toque nada
  useEffect(() => {
    if (!bloqueada) return undefined;
    const espera = setTimeout(intentar, 350);
    return () => clearTimeout(espera);
  }, [bloqueada, intentar]);

  // Con la app bloqueada, el botón "atrás" de Android no debe mostrar la pantalla de abajo
  useEffect(() => {
    if (!bloqueada) return undefined;
    const suscripcion = BackHandler.addEventListener("hardwareBackPress", () => true);
    return () => suscripcion.remove();
  }, [bloqueada]);

  const cerrarSesion = async () => {
    await logout();
    resetTo("Login");
  };

  if (!bloqueada) return null;

  return (
    <View style={styles.cubierta} accessibilityViewIsModal importantForAccessibility="yes">
      <StatusBar style="light" />
      <SafeAreaView style={styles.contenido}>
        <View style={styles.centro}>
          <View style={styles.candado}>
            <Ionicons name="lock-closed" size={34} color={colors.darkBrown} />
          </View>
          <Text style={styles.titulo}>TAQI está bloqueada</Text>
          <Text style={styles.texto}>Verifica tu identidad para ver tus metas y tus gastos.</Text>
          {mensaje ? <Text style={styles.error}>{mensaje}</Text> : null}
          <TouchableOpacity
            style={styles.boton}
            onPress={intentar}
            disabled={verificando}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Desbloquear con huella, rostro o PIN"
          >
            {verificando ? (
              <ActivityIndicator color={colors.darkBrown} />
            ) : (
              <Text style={styles.botonTexto}>Desbloquear</Text>
            )}
          </TouchableOpacity>
        </View>
        <TouchableOpacity onPress={cerrarSesion} style={styles.salida} accessibilityRole="button">
          <Text style={styles.salidaTexto}>Cerrar sesión</Text>
        </TouchableOpacity>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  cubierta: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.darkBrown, zIndex: 1000, elevation: 1000 },
  contenido: { flex: 1, paddingHorizontal: 28 },
  centro: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  candado: { width: 76, height: 76, borderRadius: 38, backgroundColor: colors.goldLight, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  titulo: { fontSize: 22, fontWeight: "800", color: colors.cream, textAlign: "center" },
  texto: { fontSize: 14, color: colors.goldLight, textAlign: "center", lineHeight: 20 },
  error: { fontSize: 13, color: colors.coral, textAlign: "center", backgroundColor: colors.coralLight, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, overflow: "hidden" },
  boton: { backgroundColor: colors.gold, borderRadius: 14, minWidth: 200, height: 50, alignItems: "center", justifyContent: "center", marginTop: 8 },
  botonTexto: { color: colors.white, fontSize: 16, fontWeight: "800" },
  salida: { alignItems: "center", paddingVertical: 18 },
  salidaTexto: { color: colors.goldLight, fontSize: 14, fontWeight: "700" },
});
