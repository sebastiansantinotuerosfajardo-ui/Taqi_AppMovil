// Lógica pura (sin red ni pantallas) de la búsqueda de bancos y cajeros.
// Está separada para poder probarla con Node: npm run test:mapa
import { distanciaMetros } from "./geo.js";

export const MAXIMO_LUGARES = 25;

// Consulta en lenguaje Overpass QL: bancos (puntos y edificios) y cajeros automáticos alrededor de un punto.
export function consultaOverpass(latitude, longitude, radio) {
  const zona = `(around:${radio},${latitude},${longitude})`;
  return `[out:json][timeout:10];(node["amenity"="bank"]${zona};way["amenity"="bank"]${zona};node["amenity"="atm"]${zona};);out center ${MAXIMO_LUGARES * 2};`;
}

// Convierte la respuesta de Overpass en una lista simple y ordenada por cercanía.
export function interpretarRespuesta(json, origen) {
  const elementos = Array.isArray(json && json.elements) ? json.elements : [];
  const vistos = new Set();
  const lugares = [];
  for (const el of elementos) {
    const latitude = el.lat !== undefined ? el.lat : el.center && el.center.lat;
    const longitude = el.lon !== undefined ? el.lon : el.center && el.center.lon;
    if (typeof latitude !== "number" || typeof longitude !== "number") continue;
    const etiquetas = el.tags || {};
    const tipo = etiquetas.amenity === "atm" ? "cajero" : "banco";
    const nombre = etiquetas.name || etiquetas.brand || etiquetas.operator || (tipo === "cajero" ? "Cajero automático" : "Banco");
    const clave = `${tipo}|${nombre}|${latitude.toFixed(4)}|${longitude.toFixed(4)}`;
    if (vistos.has(clave)) continue;
    vistos.add(clave);
    lugares.push({
      id: `${el.type || "n"}${el.id}`,
      tipo,
      nombre,
      latitude,
      longitude,
      distancia: distanciaMetros(origen, { latitude, longitude }),
    });
  }
  return lugares.sort((a, b) => a.distancia - b.distancia).slice(0, MAXIMO_LUGARES);
}

// ---- Memoria de la última búsqueda (plan B si el servicio público de lugares no responde) ----
export const CACHE_MAX_EDAD_MS = 24 * 60 * 60 * 1000; // 24 horas
export const CACHE_MAX_DISTANCIA_M = 1000; // solo sirve si sigues cerca de donde se guardó

// Redondea a 3 decimales (~110 m): no hace falta guardar tu posición exacta.
const redondear = (n) => Math.round(n * 1000) / 1000;

export function crearEntradaCache(origen, lugares, radio, ahora = Date.now()) {
  return {
    origen: { latitude: redondear(origen.latitude), longitude: redondear(origen.longitude) },
    radio,
    guardadoEn: ahora,
    lugares: lugares.map((l) => ({ id: l.id, tipo: l.tipo, nombre: l.nombre, latitude: l.latitude, longitude: l.longitude })),
  };
}

// Devuelve { lugares, radio, guardadoEn } si la memoria sirve para esta posición; si no, null.
export function lugaresDeCache(entrada, origen, ahora = Date.now()) {
  if (!entrada || !Array.isArray(entrada.lugares) || !entrada.origen || typeof entrada.guardadoEn !== "number") return null;
  const edad = ahora - entrada.guardadoEn;
  if (edad < 0 || edad > CACHE_MAX_EDAD_MS) return null;
  if (distanciaMetros(entrada.origen, origen) > CACHE_MAX_DISTANCIA_M) return null;
  const lugares = entrada.lugares
    .filter((l) => typeof l.latitude === "number" && typeof l.longitude === "number")
    .map((l) => ({ ...l, distancia: distanciaMetros(origen, l) }))
    .sort((a, b) => a.distancia - b.distancia);
  if (lugares.length === 0) return null;
  return { lugares, radio: entrada.radio, guardadoEn: entrada.guardadoEn };
}
