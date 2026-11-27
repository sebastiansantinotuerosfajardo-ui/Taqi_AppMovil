import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Switch, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppData } from "../context/AppDataContext";
import { listarProgramadas, pedirAlarmaExacta, pedirPermiso, programarEnFecha } from "../services/notifications";
import { crearDeudasDemo, esDemo } from "../utils/demo";
import { logger } from "../services/logger";
import colors from "../constants/colors";

const HORA_MIN = 6;
const HORA_MAX = 22;

const formatoHora = (h) => `${h}:00`;
const dos = (n) => String(n).padStart(2, "0");
const formatoFecha = (f) => `${dos(f.getDate())}/${dos(f.getMonth() + 1)} ${dos(f.getHours())}:${dos(f.getMinutes())}`;

// Ajustes de los avisos de vencimiento + herramientas para la demostración.
export default function AvisosCard() {
  const { ajustes, setAjuste, gastosFijos, addGastoFijo, deleteGastoFijo } = useAppData();
  const hayDemo = gastosFijos.some(esDemo);

  const cambiarHora = (delta) => {
    const nueva = Math.min(HORA_MAX, Math.max(HORA_MIN, ajustes.horaAviso + delta));
    setAjuste("horaAviso", nueva);
  };

  const alCambiarPuntual = async (valor) => {
    setAjuste("avisoPuntual", valor);
    if (valor) {
      const permiso = await pedirAlarmaExacta();
      if (!permiso.granted && !permiso.noDisponible) {
        Alert.alert(
          "Alarmas y recordatorios",
          "Para que los avisos lleguen a la hora exacta, permite «Alarmas y recordatorios» para TAQI en los ajustes del teléfono."
        );
      }
    }
  };

  const verProgramados = async () => {
    try {
      const lista = await listarProgramadas();
      const conFecha = lista
        .filter((a) => a.fecha)
        .sort((a, b) => a.fecha - b.fecha)
        .slice(0, 8);
      const texto =
        conFecha.length > 0
          ? conFecha.map((a) => `${formatoFecha(a.fecha)}  ${a.titulo}`).join("\n")
          : "No hay avisos de vencimiento pendientes. Activa las notificaciones y agrega gastos fijos.";
      Alert.alert(`Avisos pendientes (${lista.length})`, texto);
    } catch (error) {
      logger.error("avisos", "No se pudieron listar los avisos", error);
      Alert.alert("Error", "No se pudo leer la lista de avisos.");
    }
  };

  // Programa un aviso para dentro de 1 minuto con el MISMO mecanismo que los vencimientos,
  // para medir si llega a la hora exacta o con retraso.
  const probarPuntual = async () => {
    try {
      const permiso = await pedirPermiso();
      if (!permiso.granted) {
        Alert.alert("Permiso de notificaciones", "Activa las notificaciones para poder probar el aviso.");
        return;
      }
      const cuando = new Date(Date.now() + 60000);
      const hora = `${dos(cuando.getHours())}:${dos(cuando.getMinutes())}:${dos(cuando.getSeconds())}`;
      await programarEnFecha(cuando, "Prueba de aviso puntual", `Debía llegar a las ${hora}. Mira a qué hora llegó realmente.`, ajustes.avisoPuntual);
      Alert.alert("Aviso programado", `Debe llegar a las ${hora}. Minimiza la app y espera.`);
    } catch (error) {
      logger.error("avisos", "No se pudo programar la prueba puntual", error);
      Alert.alert("Error", "No se pudo programar la prueba.");
    }
  };

  const cargarDemo = () => {
    gastosFijos.filter(esDemo).forEach((g) => deleteGastoFijo(g.id));
    crearDeudasDemo(new Date()).forEach((g) => addGastoFijo(g));
    Alert.alert(
      "Deudas de demostración",
      "Se agregaron 4 deudas: vencen jueves, viernes, sábado y domingo (te avisan miércoles, jueves, viernes y sábado). Activa las notificaciones para recibir los avisos."
    );
  };

  const quitarDemo = () => {
    gastosFijos.filter(esDemo).forEach((g) => deleteGastoFijo(g.id));
  };

  return (
    <View style={styles.card}>
      <Text style={styles.titulo}>Avisos de vencimiento</Text>

      <View style={[styles.fila, styles.borde]}>
        <Ionicons name="time-outline" size={18} color={colors.textDark} style={styles.icono} />
        <View style={styles.flex1}>
          <Text style={styles.etiqueta}>Hora del aviso</Text>
          <Text style={styles.pista}>Te avisamos el día anterior al vencimiento</Text>
        </View>
        <TouchableOpacity
          style={styles.paso}
          onPress={() => cambiarHora(-1)}
          accessibilityRole="button"
          accessibilityLabel="Adelantar una hora el aviso"
        >
          <Ionicons name="remove" size={16} color={colors.darkBrown} />
        </TouchableOpacity>
        <Text style={styles.hora} accessibilityLabel={`Hora del aviso: ${formatoHora(ajustes.horaAviso)}`}>
          {formatoHora(ajustes.horaAviso)}
        </Text>
        <TouchableOpacity
          style={styles.paso}
          onPress={() => cambiarHora(1)}
          accessibilityRole="button"
          accessibilityLabel="Atrasar una hora el aviso"
        >
          <Ionicons name="add" size={16} color={colors.darkBrown} />
        </TouchableOpacity>
      </View>

      <View style={[styles.fila, styles.borde]}>
        <Ionicons name="alarm-outline" size={18} color={colors.textDark} style={styles.icono} />
        <View style={styles.flex1}>
          <Text style={styles.etiqueta}>Avisos puntuales</Text>
          <Text style={styles.pista}>Llegan a la hora exacta (muestra un ícono de alarma)</Text>
        </View>
        <Switch
          value={ajustes.avisoPuntual}
          onValueChange={alCambiarPuntual}
          trackColor={{ false: colors.border, true: colors.gold }}
          thumbColor={colors.white}
        />
      </View>

      <TouchableOpacity style={[styles.fila, styles.borde]} onPress={verProgramados} accessibilityRole="button">
        <Ionicons name="list-outline" size={18} color={colors.textDark} style={styles.icono} />
        <Text style={[styles.etiqueta, styles.flex1]}>Ver avisos pendientes</Text>
        <Ionicons name="chevron-forward" size={16} color={colors.textGrey} />
      </TouchableOpacity>

      <TouchableOpacity style={[styles.fila, styles.borde]} onPress={probarPuntual} accessibilityRole="button">
        <Ionicons name="stopwatch-outline" size={18} color={colors.textDark} style={styles.icono} />
        <View style={styles.flex1}>
          <Text style={styles.etiqueta}>Probar aviso puntual</Text>
          <Text style={styles.pista}>Llega en 1 minuto: compara la hora programada con la real</Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={colors.textGrey} />
      </TouchableOpacity>

      <TouchableOpacity style={[styles.fila, hayDemo && styles.borde]} onPress={cargarDemo} accessibilityRole="button">
        <Ionicons name="flask-outline" size={18} color={colors.gold} style={styles.icono} />
        <View style={styles.flex1}>
          <Text style={styles.etiqueta}>Cargar deudas de demostración</Text>
          <Text style={styles.pista}>Una por día de aviso: miércoles a sábado</Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={colors.textGrey} />
      </TouchableOpacity>

      {hayDemo && (
        <TouchableOpacity style={styles.fila} onPress={quitarDemo} accessibilityRole="button">
          <Ionicons name="trash-outline" size={18} color={colors.coral} style={styles.icono} />
          <Text style={[styles.etiqueta, styles.flex1, { color: colors.coral }]}>Quitar deudas de demostración</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.white, borderRadius: 18, marginBottom: 18, paddingTop: 14 },
  titulo: { fontSize: 12, fontWeight: "800", color: colors.textGrey, letterSpacing: 0.6, paddingHorizontal: 16, marginBottom: 2, textTransform: "uppercase" },
  fila: { flexDirection: "row", alignItems: "center", paddingVertical: 14, paddingHorizontal: 16 },
  borde: { borderBottomWidth: 1, borderBottomColor: colors.border },
  flex1: { flex: 1 },
  icono: { marginRight: 12 },
  etiqueta: { fontSize: 14, color: colors.textDark, fontWeight: "600" },
  pista: { fontSize: 11, color: colors.textGrey, marginTop: 2 },
  paso: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.cream, alignItems: "center", justifyContent: "center" },
  hora: { width: 48, textAlign: "center", fontSize: 14, fontWeight: "800", color: colors.darkBrown },
});
