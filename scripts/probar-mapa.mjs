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

// ---- consulta de lugares a Overpass: identificación, esperas y servidores de respaldo ----
const { crearClienteOverpass, SERVIDORES_OVERPASS } = await import("../utils/overpass.js");
const { AGENTE_USUARIO: AGENTE_APP } = await import("../constants/app.js");
const [SA, SB, SC] = SERVIDORES_OVERPASS;

// Red falsa: guion[url](n) dice qué responde ese servidor en su n-ésima llamada.
function redFalsa(guion) {
  const llamadas = [];
  const cuenta = {};
  const fetchFn = (url, opciones) => {
    llamadas.push({ url, opciones });
    cuenta[url] = (cuenta[url] || 0) + 1;
    const r = guion[url](cuenta[url]);
    if (r.error) return Promise.reject(new TypeError(r.error));
    if (r.colgar) {
      return new Promise((_, rechazar) =>
        opciones.signal.addEventListener("abort", () => rechazar(Object.assign(new Error("abortado"), { name: "AbortError" })))
      );
    }
    return Promise.resolve({
      ok: r.estado >= 200 && r.estado < 300,
      status: r.estado,
      json: async () => {
        if (r.json === undefined) throw new SyntaxError("la respuesta no es JSON");
        return r.json;
      },
    });
  };
  return { fetchFn, llamadas };
}
const bien = { estado: 200, json: { elements: [{ type: "node", id: 1, lat: -12.05, lon: -77.03, tags: { amenity: "bank" } }] } };
const urls = (llamadas) => llamadas.map((l) => l.url);
let reloj = 5_000_000;

{
  const { fetchFn, llamadas } = redFalsa({ [SA]: () => bien, [SB]: () => bien, [SC]: () => bien });
  const cliente = crearClienteOverpass({ fetchFn, ahora: () => reloj });
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
  const cliente = crearClienteOverpass({ fetchFn, ahora: () => reloj });
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
  const cliente = crearClienteOverpass({ fetchFn, ahora: () => reloj });
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
  const json = await crearClienteOverpass({ fetchFn, ahora: () => reloj }).consultar("q");
  prueba("Sin red o con respuesta que no es JSON: sigue con el siguiente hasta encontrar uno", json === bien.json && urls(llamadas).join() === [SA, SB, SC].join());
}
{
  const { fetchFn, llamadas } = redFalsa({ [SA]: () => ({ colgar: true }), [SB]: () => bien, [SC]: () => bien });
  const inicio = Date.now();
  const json = await crearClienteOverpass({ fetchFn, tiempoMaximoMs: 25, ahora: () => reloj }).consultar("q");
  prueba("Un servidor que no contesta se corta por tiempo y pasa al siguiente", json === bien.json && urls(llamadas).join() === [SA, SB].join() && Date.now() - inicio < 1000);
}
{
  const saturado = { estado: 200, json: { elements: [], remark: 'runtime error: Query timed out in "query" at line 1 after 11 seconds.' } };
  const { fetchFn, llamadas } = redFalsa({ [SA]: () => saturado, [SB]: () => bien, [SC]: () => bien });
  const json = await crearClienteOverpass({ fetchFn, ahora: () => reloj }).consultar("q");
  prueba("Lista vacía con 'runtime error' (servidor saturado) NO se toma como 'no hay bancos': prueba otro", json === bien.json && urls(llamadas).join() === [SA, SB].join());
  const conDatos = { estado: 200, json: { elements: bien.json.elements, remark: "runtime error: Query ran out of memory" } };
  const r2 = redFalsa({ [SA]: () => conDatos, [SB]: () => bien, [SC]: () => bien });
  const json2 = await crearClienteOverpass({ fetchFn: r2.fetchFn, ahora: () => reloj }).consultar("q");
  prueba("Con resultados y una nota de error se aceptan los resultados", json2 === conDatos.json && urls(r2.llamadas).join() === SA);
  const vacio = { estado: 200, json: { elements: [] } };
  const r3 = redFalsa({ [SA]: () => vacio, [SB]: () => bien, [SC]: () => bien });
  const json3 = await crearClienteOverpass({ fetchFn: r3.fetchFn, ahora: () => reloj }).consultar("q");
  prueba("Lista vacía sin errores = de verdad no hay lugares (no se insiste)", json3 === vacio.json && urls(r3.llamadas).join() === SA);
}
{
  const { fetchFn } = redFalsa({ [SA]: () => ({ estado: 406 }), [SB]: () => ({ error: "sin red" }), [SC]: () => ({ estado: 503 }) });
  const registro = [];
  const cliente = crearClienteOverpass({ fetchFn, ahora: () => reloj, registrar: (m) => registro.push(m) });
  const json = await cliente.consultar("q");
  prueba("Si todos fallan devuelve null (la app usa la última búsqueda guardada) y deja registro", json === null && registro.length === 3, `${registro.length} avisos`);
}
prueba("Hay al menos 3 servidores distintos, todos con https",
  SERVIDORES_OVERPASS.length >= 3 && new Set(SERVIDORES_OVERPASS).size === SERVIDORES_OVERPASS.length && SERVIDORES_OVERPASS.every((s) => s.startsWith("https://")));

console.log(fallos === 0 ? "\n✔ Todas las pruebas del mapa pasaron" : `\n✘ ${fallos} prueba(s) fallaron`);
process.exit(fallos === 0 ? 0 : 1);
