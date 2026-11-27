// Pruebas de la lógica del mapa (sin celular ni internet). Ejecutar: npm run test:mapa
import { distanciaMetros, textoDistancia } from "../utils/geo.js";
import {
  consultaOverpass,
  interpretarRespuesta,
  crearEntradaCache,
  lugaresDeCache,
  MAXIMO_LUGARES,
  CACHE_MAX_EDAD_MS,
} from "../utils/lugares.js";

let fallos = 0;
function prueba(nombre, condicion, detalle = "") {
  if (condicion) console.log(`✔ ${nombre}${detalle ? "  → " + detalle : ""}`);
  else {
    fallos++;
    console.log(`✘ ${nombre}${detalle ? "  → " + detalle : ""}`);
  }
}

// Puntos de Lima: Plaza San Martín y Plaza de Armas (unos 750 m en línea recta).
const sanMartin = { latitude: -12.0519, longitude: -77.0343 };
const plazaArmas = { latitude: -12.0464, longitude: -77.03 };

// ---- geo ----
const d = distanciaMetros(sanMartin, plazaArmas);
prueba("distancia entre dos plazas de Lima ≈ 750 m", d > 650 && d < 850, `${Math.round(d)} m`);
prueba("distancia a sí mismo es 0", distanciaMetros(sanMartin, sanMartin) === 0);
prueba("textoDistancia 350 m", textoDistancia(347) === "350 m", textoDistancia(347));
prueba("textoDistancia 1.2 km", textoDistancia(1234) === "1.2 km", textoDistancia(1234));
prueba("textoDistancia inválida → vacío", textoDistancia(NaN) === "");

// ---- consulta ----
const q = consultaOverpass(-12.05, -77.03, 2000);
prueba("consulta pide bancos y cajeros", q.includes('"amenity"="bank"') && q.includes('"amenity"="atm"'));
prueba("consulta usa radio y coordenadas", q.includes("around:2000,-12.05,-77.03"));

// ---- interpretar respuesta de Overpass ----
const respuesta = {
  elements: [
    { type: "node", id: 1, lat: -12.0464, lon: -77.03, tags: { amenity: "bank", name: "Banco A" } },
    { type: "way", id: 2, center: { lat: -12.052, lon: -77.0344 }, tags: { amenity: "bank", brand: "Banco B" } },
    { type: "node", id: 3, lat: -12.0521, lon: -77.0345, tags: { amenity: "atm" } },
    { type: "node", id: 4, lat: -12.0464, lon: -77.03, tags: { amenity: "bank", name: "Banco A" } }, // duplicado
    { type: "node", id: 5, tags: { amenity: "bank", name: "Sin coordenadas" } },
    { type: "node", id: 6, lat: "x", lon: 1, tags: { amenity: "atm" } },
  ],
};
const lugares = interpretarRespuesta(respuesta, sanMartin);
prueba("descarta duplicados y elementos sin coordenadas", lugares.length === 3, `${lugares.length} lugares`);
prueba("ordena por cercanía", lugares.every((l, i) => i === 0 || lugares[i - 1].distancia <= l.distancia));
prueba("el más cercano es el Banco B (≈15 m) y luego el cajero (≈30 m)",
  lugares[0].nombre === "Banco B" && lugares[1].tipo === "cajero" && lugares[1].nombre === "Cajero automático",
  lugares.map((l) => `${l.nombre} ${Math.round(l.distancia)} m`).join(", "));
prueba("usa 'brand' si no hay 'name'", lugares.some((l) => l.nombre === "Banco B"));
prueba("el id mezcla tipo y número", lugares.some((l) => l.id === "way2"));
prueba("respuesta vacía o rara no rompe", interpretarRespuesta(null, sanMartin).length === 0 && interpretarRespuesta({}, sanMartin).length === 0);

const muchos = {
  elements: Array.from({ length: 60 }, (_, i) => ({
    type: "node",
    id: i + 100,
    lat: -12.05 + i * 0.0005,
    lon: -77.03,
    tags: { amenity: "bank", name: `Banco ${i}` },
  })),
};
prueba(`limita a ${MAXIMO_LUGARES} lugares`, interpretarRespuesta(muchos, sanMartin).length === MAXIMO_LUGARES);

// ---- memoria de la última búsqueda ----
const ahora = Date.UTC(2026, 10, 25, 15, 0, 0);
const entrada = crearEntradaCache(sanMartin, lugares, 2000, ahora);
prueba("la memoria redondea tu posición (~110 m)", entrada.origen.latitude === -12.052 && entrada.origen.longitude === -77.034, JSON.stringify(entrada.origen));
prueba("la memoria no guarda distancias viejas", entrada.lugares.every((l) => !("distancia" in l)));

const viaJson = JSON.parse(JSON.stringify(entrada)); // así se guarda en AsyncStorage
const ok = lugaresDeCache(viaJson, sanMartin, ahora + 60_000);
prueba("sirve 1 minuto después en el mismo lugar", ok && ok.lugares.length === 3);
prueba("recalcula distancias y ordena", ok && ok.lugares.every((l, i) => i === 0 || ok.lugares[i - 1].distancia <= l.distancia));

const unPocoMasLejos = { latitude: -12.056, longitude: -77.0343 }; // ~ 450 m
prueba("sirve si te moviste menos de 1 km", lugaresDeCache(viaJson, unPocoMasLejos, ahora + 1000) !== null);
const lejos = { latitude: -12.1, longitude: -77.0343 }; // ~ 5 km
prueba("no sirve si estás a más de 1 km", lugaresDeCache(viaJson, lejos, ahora + 1000) === null);
prueba("no sirve pasadas 24 h", lugaresDeCache(viaJson, sanMartin, ahora + CACHE_MAX_EDAD_MS + 1) === null);
prueba("sirve justo antes de las 24 h", lugaresDeCache(viaJson, sanMartin, ahora + CACHE_MAX_EDAD_MS - 1) !== null);
prueba("no sirve si el reloj quedó atrás", lugaresDeCache(viaJson, sanMartin, ahora - 1000) === null);
prueba("entrada nula, vacía o dañada → null",
  lugaresDeCache(null, sanMartin, ahora) === null &&
  lugaresDeCache({}, sanMartin, ahora) === null &&
  lugaresDeCache({ ...viaJson, lugares: [] }, sanMartin, ahora) === null &&
  lugaresDeCache({ ...viaJson, guardadoEn: "ayer" }, sanMartin, ahora) === null);

// ---- página del mapa y mapa base (OpenStreetMap) ----
const { HTML_MAPA, FUENTES_MAPA_BASE, POLITICA_REFERER, URL_PROYECTO, AGENTE_USUARIO, enlacePermitido } = await import(
  "../components/mapaHtml.js"
);
prueba("el mapa ya no usa CARTO (pedía clave y dibujaba 'API KEY REQUIRED')", !/carto/i.test(HTML_MAPA));
prueba("la primera fuente es el servidor oficial de OpenStreetMap, con https",
  FUENTES_MAPA_BASE[0].url === "https://tile.openstreetmap.org/{z}/{x}/{y}.png", FUENTES_MAPA_BASE[0].url);
prueba("todas las fuentes usan https y tienen {z}/{x}/{y}",
  FUENTES_MAPA_BASE.every((f) => f.url.startsWith("https://") && ["{z}", "{x}", "{y}"].every((c) => f.url.includes(c))));
prueba("cada fuente muestra la atribución de OpenStreetMap con enlace a /copyright",
  FUENTES_MAPA_BASE.every((f) => f.atribucion.includes("OpenStreetMap") && f.atribucion.includes("https://www.openstreetmap.org/copyright")));
prueba("hay una fuente de respaldo para cuando la primera no carga", FUENTES_MAPA_BASE.length >= 2);
prueba("la política de Referer es una de las que acepta OpenStreetMap",
  ["no-referrer-when-downgrade", "origin", "origin-when-cross-origin", "strict-origin", "strict-origin-when-cross-origin"].includes(POLITICA_REFERER), POLITICA_REFERER);
prueba("la página se identifica con una dirección https real del proyecto (Referer)",
  URL_PROYECTO.startsWith("https://github.com/") && !/taqi\.app/.test(URL_PROYECTO), URL_PROYECTO);
prueba("el User-Agent nombra la app y da dónde consultarla", AGENTE_USUARIO.startsWith("TAQI/") && AGENTE_USUARIO.includes(URL_PROYECTO), AGENTE_USUARIO);
prueba("la página no deja variables sin resolver", !HTML_MAPA.includes("${") && !HTML_MAPA.includes("[object Object]"));
prueba("los clics en enlaces no navegan dentro del mapa (se capturan y se avisan a la app)",
  /addEventListener\("click"[\s\S]*preventDefault\(\)[\s\S]*tipo: "enlace"[\s\S]*, true\);/.test(HTML_MAPA));

const scripts = [...HTML_MAPA.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
let sintaxisOk = scripts.length === 1;
try {
  scripts.forEach((codigo) => new Function(codigo)); // solo compila: revisa que no haya errores de sintaxis
} catch (error) {
  sintaxisOk = false;
  console.log("   error de sintaxis en la página del mapa:", error.message);
}
prueba("el código de la página del mapa no tiene errores de sintaxis", sintaxisOk);

prueba("se pueden abrir los enlaces de atribución de OpenStreetMap y Leaflet",
  enlacePermitido("https://www.openstreetmap.org/copyright") && enlacePermitido("https://leafletjs.com") && enlacePermitido("https://leafletjs.com/"));
prueba("no se abre nada más: otros sitios, http, javascript: ni dominios parecidos",
  ["https://example.com/", "http://www.openstreetmap.org/copyright", "javascript:alert(1)", "https://www.openstreetmap.org.evil.com/",
   "https://evil.com/https://www.openstreetmap.org/", "", null, undefined, 42].every((u) => !enlacePermitido(u)));

// ---- consulta de lugares a Overpass: identificación, esperas, servidores de respaldo y peticiones escalonadas ----
const {
  crearClienteOverpass,
  SERVIDORES_OVERPASS,
  SERVIDORES_REGIONALES,
  ESCALONADO_MS,
  TIEMPO_MAXIMO_MS,
  dentroDeZona,
  servidoresPara,
} = await import("../utils/overpass.js");
const { AGENTE_USUARIO: AGENTE_APP } = await import("../constants/app.js");
const [SA, SB] = SERVIDORES_OVERPASS;
const SC = "https://tercero.prueba/api/interpreter"; // un tercer servidor inventado, para probar el orden con tres

// Si el código falla de forma rara (una promesa que se rechaza sin que nadie la atienda, o que nunca termina),
// que salga como prueba en rojo y no como un cuelgue o una caída a mitad de las pruebas.
process.on("unhandledRejection", (motivo) => {
  fallos++;
  console.log(`✘ Una promesa se rechazó sin que nadie la atendiera  → ${motivo && motivo.message}`);
});
const COLGADA = Symbol("colgada");
function conLimite(promesa, ms = 1000) {
  let id;
  const guardia = new Promise((resolver) => {
    id = setTimeout(() => resolver(COLGADA), ms);
  });
  return Promise.race([promesa, guardia]).finally(() => clearTimeout(id));
}
const TRES = [SA, SB, SC];
const REGIONAL = SERVIDORES_REGIONALES[0].url;

// Reloj falso: las esperas de estas pruebas no duran de verdad y el orden de los hechos es siempre el mismo.
function relojFalso() {
  let t = 0;
  let ultimoId = 0;
  const tareas = new Map();
  const dejarCorrer = () => new Promise((listo) => setImmediate(listo)); // deja que terminen todas las promesas
  return {
    ahora: () => t,
    poner(accion, ms) {
      tareas.set(++ultimoId, { en: t + ms, accion });
      return ultimoId;
    },
    quitar: (id) => tareas.delete(id),
    pendientes: () => tareas.size,
    async avanzar(ms) {
      const meta = t + ms;
      await dejarCorrer();
      for (;;) {
        let proxima = null;
        for (const [id, tarea] of tareas) {
          if (tarea.en <= meta && (!proxima || tarea.en < proxima.tarea.en)) proxima = { id, tarea };
        }
        if (!proxima) break;
        tareas.delete(proxima.id);
        t = proxima.tarea.en;
        proxima.tarea.accion();
        await dejarCorrer();
      }
      t = meta;
    },
  };
}

// Red falsa: guion[url](n) dice qué responde ese servidor en su n-ésima llamada:
//   { estado, json }               contesta enseguida
//   { error }                      falla la conexión
//   { colgar: true }               no contesta nunca (hasta que lo cancelen)
//   { demora: ms, estado, json }   contesta pasados ms (usa el reloj falso)
function redFalsa(guion, crono = null) {
  const llamadas = [];
  const cuenta = {};
  const cancelado = () => Object.assign(new Error("abortado"), { name: "AbortError" });
  const fetchFn = (url, opciones) => {
    llamadas.push({ url, opciones });
    cuenta[url] = (cuenta[url] || 0) + 1;
    const r = guion[url](cuenta[url]);
    if (r.error) return Promise.reject(new TypeError(r.error));
    if (r.colgar) {
      return new Promise((_, rechazar) => opciones.signal.addEventListener("abort", () => rechazar(cancelado())));
    }
    const respuesta = {
      ok: r.estado >= 200 && r.estado < 300,
      status: r.estado,
      json: async () => {
        if (r.json === undefined) throw new SyntaxError("la respuesta no es JSON");
        return r.json;
      },
    };
    if (r.demora) {
      return new Promise((resolver, rechazar) => {
        const id = crono.poner(() => resolver(respuesta), r.demora);
        opciones.signal.addEventListener("abort", () => {
          crono.quitar(id);
          rechazar(cancelado());
        });
      });
    }
    return Promise.resolve(respuesta);
  };
  return { fetchFn, llamadas };
}
const bien = { estado: 200, json: { elements: [{ type: "node", id: 1, lat: -12.05, lon: -77.03, tags: { amenity: "bank" } }] } };
const urls = (llamadas) => llamadas.map((l) => l.url);
let reloj = 5_000_000;

{
  const { fetchFn, llamadas } = redFalsa({ [SA]: () => bien, [SB]: () => bien, [SC]: () => bien });
  const cliente = crearClienteOverpass({ fetchFn, ahora: () => reloj, servidores: TRES });
  const json = await cliente.consultar("[out:json];out;");
  const h = llamadas[0].opciones.headers;
  prueba("Overpass: responde el primer servidor y no molesta a los demás", json === bien.json && urls(llamadas).join() === SA);
  prueba("Overpass: se identifica con el User-Agent de TAQI y pide JSON", h["User-Agent"] === AGENTE_APP && h.Accept === "application/json", h["User-Agent"]);
  prueba("Overpass: manda la consulta por POST, en el cuerpo",
    llamadas[0].opciones.method === "POST" && llamadas[0].opciones.body === "data=" + encodeURIComponent("[out:json];out;"));
  prueba("el User-Agent solo tiene caracteres ASCII imprimibles (Android rechaza otros)", /^[\x20-\x7E]+$/.test(AGENTE_APP));
}
{
  const { fetchFn, llamadas } = redFalsa({ [SA]: () => bien });
  await crearClienteOverpass({ fetchFn, agente: null, servidores: [SA] }).consultar("q");
  prueba("En la web no se manda User-Agent (el navegador no lo permite)", !("User-Agent" in llamadas[0].opciones.headers));
}
for (const codigo of [406, 429]) {
  const { fetchFn, llamadas } = redFalsa({ [SA]: () => ({ estado: codigo }), [SB]: () => bien, [SC]: () => bien });
  const cliente = crearClienteOverpass({ fetchFn, ahora: () => reloj, servidores: TRES });
  const primero = await cliente.consultar("q");
  prueba(`HTTP ${codigo} del primero: usa el siguiente servidor`, primero === bien.json && urls(llamadas).join() === [SA, SB].join());
  llamadas.length = 0;
  await cliente.consultar("q");
  prueba(`HTTP ${codigo}: no le vuelve a pedir a ese servidor durante 30 s`, urls(llamadas).join() === SB);
  reloj += 30_000 - 1; // la espera que pide el servicio público: 30 segundos
  llamadas.length = 0;
  await cliente.consultar("q");
  prueba(`HTTP ${codigo}: ni un segundo antes de cumplirse la espera`, urls(llamadas).join() === SB);
  reloj += 2;
  llamadas.length = 0;
  await cliente.consultar("q");
  prueba(`HTTP ${codigo}: cumplidos los 30 s lo vuelve a intentar`, llamadas[0].url === SA);
}
{
  const { fetchFn, llamadas } = redFalsa({ [SA]: () => ({ estado: 503 }), [SB]: () => bien, [SC]: () => bien });
  const cliente = crearClienteOverpass({ fetchFn, ahora: () => reloj, servidores: TRES });
  await cliente.consultar("q");
  llamadas.length = 0;
  await cliente.consultar("q");
  prueba("Un 503 (servidor caído) no genera espera: se reintenta enseguida", llamadas[0].url === SA);
}
{
  const { fetchFn, llamadas } = redFalsa({
    [SA]: () => ({ error: "Network request failed" }),
    [SB]: () => ({ estado: 200 }), // responde 200 pero con una página que no es JSON
    [SC]: () => bien,
  });
  const json = await crearClienteOverpass({ fetchFn, ahora: () => reloj, servidores: TRES }).consultar("q");
  prueba("Sin red o con respuesta que no es JSON: sigue con el siguiente hasta encontrar uno", json === bien.json && urls(llamadas).join() === [SA, SB, SC].join());
}
{
  const { fetchFn, llamadas } = redFalsa({ [SA]: () => ({ colgar: true }), [SB]: () => bien, [SC]: () => bien });
  const inicio = Date.now();
  const json = await crearClienteOverpass({ fetchFn, servidores: TRES, tiempoMaximoMs: 25, ahora: () => reloj }).consultar("q");
  prueba("Un servidor que no contesta se corta por tiempo y pasa al siguiente", json === bien.json && urls(llamadas).join() === [SA, SB].join() && Date.now() - inicio < 1000);
}
{
  const saturado = { estado: 200, json: { elements: [], remark: 'runtime error: Query timed out in "query" at line 1 after 11 seconds.' } };
  const { fetchFn, llamadas } = redFalsa({ [SA]: () => saturado, [SB]: () => bien, [SC]: () => bien });
  const json = await crearClienteOverpass({ fetchFn, ahora: () => reloj, servidores: TRES }).consultar("q");
  prueba("Lista vacía con 'runtime error' (servidor saturado) NO se toma como 'no hay bancos': prueba otro", json === bien.json && urls(llamadas).join() === [SA, SB].join());
  const conDatos = { estado: 200, json: { elements: bien.json.elements, remark: "runtime error: Query ran out of memory" } };
  const r2 = redFalsa({ [SA]: () => conDatos, [SB]: () => bien, [SC]: () => bien });
  const json2 = await crearClienteOverpass({ fetchFn: r2.fetchFn, ahora: () => reloj, servidores: TRES }).consultar("q");
  prueba("Con resultados y una nota de error se aceptan los resultados", json2 === conDatos.json && urls(r2.llamadas).join() === SA);
  const vacio = { estado: 200, json: { elements: [] } };
  const r3 = redFalsa({ [SA]: () => vacio, [SB]: () => bien, [SC]: () => bien });
  const json3 = await crearClienteOverpass({ fetchFn: r3.fetchFn, ahora: () => reloj, servidores: TRES }).consultar("q");
  prueba("Lista vacía sin errores = de verdad no hay lugares (no se insiste)", json3 === vacio.json && urls(r3.llamadas).join() === SA);
}
{
  const { fetchFn } = redFalsa({ [SA]: () => ({ estado: 406 }), [SB]: () => ({ error: "sin red" }), [SC]: () => ({ estado: 503 }) });
  const registro = [];
  const cliente = crearClienteOverpass({ fetchFn, ahora: () => reloj, servidores: TRES, registrar: (m) => registro.push(m) });
  const json = await cliente.consultar("q");
  prueba("Si todos fallan devuelve null (la app usa la última búsqueda guardada) y deja registro", json === null && registro.length === 3, `${registro.length} avisos`);
}

// ---- peticiones escalonadas: varios servidores a la vez, gana el primero que responda bien ----
// Cada escenario usa el reloj falso: "avanzar(2000)" hace pasar 2 s al instante.
function escenario(guion, opciones = {}) {
  const crono = relojFalso();
  const { fetchFn, llamadas } = redFalsa(guion, crono);
  const registro = [];
  const cliente = crearClienteOverpass({
    fetchFn,
    servidores: TRES,
    temporizador: crono,
    ahora: crono.ahora,
    registrar: (mensaje, error) => registro.push({ mensaje, error }),
    ...opciones,
  });
  const estado = { listo: false, valor: undefined };
  const consultar = (consulta = "q", origen) => {
    const promesa = cliente.consultar(consulta, origen);
    promesa.then((valor) => Object.assign(estado, { listo: true, valor }));
    return promesa;
  };
  return { crono, llamadas, registro, estado, consultar };
}
const colgado = () => ({ colgar: true });

{
  const e = escenario({ [SA]: colgado, [SB]: () => bien, [SC]: () => bien });
  const promesa = e.consultar();
  await e.crono.avanzar(ESCALONADO_MS - 1);
  prueba("Escalonado: durante los primeros 2 s solo se le pide al primer servidor", urls(e.llamadas).join() === SA && !e.estado.listo);
  await e.crono.avanzar(1);
  const json = await conLimite(promesa);
  prueba("Escalonado: a los 2 s sin respuesta se le pide también al segundo y se usa lo que conteste",
    json === bien.json && urls(e.llamadas).join() === [SA, SB].join());
  prueba("Escalonado: al ganar el segundo se cancela la petición que seguía esperando",
    e.llamadas[0].opciones.signal.aborted === true && e.llamadas[1].opciones.signal.aborted === false);
  prueba("Escalonado: lo cancelado no se anota como falla y no quedan temporizadores", e.registro.length === 0 && e.crono.pendientes() === 0,
    `${e.registro.length} avisos, ${e.crono.pendientes()} temporizadores`);
}
{
  const lenta = { demora: 3000, ...bien, json: { elements: [{ type: "node", id: 99, lat: -12.05, lon: -77.03, tags: { amenity: "atm" } }] } };
  const e = escenario({ [SA]: () => lenta, [SB]: colgado, [SC]: colgado });
  const promesa = e.consultar();
  await e.crono.avanzar(2000);
  prueba("Escalonado: el segundo arranca aunque el primero siga esperando", urls(e.llamadas).join() === [SA, SB].join());
  await e.crono.avanzar(1000);
  const json = await conLimite(promesa);
  prueba("El primero, aunque lento, gana si contesta antes que los demás; se cancela al segundo y no se llega al tercero",
    json === lenta.json && e.llamadas.length === 2 && e.llamadas[0].opciones.signal.aborted === false && e.llamadas[1].opciones.signal.aborted === true);
  prueba("Ese cierre tampoco deja temporizadores", e.crono.pendientes() === 0);
}
{
  const e = escenario({ [SA]: () => ({ estado: 502 }), [SB]: () => bien, [SC]: () => bien });
  const promesa = e.consultar();
  await e.crono.avanzar(0);
  const json = await conLimite(promesa);
  prueba("Si el primero falla (502), se le pide al segundo AL INSTANTE, sin esperar los 2 s",
    json === bien.json && urls(e.llamadas).join() === [SA, SB].join() && e.crono.ahora() === 0 && e.registro.length === 1);
}
{
  const e = escenario({ [SA]: colgado, [SB]: () => ({ estado: 503 }), [SC]: () => bien });
  const promesa = e.consultar();
  await e.crono.avanzar(ESCALONADO_MS);
  const json = await conLimite(promesa);
  prueba("Si el segundo falla al arrancar, el tercero sale de inmediato (no hay que esperar otros 2 s)",
    json === bien.json && urls(e.llamadas).join() === [SA, SB, SC].join() && e.crono.ahora() === ESCALONADO_MS);
}
{
  const e = escenario({ [SA]: colgado, [SB]: colgado, [SC]: colgado });
  e.consultar();
  const fin = TIEMPO_MAXIMO_MS + 2 * ESCALONADO_MS; // el último arranca a los 4 s y tiene 10 s para contestar
  await e.crono.avanzar(fin - 1);
  prueba("Si todos se cuelgan, hasta el último segundo se sigue esperando", !e.estado.listo && e.llamadas.length === 3);
  await e.crono.avanzar(1);
  prueba("Si todos se cuelgan, a los 14 s devuelve null (la app usa la búsqueda guardada), no a los 30 s de antes",
    e.estado.listo && e.estado.valor === null);
  const claro = new RegExp(`sin respuesta en ${TIEMPO_MAXIMO_MS / 1000} s`);
  prueba("Cada servidor que no contestó queda anotado con un mensaje claro (no 'Fetch request has been canceled')",
    e.registro.length === 3 && e.registro.every((r) => claro.test(r.error.message)), e.registro[0] && e.registro[0].error.message);
  prueba("Al terminar no quedan temporizadores", e.crono.pendientes() === 0);
}
{
  const e = escenario({ [SA]: colgado, [SB]: () => bien, [SC]: () => bien });
  const p1 = e.consultar("misma");
  const p2 = e.consultar("misma");
  prueba("Una consulta idéntica que ya está en curso se reutiliza (no se repite la petición)", p1 === p2 && e.llamadas.length === 1);
  await e.crono.avanzar(ESCALONADO_MS);
  const [j1, j2] = await conLimite(Promise.all([p1, p2]), 1000).then((r) => (r === COLGADA ? [COLGADA, COLGADA] : r));
  prueba("Las dos reciben la misma respuesta y solo se pidió una vez a cada servidor", j1 === bien.json && j2 === bien.json && urls(e.llamadas).join() === [SA, SB].join());
  e.consultar("misma");
  prueba("Terminada la consulta, una nueva sí vuelve a pedirse", e.llamadas.length === 3 && e.llamadas[2].url === SA);
  await e.crono.avanzar(ESCALONADO_MS);
}
{
  const e = escenario({ [SA]: () => ({ error: "x" }), [SB]: () => ({ error: "x" }), [SC]: () => ({ error: "x" }) },
    { registrar: () => { throw new Error("registro roto"); } });
  const json = await conLimite(e.consultar());
  prueba("Si el registro de avisos falla, la búsqueda igual termina (devuelve null)", json === null);
}

// ---- servidor regional (Sudamérica): solo si estás dentro de su zona ----
const ciudades = {
  Lima: [-12.0464, -77.0428], Bogotá: [4.711, -74.0721], Quito: [-0.1807, -78.4678], "La Paz": [-16.5, -68.15],
  Santiago: [-33.4489, -70.6693], "Buenos Aires": [-34.6037, -58.3816], "São Paulo": [-23.5505, -46.6333],
  Montevideo: [-34.9011, -56.1645], Ushuaia: [-54.8019, -68.303],
};
const fuera = {
  Panamá: [8.9824, -79.5199], "Ciudad de México": [19.4326, -99.1332], Miami: [25.7617, -80.1918], Madrid: [40.4168, -3.7038],
  Caracas: [10.4806, -66.9036], Galápagos: [-0.7393, -90.3518],
};
const zonaSA = SERVIDORES_REGIONALES[0].zona;
const enZona = ([latitude, longitude]) => dentroDeZona({ latitude, longitude }, zonaSA);
prueba("La zona regional incluye las ciudades de Sudamérica probadas", Object.entries(ciudades).every(([, c]) => enZona(c)),
  Object.entries(ciudades).filter(([, c]) => !enZona(c)).map(([n]) => n).join(", "));
prueba("La zona regional es prudente: deja fuera Panamá, México, EE. UU., Europa, Caracas y Galápagos",
  Object.entries(fuera).every(([, c]) => !enZona(c)), Object.entries(fuera).filter(([, c]) => enZona(c)).map(([n]) => n).join(", "));
prueba("Con datos raros (nada, texto, NaN) nunca se considera dentro de la zona",
  [undefined, null, {}, { latitude: "-12", longitude: "-77" }, { latitude: NaN, longitude: -77 }, { latitude: -12 }].every((o) => !dentroDeZona(o, zonaSA)));
const lima = { latitude: -12.0464, longitude: -77.0428 };
prueba("En Lima el orden es: principal, regional de Sudamérica y el resto", servidoresPara(lima).join() === [SA, REGIONAL, SB].join());
prueba("Fuera de la zona (o sin ubicación) el regional no se usa",
  servidoresPara({ latitude: 40.4168, longitude: -3.7038 }).join() === [SA, SB].join() && servidoresPara().join() === [SA, SB].join());
prueba("Aunque la lista traiga un servidor repetido (alias), no se le pide dos veces", servidoresPara(null, [SA, SA, SB], []).join() === [SA, SB].join());
{
  const e = escenario({ [SA]: () => ({ estado: 502 }), [REGIONAL]: () => bien, [SB]: () => bien }, { servidores: [SA, SB] });
  const json = await conLimite(e.consultar("q", lima));
  prueba("En Lima, si el principal falla, el siguiente que se prueba es el regional", json === bien.json && urls(e.llamadas).join() === [SA, REGIONAL].join());
}
{
  const e = escenario({ [SA]: () => ({ estado: 502 }), [REGIONAL]: () => { throw new Error("no debía pedirse"); }, [SB]: () => bien }, { servidores: [SA, SB] });
  const json = await conLimite(e.consultar("q", { latitude: 40.4168, longitude: -3.7038 }));
  const sinOrigen = await conLimite(e.consultar("otra"));
  prueba("Fuera de Sudamérica, o sin ubicación, nunca se le pide nada al regional",
    json === bien.json && sinOrigen === bien.json && !urls(e.llamadas).includes(REGIONAL));
}
{
  const e = escenario({ [SA]: () => ({ estado: 502 }), [REGIONAL]: () => ({ estado: 429 }), [SB]: () => bien }, { servidores: [SA, SB] });
  await conLimite(e.consultar("primera", lima));
  const antes = e.llamadas.length;
  await conLimite(e.consultar("segunda", lima));
  prueba("Si el regional responde 429, se respeta su espera de 30 s como con cualquier otro servidor",
    urls(e.llamadas).slice(0, antes).join() === [SA, REGIONAL, SB].join() && urls(e.llamadas).slice(antes).join() === [SA, SB].join());
}

// ---- lista de servidores ----
prueba("Hay al menos 2 servidores globales distintos, todos con https (sin alias repetidos)",
  SERVIDORES_OVERPASS.length >= 2 && new Set(SERVIDORES_OVERPASS).size === SERVIDORES_OVERPASS.length && SERVIDORES_OVERPASS.every((s) => s.startsWith("https://")));
prueba("Los servidores regionales usan https, no repiten uno global y su zona es un rectángulo válido",
  SERVIDORES_REGIONALES.every((r) => r.url.startsWith("https://") && !SERVIDORES_OVERPASS.includes(r.url) && r.zona.latMin < r.zona.latMax && r.zona.lonMin < r.zona.lonMax));
prueba("Con el regional hay al menos 3 servidores distintos en Sudamérica", servidoresPara(lima).length >= 3);
prueba("El escalonado (2 s) es mucho menor que el límite de cada servidor (10 s)", ESCALONADO_MS === 2000 && ESCALONADO_MS * 3 <= TIEMPO_MAXIMO_MS);

console.log(fallos === 0 ? "\n✔ Todas las pruebas del mapa pasaron" : `\n✘ ${fallos} prueba(s) fallaron`);
process.exit(fallos === 0 ? 0 : 1);
