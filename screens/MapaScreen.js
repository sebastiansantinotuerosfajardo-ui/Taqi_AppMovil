import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import MapaWeb from "../components/MapaWeb";
import { obtenerUbicacion, seguirUbicacion, abrirAjustes, abrirRuta, abrirBusquedaEnMapas } from "../services/location";
import { buscarLugaresCercanos } from "../services/places";
import { distanciaMetros, textoDistancia } from "../utils/geo";
import colors from "../constants/colors";

const FILTROS = [
  { clave: "todos", texto: "Todos" },
  { clave: "banco", texto: "Bancos" },
  { clave: "cajero", texto: "Cajeros" },
];

// Mensajes claros para cada motivo por el que puede fallar el GPS.
const MENSAJES = {
  permiso: {
    titulo: "Necesitamos tu ubicación",
    texto: "TAQI la usa solo mientras tienes la app abierta, para mostrarte los bancos y cajeros más cercanos.",
    boton: "Permitir ubicación",
  },
  "permiso-bloqueado": {
    titulo: "Permiso de ubicación bloqueado",
    texto: "Activa la ubicación para TAQI desde los ajustes del teléfono.",
    boton: "Abrir ajustes",
    ajustes: true,
  },
  "gps-apagado": {
    titulo: "El GPS está apagado",
    texto: "Enciende la ubicación del teléfono y vuelve a intentarlo.",
    boton: "Reintentar",
  },
  tiempo: {
    titulo: "El GPS tardó demasiado",
    texto: "Sal a un lugar abierto o revisa tu conexión y vuelve a intentarlo.",
    boton: "Reintentar",
  },
  error: {
    titulo: "No pudimos obtener tu ubicación",
    texto: "Ocurrió un problema inesperado. Intenta de nuevo.",
    boton: "Reintentar",
  },
};

export default function MapaScreen({ navigation }) {
  const [estado, setEstado] = useState("cargando"); // cargando | listo | falla
  const [motivo, setMotivo] = useState(null);
  const [usuario, setUsuario] = useState(null);
  const [lugares, setLugares] = useState([]);
  const [buscando, setBuscando] = useState(false);
  const [errorRed, setErrorRed] = useState(false);
  const [desdeCache, setDesdeCache] = useState(false); // true = se muestran datos guardados (sin conexión al servicio)
  const [filtro, setFiltro] = useState("todos");
  const [seleccionado, setSeleccionado] = useState(null);
  const [centrarEn, setCentrarEn] = useState(null);
  const [recentrar, setRecentrar] = useState(0);
  const ultimaBusqueda = useRef(null); // dónde se buscaron los lugares por última vez

  const buscar = useCallback(async (coords) => {
    ultimaBusqueda.current = coords;
    setBuscando(true);
    setErrorRed(false);
    const resultado = await buscarLugaresCercanos(coords);
    setBuscando(false);
    if (resultado.ok) {
      setLugares(resultado.lugares);
      setDesdeCache(!!resultado.desdeCache);
    } else {
      setErrorRed(true);
    }
  }, []);

  const iniciar = useCallback(async () => {
    setEstado("cargando");
    const resultado = await obtenerUbicacion();
    if (!resultado.ok) {
      setMotivo(resultado.motivo);
      setEstado("falla");
      return;
    }
    setUsuario(resultado.coords);
    setEstado("listo");
    buscar(resultado.coords);
  }, [buscar]);

  useEffect(() => {
    iniciar();
  }, [iniciar]);

  // Sigue al usuario mientras la pantalla está abierta; vuelve a buscar solo si se movió más de 300 m.
  useEffect(() => {
    if (estado !== "listo") return undefined;
    let cancelado = false;
    let dejar = () => {};
    seguirUbicacion((coords) => {
      if (cancelado) return;
      setUsuario(coords);
      const base = ultimaBusqueda.current;
      if (base && distanciaMetros(base, coords) > 300) buscar(coords);
    }).then((fn) => {
      if (cancelado) fn();
      else dejar = fn;
    });
    return () => {
      cancelado = true;
      dejar();
    };
  }, [estado, buscar]);

  const visibles = useMemo(() => {
    const lista = filtro === "todos" ? lugares : lugares.filter((l) => l.tipo === filtro);
    if (!usuario) return lista;
    return lista
      .map((l) => ({ ...l, distancia: distanciaMetros(usuario, l) }))
      .sort((a, b) => a.distancia - b.distancia);
  }, [lugares, filtro, usuario]);

  const elegir = useCallback((id) => {
    setSeleccionado(id);
  }, []);

  const alTocarLugar = (lugar) => {
    setSeleccionado(lugar.id);
    setCentrarEn({ latitude: lugar.latitude, longitude: lugar.longitude, t: Date.now() });
  };

  const mensaje = motivo ? MENSAJES[motivo] : null;

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
          <Text style={styles.titulo}>Cerca de ti</Text>
          <Text style={styles.subtitulo}>Bancos y cajeros para depositar tu ahorro</Text>
        </View>
        {estado === "listo" && (
          <TouchableOpacity
            onPress={() => setRecentrar((n) => n + 1)}
            style={styles.back}
            accessibilityRole="button"
            accessibilityLabel="Centrar el mapa en mi ubicación"
          >
            <Ionicons name="locate" size={20} color={colors.darkBrown} />
          </TouchableOpacity>
        )}
      </View>

      {estado === "cargando" && (
        <View style={styles.centro}>
          <ActivityIndicator size="large" color={colors.gold} />
          <Text style={styles.texto}>Buscando tu ubicación…</Text>
        </View>
      )}

      {estado === "falla" && mensaje && (
        <View style={styles.centro}>
          <Ionicons name="location-outline" size={46} color={colors.coral} />
          <Text style={styles.tituloFalla}>{mensaje.titulo}</Text>
          <Text style={styles.texto}>{mensaje.texto}</Text>
          <TouchableOpacity
            style={styles.boton}
            onPress={mensaje.ajustes ? abrirAjustes : iniciar}
            accessibilityRole="button"
          >
            <Text style={styles.botonTexto}>{mensaje.boton}</Text>
          </TouchableOpacity>
          {mensaje.ajustes && (
            <TouchableOpacity onPress={iniciar} accessibilityRole="button">
              <Text style={styles.enlace}>Ya lo activé, reintentar</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {estado === "listo" && (
        <View style={styles.flex1}>
          <View style={styles.mapa}>
            <MapaWeb
              usuario={usuario}
              lugares={visibles}
              seleccionado={seleccionado}
              centrarEn={centrarEn}
              recentrar={recentrar}
              onSeleccion={elegir}
            />
          </View>

          <View style={styles.filtros}>
            {FILTROS.map((f) => (
              <TouchableOpacity
                key={f.clave}
                style={[styles.chip, filtro === f.clave && styles.chipActivo]}
                onPress={() => setFiltro(f.clave)}
                accessibilityRole="button"
                accessibilityState={{ selected: filtro === f.clave }}
              >
                <Text style={[styles.chipTexto, filtro === f.clave && styles.chipTextoActivo]}>{f.texto}</Text>
              </TouchableOpacity>
            ))}
            {buscando && <ActivityIndicator size="small" color={colors.gold} style={styles.spinner} />}
          </View>

          {errorRed ? (
            <View style={styles.avisoRed}>
              <Text style={styles.avisoTexto}>No se pudo consultar los lugares cercanos. Revisa tu internet.</Text>
              <TouchableOpacity onPress={() => usuario && buscar(usuario)} accessibilityRole="button">
                <Text style={styles.enlace}>Reintentar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => usuario && abrirBusquedaEnMapas("banco", usuario)}
                accessibilityRole="button"
                accessibilityLabel="Buscar bancos cerca en la aplicación de mapas del teléfono"
              >
                <Text style={styles.enlace}>Buscar bancos en mi app de mapas</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={visibles}
              ListHeaderComponent={
                desdeCache ? (
                  <View style={styles.avisoCache}>
                    <Text style={styles.avisoCacheTexto}>
                      Sin conexión al servicio de lugares: se muestra tu última búsqueda.
                    </Text>
                    <TouchableOpacity onPress={() => usuario && buscar(usuario)} accessibilityRole="button">
                      <Text style={styles.enlace}>Actualizar</Text>
                    </TouchableOpacity>
                  </View>
                ) : null
              }
              keyExtractor={(l) => l.id}
              style={styles.lista}
              contentContainerStyle={styles.listaContenido}
              ListEmptyComponent={
                buscando ? null : (
                  <View style={styles.vacioCaja}>
                    <Text style={styles.vacio}>No encontramos lugares cerca. Prueba en otra zona.</Text>
                    <TouchableOpacity
                      onPress={() => usuario && abrirBusquedaEnMapas("banco", usuario)}
                      accessibilityRole="button"
                    >
                      <Text style={styles.enlace}>Buscar bancos en mi app de mapas</Text>
                    </TouchableOpacity>
                  </View>
                )
              }
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.fila, item.id === seleccionado && styles.filaActiva]}
                  onPress={() => alTocarLugar(item)}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel={`${item.nombre}, ${item.tipo}, a ${textoDistancia(item.distancia)}`}
                >
                  <View style={[styles.icono, item.tipo === "cajero" ? styles.iconoCajero : styles.iconoBanco]}>
                    <Ionicons name={item.tipo === "cajero" ? "cash-outline" : "business-outline"} size={18} color={colors.white} />
                  </View>
                  <View style={styles.flex1}>
                    <Text style={styles.nombre} numberOfLines={1}>{item.nombre}</Text>
                    <Text style={styles.detalle}>
                      {item.tipo === "cajero" ? "Cajero automático" : "Banco"} · {textoDistancia(item.distancia)}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => abrirRuta(item)}
                    style={styles.ruta}
                    accessibilityRole="button"
                    accessibilityLabel={`Cómo llegar a ${item.nombre}`}
                  >
                    <Ionicons name="navigate" size={16} color={colors.white} />
                  </TouchableOpacity>
                </TouchableOpacity>
              )}
            />
          )}
        </View>
      )}
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
  centro: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32, gap: 10 },
  texto: { fontSize: 13, color: colors.textGrey, textAlign: "center", lineHeight: 18 },
  tituloFalla: { fontSize: 17, fontWeight: "800", color: colors.textDark, textAlign: "center" },
  boton: { backgroundColor: colors.darkBrown, borderRadius: 14, paddingHorizontal: 22, height: 44, justifyContent: "center", marginTop: 6 },
  botonTexto: { color: colors.white, fontSize: 14, fontWeight: "700" },
  enlace: { color: colors.coral, fontSize: 13, fontWeight: "700", marginTop: 6 },
  mapa: { height: "46%", marginHorizontal: 16, marginBottom: 10 },
  filtros: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, gap: 8, marginBottom: 8 },
  chip: { paddingHorizontal: 14, height: 34, borderRadius: 17, backgroundColor: colors.white, justifyContent: "center", borderWidth: 1, borderColor: colors.border },
  chipActivo: { backgroundColor: colors.darkBrown, borderColor: colors.darkBrown },
  chipTexto: { fontSize: 13, fontWeight: "600", color: colors.textDark },
  chipTextoActivo: { color: colors.white },
  spinner: { marginLeft: 6 },
  lista: { flex: 1 },
  listaContenido: { paddingHorizontal: 16, paddingBottom: 20, gap: 8 },
  vacio: { textAlign: "center", color: colors.textGrey, fontSize: 13 },
  vacioCaja: { alignItems: "center", marginTop: 20, gap: 4 },
  avisoCache: { backgroundColor: colors.white, borderRadius: 12, padding: 10, marginBottom: 4, alignItems: "center", borderWidth: 1, borderColor: colors.border },
  avisoCacheTexto: { fontSize: 12, color: colors.textGrey, textAlign: "center" },
  fila: { flexDirection: "row", alignItems: "center", backgroundColor: colors.white, borderRadius: 16, padding: 12, gap: 12, borderWidth: 1.5, borderColor: "transparent" },
  filaActiva: { borderColor: colors.gold },
  icono: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  iconoBanco: { backgroundColor: colors.gold },
  iconoCajero: { backgroundColor: colors.success },
  nombre: { fontSize: 14, fontWeight: "700", color: colors.textDark },
  detalle: { fontSize: 12, color: colors.textGrey, marginTop: 2 },
  ruta: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.darkBrown, alignItems: "center", justifyContent: "center" },
  avisoRed: { marginHorizontal: 16, backgroundColor: colors.coralLight, borderRadius: 14, padding: 14, alignItems: "center", gap: 4 },
  avisoTexto: { fontSize: 13, color: colors.coral, textAlign: "center" },
});
