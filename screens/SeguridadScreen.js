import React, { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert, Linking } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import { useBloqueo } from "../context/BloqueoContext";
import { almacenSeguroDisponible } from "../services/secureStore";
import { capacidadBiometrica } from "../services/biometria";
import { resetTo } from "../navigation/rootNavigation";
import { OPCIONES_TIEMPO } from "../utils/bloqueo";
import colors from "../constants/colors";

// Una fila del "estado de seguridad": icono verde si está bien, ámbar si hay algo que mejorar.
function Estado({ bien, titulo, detalle }) {
  return (
    <View style={styles.estado}>
      <Ionicons
        name={bien ? "shield-checkmark" : "alert-circle"}
        size={20}
        color={bien ? colors.success : colors.gold}
        style={styles.estadoIcono}
      />
      <View style={styles.flex1}>
        <Text style={styles.estadoTitulo}>{titulo}</Text>
        <Text style={styles.estadoDetalle}>{detalle}</Text>
      </View>
    </View>
  );
}

export default function SeguridadScreen({ navigation }) {
  const { logout } = useAuth();
  const { activado, tiempoSeg, activarBloqueo, desactivarBloqueo, cambiarTiempo, bloquearAhora } = useBloqueo();
  const [cifrado, setCifrado] = useState(null); // null = comprobando
  const [biometria, setBiometria] = useState(null);
  const [trabajando, setTrabajando] = useState(false);

  useEffect(() => {
    let activo = true;
    almacenSeguroDisponible().then((ok) => activo && setCifrado(ok));
    capacidadBiometrica().then((c) => activo && setBiometria(c));
    return () => {
      activo = false;
    };
  }, []);

  const alternarBloqueo = useCallback(
    async (quiere) => {
      if (trabajando) return;
      setTrabajando(true);
      const r = quiere ? await activarBloqueo() : await desactivarBloqueo();
      setTrabajando(false);
      if (!r.ok && !r.cancelado && r.mensaje) {
        Alert.alert("Bloqueo de la app", r.mensaje, [
          { text: "Entendido", style: "cancel" },
          ...(quiere ? [{ text: "Abrir ajustes", onPress: () => Linking.openSettings() }] : []),
        ]);
      }
    },
    [activarBloqueo, desactivarBloqueo, trabajando]
  );

  const cerrarSesion = async () => {
    await logout();
    resetTo("Login");
  };

  const tipo = biometria ? biometria.tipo : "huella o rostro";
  const puedeUsar = biometria ? biometria.disponible : false;
  const pista =
    biometria && !biometria.disponible
      ? biometria.motivo === "sin-registro"
        ? "Aún no tienes huella ni rostro registrados en el teléfono."
        : "Este dispositivo no permite huella ni rostro (en la versión web no está disponible)."
      : `Se pedirá tu ${tipo} al abrir TAQI y al volver a ella.`;

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.back}
          accessibilityRole="button"
          accessibilityLabel="Volver"
        >
          <Ionicons name="chevron-back" size={22} color={colors.darkBrown} />
        </TouchableOpacity>
        <View style={styles.flex1}>
          <Text style={styles.titulo}>Seguridad</Text>
          <Text style={styles.subtitulo}>Protege tu cuenta y tus datos</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.contenido} showsVerticalScrollIndicator={false}>
        <Text style={styles.seccion}>ESTADO</Text>
        <View style={styles.tarjeta}>
          <Estado
            bien={cifrado === true}
            titulo={cifrado === false ? "Sesión sin cifrar (versión web)" : "Sesión guardada con cifrado"}
            detalle={
              cifrado === false
                ? "Solo en la versión web se guarda sin cifrar. En la app del celular usa el almacén seguro del sistema."
                : "Tu sesión se guarda en el almacén cifrado del teléfono (Keystore en Android, Keychain en iPhone)."
            }
          />
          <View style={styles.separador} />
          <Estado
            bien
            titulo="Contraseña protegida en el servidor"
            detalle="Se guarda con bcrypt: ni siquiera nosotros podemos leerla."
          />
          <View style={styles.separador} />
          <Estado
            bien={activado}
            titulo={activado ? "Bloqueo de la app activado" : "Bloqueo de la app desactivado"}
            detalle={activado ? `Se desbloquea con tu ${tipo} o el PIN del teléfono.` : "Actívalo abajo para proteger TAQI si alguien toma tu teléfono."}
          />
        </View>

        <Text style={styles.seccion}>BLOQUEO DE LA APP</Text>
        <View style={styles.tarjeta}>
          <View style={styles.filaSwitch}>
            <Ionicons name="finger-print" size={22} color={colors.textDark} style={styles.estadoIcono} />
            <View style={styles.flex1}>
              <Text style={styles.estadoTitulo}>Bloquear con {tipo}</Text>
              <Text style={styles.estadoDetalle}>{pista}</Text>
            </View>
            <Switch
              value={activado}
              onValueChange={alternarBloqueo}
              disabled={trabajando || (!activado && !puedeUsar)}
              trackColor={{ false: colors.border, true: colors.gold }}
              thumbColor={colors.white}
              accessibilityLabel="Bloquear la aplicación con huella o rostro"
            />
          </View>

          {activado && (
            <>
              <View style={styles.separador} />
              <Text style={styles.etiqueta}>Bloquear después de salir de la app</Text>
              <View style={styles.chips}>
                {OPCIONES_TIEMPO.map((opcion) => {
                  const activa = opcion.segundos === tiempoSeg;
                  return (
                    <TouchableOpacity
                      key={opcion.segundos}
                      style={[styles.chip, activa && styles.chipActivo]}
                      onPress={() => cambiarTiempo(opcion.segundos)}
                      accessibilityRole="button"
                      accessibilityState={{ selected: activa }}
                    >
                      <Text style={[styles.chipTexto, activa && styles.chipTextoActivo]}>{opcion.etiqueta}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <TouchableOpacity style={styles.botonSecundario} onPress={bloquearAhora} accessibilityRole="button">
                <Ionicons name="lock-closed-outline" size={16} color={colors.darkBrown} />
                <Text style={styles.botonSecundarioTexto}>Bloquear ahora</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        <Text style={styles.seccion}>SESIÓN</Text>
        <View style={styles.tarjeta}>
          <TouchableOpacity style={styles.filaSwitch} onPress={cerrarSesion} accessibilityRole="button">
            <Ionicons name="log-out-outline" size={20} color={colors.coral} style={styles.estadoIcono} />
            <View style={styles.flex1}>
              <Text style={[styles.estadoTitulo, { color: colors.coral }]}>Cerrar sesión en este dispositivo</Text>
              <Text style={styles.estadoDetalle}>Borra la sesión guardada en este teléfono.</Text>
            </View>
          </TouchableOpacity>
        </View>

        <Text style={styles.nota}>
          TAQI nunca guarda tu huella ni tu rostro: la verificación la hace el sistema del teléfono y solo nos responde sí o no.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.cream },
  flex1: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingTop: 8, paddingBottom: 10, gap: 10 },
  back: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.white, alignItems: "center", justifyContent: "center" },
  titulo: { fontSize: 20, fontWeight: "800", color: colors.textDark },
  subtitulo: { fontSize: 12, color: colors.textGrey },
  contenido: { paddingHorizontal: 16, paddingBottom: 32 },
  seccion: { fontSize: 11, fontWeight: "800", color: colors.textGrey, letterSpacing: 1, marginTop: 18, marginBottom: 8, marginLeft: 4 },
  tarjeta: { backgroundColor: colors.white, borderRadius: 18, padding: 14, borderWidth: 1, borderColor: colors.border },
  estado: { flexDirection: "row", alignItems: "flex-start" },
  estadoIcono: { marginRight: 12, marginTop: 1 },
  estadoTitulo: { fontSize: 14, fontWeight: "700", color: colors.textDark },
  estadoDetalle: { fontSize: 12, color: colors.textGrey, marginTop: 2, lineHeight: 17 },
  separador: { height: 1, backgroundColor: colors.border, marginVertical: 12 },
  filaSwitch: { flexDirection: "row", alignItems: "center" },
  etiqueta: { fontSize: 12, fontWeight: "700", color: colors.textDark, marginBottom: 8 },
  chips: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  chip: { paddingHorizontal: 14, height: 34, borderRadius: 17, backgroundColor: colors.cream, justifyContent: "center", borderWidth: 1, borderColor: colors.border },
  chipActivo: { backgroundColor: colors.darkBrown, borderColor: colors.darkBrown },
  chipTexto: { fontSize: 13, fontWeight: "600", color: colors.textDark },
  chipTextoActivo: { color: colors.white },
  botonSecundario: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, height: 42, borderRadius: 12, borderWidth: 1.5, borderColor: colors.darkBrown, marginTop: 14 },
  botonSecundarioTexto: { fontSize: 14, fontWeight: "700", color: colors.darkBrown },
  nota: { fontSize: 12, color: colors.textGrey, textAlign: "center", marginTop: 20, lineHeight: 17, paddingHorizontal: 8 },
});
