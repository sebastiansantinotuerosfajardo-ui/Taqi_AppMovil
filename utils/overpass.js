import { AGENTE_USUARIO } from "../constants/app.js";

// Cliente de la API pública Overpass (datos de OpenStreetMap), sin nada de React Native: la red y el reloj se
// reciben de fuera (inyección de dependencias) para poder probarlo en Node con servidores y relojes falsos
// (npm run test:mapa).
//
// Los servidores públicos son gratuitos y a veces están saturados: responden 502/504, tardan o se cuelgan.
// Para que el mapa no dependa de que justo el primero funcione se usan "peticiones escalonadas":
//  1. Se le pide al primer servidor.
//  2. Si falla, se le pide al siguiente AL INSTANTE; si solo está lento, a los 2 s (ESCALONADO_MS) se le pide
//     también al siguiente, sin soltar el anterior.
//  3. Gana la primera respuesta válida y se cancelan las demás.
// Así, con un servidor caído la lista tarda lo que tarda el que sí responde, no la suma de las esperas.
//
// Reglas del servicio público (https://wiki.openstreetmap.org/wiki/Overpass_API) que cumple este archivo:
//  - Identificar la app con la cabecera User-Agent. Con el genérico de Expo Go o de Android el servidor
//    responde "HTTP 406 Not Acceptable".
//  - Tras un 406 o un 429 ("demasiadas consultas") esperar 30 s antes de volver a pedirle a ESE servidor.
//  - Cada búsqueda le pide a cada servidor UNA sola vez (el paralelismo es entre servidores distintos), y una
//    consulta idéntica que ya está en curso se reutiliza: tocar "Reintentar" varias veces seguidas no multiplica
//    las peticiones.
//  - Si un servidor está saturado a veces responde 200 con la lista vacía y una nota "runtime error": eso
//    NO significa "no hay bancos cerca", así que se trata como una falla y se prueba el siguiente.

// Servidores globales, en el orden en que se prueban.
export const SERVIDORES_OVERPASS = [
  "https://overpass-api.de/api/interpreter", // principal (FOSSGIS, Alemania)
  "https://overpass.private.coffee/api/interpreter", // global; antes se llamaba overpass.kumi.systems (es el mismo)
];

// Servidores regionales (dresel.systems): solo tienen los datos de su zona, así que solo se usan si estás dentro
// de ella (si no, devolverían "no hay nada"). La zona es un rectángulo prudente que deja fuera Panamá y el Caribe.
export const SERVIDORES_REGIONALES = [
  {
    nombre: "Sudamérica",
    url: "https://ovp.dresel.systems/api-sa/interpreter",
    zona: { latMin: -56, latMax: 5, lonMin: -82, lonMax: -34 },
  },
];

export const TIEMPO_MAXIMO_MS = 10000; // límite para cada servidor
export const ESCALONADO_MS = 2000; // si un servidor no contestó en este tiempo, se le pide también al siguiente
export const ESPERA_TRAS_RECHAZO_MS = 30000;

export function dentroDeZona(origen, zona) {
  const lat = origen && origen.latitude;
  const lon = origen && origen.longitude;
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return false;
  return lat >= zona.latMin && lat <= zona.latMax && lon >= zona.lonMin && lon <= zona.lonMax;
}

// Servidores a probar, en orden: el principal, después el regional (solo si estás en su zona) y al final los demás.
export function servidoresPara(origen, servidores = SERVIDORES_OVERPASS, regionales = SERVIDORES_REGIONALES) {
  const cercanos = regionales.filter((r) => dentroDeZona(origen, r.zona)).map((r) => r.url);
  const [principal, ...resto] = servidores;
  return [...new Set([principal, ...cercanos, ...resto].filter(Boolean))];
}

export function crearClienteOverpass({
  servidores = SERVIDORES_OVERPASS,
  regionales = SERVIDORES_REGIONALES,
  fetchFn = (...args) => fetch(...args),
  ahora = () => Date.now(),
  temporizador = { poner: (accion, ms) => setTimeout(accion, ms), quitar: (id) => clearTimeout(id) },
  tiempoMaximoMs = TIEMPO_MAXIMO_MS,
  escalonadoMs = ESCALONADO_MS,
  esperaMs = ESPERA_TRAS_RECHAZO_MS,
  agente = AGENTE_USUARIO, // null en la web: los navegadores no permiten cambiar el User-Agent
  registrar = () => {},
} = {}) {
  const enEspera = new Map(); // servidor → instante hasta el que no se le insiste
  const enCurso = new Map(); // consulta → promesa, para no repetir una consulta idéntica que ya está viajando

  const avisar = (mensaje, error) => {
    try {
      registrar(mensaje, error);
    } catch (_) {
      // un registro que falla no debe romper la búsqueda
    }
  };

  async function pedir(servidor, consulta, controlador) {
    const limite = temporizador.poner(() => controlador.abort(), tiempoMaximoMs);
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
    } catch (error) {
      // Cortado por el límite de tiempo: se dice en claro en vez del genérico "Fetch request has been canceled".
      if (controlador.signal.aborted) throw new Error(`sin respuesta en ${tiempoMaximoMs / 1000} s`);
      throw error;
    } finally {
      temporizador.quitar(limite);
    }
  }

  // Devuelve el JSON de la primera respuesta válida, o null si ningún servidor pudo.
  function buscar(consulta, origen) {
    const lista = [];
    for (const servidor of servidoresPara(origen, servidores, regionales)) {
      if ((enEspera.get(servidor) || 0) > ahora()) {
        avisar(`Se omite ${servidor}: respondió "ocupado" hace poco`);
      } else {
        lista.push(servidor);
      }
    }
    if (lista.length === 0) return Promise.resolve(null);

    return new Promise((resolver) => {
      const enVuelo = new Set(); // controladores de las peticiones que aún no terminan
      let siguiente = 0; // posición del próximo servidor por arrancar
      let sinFallar = lista.length; // servidores que aún no han fallado
      let terminado = false;
      let turno = null; // temporizador del próximo arranque escalonado

      const terminar = (resultado) => {
        if (terminado) return;
        terminado = true;
        temporizador.quitar(turno);
        enVuelo.forEach((c) => c.abort()); // cancela a los que seguían esperando
        resolver(resultado);
      };

      const arrancarSiguiente = () => {
        temporizador.quitar(turno);
        turno = null;
        if (terminado || siguiente >= lista.length) return;
        const servidor = lista[siguiente++];
        const controlador = new AbortController();
        enVuelo.add(controlador);
        if (siguiente < lista.length) turno = temporizador.poner(arrancarSiguiente, escalonadoMs);
        pedir(servidor, consulta, controlador).then(
          (json) => {
            enVuelo.delete(controlador);
            terminar(json);
          },
          (error) => {
            enVuelo.delete(controlador);
            if (terminado) return; // era uno de los cancelados porque otro ya ganó
            avisar(`Falló ${servidor}`, error);
            sinFallar -= 1;
            if (sinFallar === 0) terminar(null);
            else arrancarSiguiente(); // falló: se prueba el siguiente ya, sin esperar los 2 s
          }
        );
      };

      arrancarSiguiente();
    });
  }

  function consultar(consulta, origen) {
    const repetida = enCurso.get(consulta);
    if (repetida) return repetida;
    const promesa = buscar(consulta, origen);
    enCurso.set(consulta, promesa);
    const limpiar = () => {
      if (enCurso.get(consulta) === promesa) enCurso.delete(consulta);
    };
    promesa.then(limpiar, limpiar);
    return promesa;
  }

  return { consultar };
}
