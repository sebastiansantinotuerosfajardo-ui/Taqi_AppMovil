import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator, Linking, TouchableOpacity } from "react-native";
import { WebView } from "react-native-webview";
import colors from "../constants/colors";
import { HTML_MAPA, URL_PROYECTO, AGENTE_USUARIO, enlacePermitido } from "./mapaHtml";

// Mapa con Leaflet + mapa base de OpenStreetMap, dentro de un WebView.
// Se eligió esta opción porque no necesita claves de Google y funciona igual en Expo Go y en la APK.
// La página del mapa (HTML, fuentes de mapa base y reglas de OpenStreetMap) está en mapaHtml.js.
// La app y el mapa se comunican con mensajes:
//   app → mapa: window.actualizar({ usuario, lugares, seleccionado })
//   mapa → app: { tipo: "listo" | "seleccion" | "sin-mapa" | "mapa-base" | "enlace" }
export default function MapaWeb({ usuario, lugares, seleccionado, centrarEn, recentrar, onSeleccion }) {
  const web = useRef(null);
  const [listo, setListo] = useState(false);
  const [sinMapa, setSinMapa] = useState(false);
  const [sinBase, setSinBase] = useState(false); // el mapa funciona pero no llegan las imágenes del fondo
  const [intento, setIntento] = useState(0);

  const datos = useMemo(
    () => JSON.stringify({ usuario, lugares, seleccionado, centrarEn, recentrar }),
    [usuario, lugares, seleccionado, centrarEn, recentrar]
  );

  useEffect(() => {
    if (listo && web.current) web.current.injectJavaScript(`window.actualizar(${datos}); true;`);
  }, [listo, datos]);

  const alRecibir = useCallback(
    (evento) => {
      try {
        const mensaje = JSON.parse(evento.nativeEvent.data);
        if (mensaje.tipo === "listo") setListo(true);
        if (mensaje.tipo === "sin-mapa") setSinMapa(true);
        if (mensaje.tipo === "mapa-base") setSinBase(mensaje.ok === false);
        if (mensaje.tipo === "enlace" && enlacePermitido(mensaje.url)) Linking.openURL(mensaje.url).catch(() => {});
        if (mensaje.tipo === "seleccion" && onSeleccion) onSeleccion(mensaje.id);
      } catch {
        // mensaje que no es del mapa: se ignora
      }
    },
    [onSeleccion]
  );

  // Vuelve a cargar la página del mapa (por ejemplo, cuando regresó el internet).
  const reintentar = useCallback(() => {
    setListo(false);
    setSinMapa(false);
    setSinBase(false);
    setIntento((n) => n + 1);
  }, []);

  if (sinMapa) {
    return (
      <View style={[styles.contenedor, styles.centro]}>
        <Text style={styles.sinMapaTitulo}>No se pudo cargar el mapa</Text>
        <Text style={styles.sinMapaTexto}>Revisa tu conexión a internet. La lista de abajo sigue funcionando.</Text>
        <TouchableOpacity onPress={reintentar} accessibilityRole="button" accessibilityLabel="Reintentar cargar el mapa">
          <Text style={styles.reintentar}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.contenedor}>
      {/* baseUrl: dirección https real de la página; OpenStreetMap exige saber de dónde viene cada petición (Referer).
          applicationNameForUserAgent: identifica la app ante el servidor de mapas (también lo exige su política). */}
      <WebView
        key={intento}
        ref={web}
        originWhitelist={["*"]}
        source={{ html: HTML_MAPA, baseUrl: URL_PROYECTO }}
        applicationNameForUserAgent={AGENTE_USUARIO}
        javaScriptEnabled
        domStorageEnabled
        onMessage={alRecibir}
        onError={() => setSinMapa(true)}
        onHttpError={() => setSinMapa(true)}
        style={styles.web}
        accessibilityLabel="Mapa con tu ubicación y los bancos y cajeros cercanos"
      />
      {!listo && (
        <View style={[StyleSheet.absoluteFill, styles.centro, styles.cargando]}>
          <ActivityIndicator color={colors.gold} />
          <Text style={styles.sinMapaTexto}>Cargando mapa…</Text>
        </View>
      )}
      {sinBase && (
        <View style={styles.aviso} accessibilityRole="alert">
          <Text style={styles.avisoTexto}>
            No llegan las imágenes del mapa (internet lento o servicio ocupado). Los lugares y la lista siguen funcionando.
          </Text>
          <TouchableOpacity onPress={reintentar} accessibilityRole="button" accessibilityLabel="Reintentar cargar el mapa">
            <Text style={styles.reintentar}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, borderRadius: 20, overflow: "hidden", backgroundColor: colors.cream },
  web: { flex: 1, backgroundColor: colors.cream },
  centro: { alignItems: "center", justifyContent: "center", padding: 20 },
  cargando: { backgroundColor: colors.cream },
  sinMapaTitulo: { fontSize: 15, fontWeight: "800", color: colors.textDark, marginBottom: 6 },
  sinMapaTexto: { fontSize: 12, color: colors.textGrey, textAlign: "center", marginTop: 6 },
  reintentar: { fontSize: 13, fontWeight: "800", color: colors.coral, marginTop: 10, textAlign: "center" },
  aviso: {
    position: "absolute",
    left: 10,
    right: 10,
    top: 10,
    padding: 10,
    borderRadius: 12,
    backgroundColor: colors.coralLight,
    borderWidth: 1,
    borderColor: colors.coral,
  },
  avisoTexto: { fontSize: 12, color: colors.textDark, textAlign: "center" },
});
