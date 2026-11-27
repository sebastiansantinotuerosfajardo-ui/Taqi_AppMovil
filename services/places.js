import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { consultaOverpass, interpretarRespuesta, crearEntradaCache, lugaresDeCache } from "../utils/lugares";
import { crearClienteOverpass } from "../utils/overpass";
import { AGENTE_USUARIO } from "../constants/app";
import { logger } from "./logger";

// Bancos y cajeros automáticos cercanos, desde OpenStreetMap mediante la API pública Overpass.
// (API externa gratuita y sin clave: https://wiki.openstreetmap.org/wiki/Overpass_API)
// Como es un servicio público puede estar lento o rechazar apps que no se identifican: utils/overpass.js manda
// el User-Agent de TAQI, prueba tres servidores en orden y respeta la espera que piden tras un 406/429.
// Si todos fallan, se muestra la última búsqueda guardada (si fue hace menos de 24 h y estás a menos de 1 km).
const CLAVE_CACHE = "@taqi:lugares-cercanos";

// En la web el navegador no deja cambiar el User-Agent, así que ahí no se manda.
const overpass = crearClienteOverpass({
  agente: Platform.OS === "web" ? null : AGENTE_USUARIO,
  registrar: (mensaje, error) => logger.warn("places", mensaje, error),
});

export { interpretarRespuesta };

async function leerCache() {
  try {
    const crudo = await AsyncStorage.getItem(CLAVE_CACHE);
    return crudo ? JSON.parse(crudo) : null;
  } catch (error) {
    logger.warn("places", "No se pudo leer la última búsqueda guardada", error);
    return null;
  }
}

async function guardarCache(entrada) {
  try {
    await AsyncStorage.setItem(CLAVE_CACHE, JSON.stringify(entrada));
  } catch (error) {
    logger.warn("places", "No se pudo guardar la búsqueda", error);
  }
}

// Busca lugares alrededor de { latitude, longitude }. Si no hay ninguno en 2 km amplía a 5 km.
// Devuelve { ok: true, lugares, radio } (con desdeCache: true si son datos guardados)
// o { ok: false, motivo: "red" }.
export async function buscarLugaresCercanos(origen) {
  for (const radio of [2000, 5000]) {
    const json = await overpass.consultar(consultaOverpass(origen.latitude, origen.longitude, radio));
    if (!json) {
      const guardada = lugaresDeCache(await leerCache(), origen);
      if (guardada) return { ok: true, lugares: guardada.lugares, radio: guardada.radio, desdeCache: true };
      return { ok: false, motivo: "red" };
    }
    const lugares = interpretarRespuesta(json, origen);
    if (lugares.length > 0 || radio === 5000) {
      if (lugares.length > 0) guardarCache(crearEntradaCache(origen, lugares, radio));
      return { ok: true, lugares, radio };
    }
  }
  return { ok: true, lugares: [], radio: 5000 };
}
