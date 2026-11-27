import { AGENTE_USUARIO } from "../constants/app.js";

// Cliente de la API pública Overpass (datos de OpenStreetMap), sin nada de React Native: la red se recibe
// de fuera (inyección de dependencias) para poder probarlo en Node con servidores falsos (npm run test:mapa).
//
// Reglas del servicio público (https://wiki.openstreetmap.org/wiki/Overpass_API) que cumple este archivo:
//  - Identificar la app con la cabecera User-Agent. Con el genérico de Expo Go o de Android el servidor
//    responde "HTTP 406 Not Acceptable".
//  - Tras un 406 o un 429 ("demasiadas consultas") esperar 30 s antes de volver a pedirle a ESE servidor.
//  - No hacer consultas en paralelo: aquí se prueba un servidor a la vez.
//  - Si un servidor está saturado a veces responde 200 con la lista vacía y una nota "runtime error": eso
//    NO significa "no hay bancos cerca", así que se trata como una falla y se prueba el siguiente.

export const SERVIDORES_OVERPASS = [
  "https://overpass-api.de/api/interpreter", // principal (FOSSGIS)
  "https://overpass.private.coffee/api/interpreter", // instancia pública global alternativa
  "https://overpass.kumi.systems/api/interpreter",
];
export const TIEMPO_MAXIMO_MS = 10000;
export const ESPERA_TRAS_RECHAZO_MS = 30000;

export function crearClienteOverpass({
  servidores = SERVIDORES_OVERPASS,
  fetchFn = (...args) => fetch(...args),
  ahora = () => Date.now(),
  tiempoMaximoMs = TIEMPO_MAXIMO_MS,
  esperaMs = ESPERA_TRAS_RECHAZO_MS,
  agente = AGENTE_USUARIO, // null en la web: los navegadores no permiten cambiar el User-Agent
  registrar = () => {},
} = {}) {
  const enEspera = new Map(); // servidor → instante hasta el que no se le insiste

  async function pedir(servidor, consulta) {
    const controlador = new AbortController();
    const reloj = setTimeout(() => controlador.abort(), tiempoMaximoMs);
    try {
      const cabeceras = { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" };
      if (agente) cabeceras["User-Agent"] = agente;
      const respuesta = await fetchFn(servidor, {
        method: "POST",
        headers: cabeceras,
        body: `data=${encodeURIComponent(consulta)}`,
        signal: controlador.signal,
      });
      if (respuesta.status === 406 || respuesta.status === 429) enEspera.set(servidor, ahora() + esperaMs);
      if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`);
      const json = await respuesta.json();
      const sinDatos = !Array.isArray(json && json.elements) || json.elements.length === 0;
      if (sinDatos && json && typeof json.remark === "string" && /runtime error/i.test(json.remark)) {
        throw new Error(`Overpass saturado: ${json.remark}`);
      }
      return json;
    } finally {
      clearTimeout(reloj);
    }
  }

  // Devuelve el JSON del primer servidor que responda bien, o null si ninguno pudo.
  async function consultar(consulta) {
    for (const servidor of servidores) {
      if ((enEspera.get(servidor) || 0) > ahora()) {
        registrar(`Se omite ${servidor}: respondió "ocupado" hace poco`);
        continue;
      }
      try {
        return await pedir(servidor, consulta);
      } catch (error) {
        registrar(`Falló ${servidor}`, error);
      }
    }
    return null;
  }

  return { consultar };
}
