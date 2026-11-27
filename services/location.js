import * as Location from "expo-location";
import { Linking, Platform } from "react-native";
import { logger } from "./logger";

// Ubicación GPS del usuario (solo mientras la app está abierta).
// Documentación usada: https://docs.expo.dev/versions/v58.0.0/sdk/location/
//
// Todas las funciones devuelven { ok: true, ... } o { ok: false, motivo } con el porqué:
//   "permiso"          → el usuario negó el permiso (se puede volver a pedir)
//   "permiso-bloqueado"→ el usuario marcó "no volver a preguntar" (solo se activa en Ajustes)
//   "gps-apagado"      → la ubicación del teléfono está desactivada
//   "tiempo"           → el GPS no respondió a tiempo
//   "error"            → cualquier otro fallo
const TIEMPO_MAXIMO_MS = 15000;

function conTiempo(promesa, ms) {
  return new Promise((resolve, reject) => {
    const reloj = setTimeout(() => reject(new Error("tiempo")), ms);
    promesa.then(
      (valor) => {
        clearTimeout(reloj);
        resolve(valor);
      },
      (error) => {
        clearTimeout(reloj);
        reject(error);
      }
    );
  });
}

// Pide el permiso de ubicación si todavía no se tiene.
export async function pedirPermisoUbicacion() {
  try {
    const actual = await Location.getForegroundPermissionsAsync();
    if (actual.granted) return { ok: true };
    const nuevo = await Location.requestForegroundPermissionsAsync();
    if (nuevo.granted) return { ok: true };
    return { ok: false, motivo: nuevo.canAskAgain ? "permiso" : "permiso-bloqueado" };
  } catch (error) {
    logger.error("location", "No se pudo pedir el permiso de ubicación", error);
    return { ok: false, motivo: "error" };
  }
}

// Devuelve la ubicación actual: { ok: true, coords: { latitude, longitude, accuracy } }.
export async function obtenerUbicacion() {
  const permiso = await pedirPermisoUbicacion();
  if (!permiso.ok) return permiso;

  try {
    if (!(await Location.hasServicesEnabledAsync())) return { ok: false, motivo: "gps-apagado" };

    // Una posición reciente (menos de 1 minuto) se usa enseguida para no hacer esperar al usuario.
    const reciente = await Location.getLastKnownPositionAsync({ maxAge: 60000, requiredAccuracy: 200 });
    if (reciente) return { ok: true, coords: reciente.coords };

    const posicion = await conTiempo(
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
      TIEMPO_MAXIMO_MS
    );
    return { ok: true, coords: posicion.coords };
  } catch (error) {
    if (error && error.message === "tiempo") return { ok: false, motivo: "tiempo" };
    logger.warn("location", "No se pudo leer la ubicación", error);
    return { ok: false, motivo: "error" };
  }
}

// Sigue al usuario mientras se mueve. Devuelve una función para dejar de seguirlo.
export async function seguirUbicacion(alCambiar) {
  try {
    const suscripcion = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.Balanced, distanceInterval: 15 },
      (posicion) => alCambiar(posicion.coords),
      (error) => logger.warn("location", "Se perdió el seguimiento de ubicación", error)
    );
    return () => suscripcion.remove();
  } catch (error) {
    logger.warn("location", "No se pudo seguir la ubicación", error);
    return () => {};
  }
}

// Abre los ajustes de la app (para activar el permiso cuando quedó bloqueado).
export function abrirAjustes() {
  return Linking.openSettings();
}

// Abre la app de mapas del teléfono con la ruta hacia un lugar.
export function abrirRuta(lugar) {
  const nombre = encodeURIComponent(lugar.nombre);
  const url =
    Platform.OS === "ios"
      ? `http://maps.apple.com/?daddr=${lugar.latitude},${lugar.longitude}&q=${nombre}`
      : `geo:0,0?q=${lugar.latitude},${lugar.longitude}(${nombre})`;
  return Linking.openURL(url).catch((error) =>
    logger.warn("location", "No se pudo abrir la app de mapas", error)
  );
}

// Plan B: abre la app de mapas del teléfono buscando un término ("banco", "cajero") cerca del usuario.
// Funciona aunque el servicio público de lugares no responda.
export function abrirBusquedaEnMapas(termino, origen) {
  const q = encodeURIComponent(termino);
  const url =
    Platform.OS === "ios"
      ? `http://maps.apple.com/?q=${q}&sll=${origen.latitude},${origen.longitude}`
      : `geo:${origen.latitude},${origen.longitude}?q=${q}`;
  return Linking.openURL(url).catch((error) =>
    logger.warn("location", "No se pudo abrir la app de mapas", error)
  );
}
