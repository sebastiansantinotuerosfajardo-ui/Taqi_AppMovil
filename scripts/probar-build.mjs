// Pruebas de la preparación del APK (sin internet ni EAS): el revisor scripts/verificar-build.mjs y los archivos reales.
// Ejecutar: npm run test:build
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { revisarProyecto, revisarUrlApi, revisarLock } from "./verificar-build.mjs";

const aqui = path.dirname(fileURLToPath(import.meta.url));
const raizReal = path.resolve(aqui, "..");

let fallos = 0;
function prueba(nombre, condicion, detalle = "") {
  if (condicion) console.log(`✔ ${nombre}${detalle ? "  → " + detalle : ""}`);
  else {
    fallos++;
    console.log(`✘ ${nombre}${detalle ? "  → " + detalle : ""}`);
  }
}

const errores = (r) => r.filter((x) => x.nivel === "error");
const avisos = (r) => r.filter((x) => x.nivel === "aviso");
const hay = (r, patron) => r.some((x) => patron.test(x.texto));
const leer = (ruta) => JSON.parse(fs.readFileSync(ruta, "utf8"));

// ---- revisarUrlApi --------------------------------------------------------------------------------
{
  const r = revisarUrlApi("https://taqi-api.onrender.com");
  prueba("https en Render: sin errores", errores(r).length === 0 && hay(r, /https, cifrada/));
  prueba("Render gratis: avisa que el servidor duerme y que abra /salud antes", hay(r, /\/salud/) && hay(r, /15 minutos/));
  prueba("https con otro dominio: sin errores ni avisos", avisos(revisarUrlApi("https://api.taqi.pe")).length === 0 && errores(revisarUrlApi("https://api.taqi.pe")).length === 0);
}
prueba("el texto de ejemplo es un error", hay(revisarUrlApi("https://PON-AQUI-LA-DIRECCION-DE-TU-API.onrender.com"), /texto de ejemplo/) && errores(revisarUrlApi("https://PON-AQUI-LA-DIRECCION-DE-TU-API.onrender.com")).length === 1);
prueba("vacío, undefined y solo espacios son un error", [undefined, "", "   ", null].every((v) => errores(revisarUrlApi(v)).length === 1));
prueba("localhost, 127.0.0.1, 10.0.2.2 y 0.0.0.0 son error (no existen en otro celular)",
  ["http://localhost:3000", "http://127.0.0.1:3000", "http://10.0.2.2:3000", "http://0.0.0.0:3000", "https://localhost"].every((u) => hay(revisarUrlApi(u), /propio equipo/)));
prueba("una dirección mal escrita es un error", errores(revisarUrlApi("taqi-api onrender com")).length === 1 && errores(revisarUrlApi("taqi-api.onrender.com")).length === 1);
prueba("ftp:// es un error", errores(revisarUrlApi("ftp://servidor.com")).length === 1);
{
  // Un APK instalado no puede usar http:// (Android lo bloquea): la IP de tu PC en la Wi-Fi o un dominio sin cifrar.
  const direcciones = ["http://192.168.1.44:3000", "http://172.20.3.4:3000", "http://10.247.8.123:3000", "http://api.taqi.pe", "HTTP://API.TAQI.PE"];
  prueba("http:// es un error, también con IP de red local, dominio o mayúsculas", direcciones.every((u) => errores(revisarUrlApi(u)).length === 1 && hay(revisarUrlApi(u), /usa http:\/\//)));
  prueba("…y el mensaje manda a publicar la API con https y a usar Expo Go para probar con la PC", hay(revisarUrlApi(direcciones[0]), /https:\/\/\. Para probar con tu PC usa Expo Go/));
  prueba("https:// con IP de red local no es error (decisión de quien la use)", errores(revisarUrlApi("https://192.168.1.44:3000")).length === 0);
}
prueba("una ruta como /api se avisa", hay(revisarUrlApi("https://api.taqi.pe/api"), /ruta o parámetros/));

// ---- package-lock ---------------------------------------------------------------------------------
{
  const pkg = { dependencies: { a: "~1.0.0", b: "^2.0.0" }, devDependencies: { c: "3.0.0" } };
  const lock = { packages: { "": { dependencies: { a: "~1.0.0", b: "^2.0.0" }, devDependencies: { c: "3.0.0" } }, "node_modules/a": {}, "node_modules/b": {}, "node_modules/c": {} } };
  prueba("lock sincronizado: sin diferencias", revisarLock(pkg, lock).length === 0);
  const sinB = structuredClone(lock); delete sinB.packages[""].dependencies.b;
  prueba("una dependencia que falta en el lock se detecta", revisarLock(pkg, sinB).some((p) => p.includes("b está en package.json")));
  const otroRango = structuredClone(lock); otroRango.packages[""].dependencies.a = "~0.9.0";
  prueba("un rango distinto se detecta", revisarLock(pkg, otroRango).some((p) => p.includes("a:")));
  const sinEntrada = structuredClone(lock); delete sinEntrada.packages["node_modules/c"];
  prueba("una entrada de instalación que falta se detecta", revisarLock(pkg, sinEntrada).some((p) => p.includes("c no tiene")));
  prueba("un lock sin formato se detecta", revisarLock(pkg, {}).length === 1 && revisarLock(pkg, null).length === 1);
}

// ---- proyectos de prueba (carpetas temporales) -----------------------------------------------------
const temporales = [];
function easCon(url, cambios = {}) {
  const perfil = { distribution: "internal", android: { buildType: "apk" }, env: { EXPO_PUBLIC_API_URL: url }, ...cambios };
  return { cli: { version: ">= 16.0.0", appVersionSource: "remote" }, build: { preview: perfil, production: { autoIncrement: true, env: { EXPO_PUBLIC_API_URL: url } } } };
}
function crearProyecto({ eas = easCon("https://taqi-api.onrender.com"), appJson, lock, pkg, sinIcono = false } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "taqi-build-"));
  temporales.push(dir);
  const app = appJson ?? leer(path.join(raizReal, "app.json"));
  fs.writeFileSync(path.join(dir, "app.json"), JSON.stringify(app));
  fs.writeFileSync(path.join(dir, "eas.json"), JSON.stringify(eas));
  fs.writeFileSync(path.join(dir, "package.json"), JSON.stringify(pkg ?? leer(path.join(raizReal, "package.json"))));
  fs.writeFileSync(path.join(dir, "package-lock.json"), JSON.stringify(lock ?? leer(path.join(raizReal, "package-lock.json"))));
  fs.mkdirSync(path.join(dir, "assets"));
  if (!sinIcono) for (const f of fs.readdirSync(path.join(raizReal, "assets"))) fs.copyFileSync(path.join(raizReal, "assets", f), path.join(dir, "assets", f));
  return dir;
}
const appSin = (cambiar) => { const a = leer(path.join(raizReal, "app.json")); cambiar(a.expo); return a; };

{
  const r = revisarProyecto(crearProyecto());
  prueba("proyecto correcto con https: cero errores y cero avisos importantes", errores(r).length === 0, r.map((x) => x.nivel[0]).join(""));
  prueba("…y confirma APK, paquete, íconos, API https y lock sincronizado",
    hay(r, /genera un APK/) && hay(r, /paquete de Android com\.taqi\.app/) && hay(r, /íconos existen/) && hay(r, /https, cifrada/) && hay(r, /sincronizado/));
}
{
  const r = revisarProyecto(crearProyecto({ eas: easCon("http://192.168.1.44:3000") }));
  prueba("proyecto con API http en la LAN: NO se puede compilar (un APK instalado no la alcanzaría)", errores(r).length === 1 && hay(r, /usa http:\/\//));
}
{
  // "eas init" guarda el ID del proyecto en app.json: sin él es un aviso (EAS lo ofrece crear), nunca un error.
  const sinId = revisarProyecto(crearProyecto());
  prueba("sin extra.eas.projectId: aviso para ejecutar 'npx eas-cli init', no error", errores(sinId).length === 0 && hay(sinId.filter((x) => x.nivel === "aviso"), /npx eas-cli init/));
  const conId = revisarProyecto(crearProyecto({ appJson: appSin((e) => { e.extra = { eas: { projectId: "00000000-0000-4000-8000-000000000000" } }; }) }));
  prueba("con extra.eas.projectId: lo confirma y no avisa", hay(conId, /ya está enlazado/) && !hay(conId, /npx eas-cli init/) && errores(conId).length === 0);
  const idVacio = revisarProyecto(crearProyecto({ appJson: appSin((e) => { e.extra = { eas: { projectId: "" } }; }) }));
  prueba("projectId vacío cuenta como no enlazado", hay(idVacio, /npx eas-cli init/));
}
prueba("la dirección de ejemplo bloquea la compilación", errores(revisarProyecto(crearProyecto({ eas: easCon("https://PON-AQUI-LA-DIRECCION-DE-TU-API.onrender.com") }))).length === 1);
prueba("localhost bloquea la compilación", hay(revisarProyecto(crearProyecto({ eas: easCon("http://localhost:3000") })), /propio equipo/));
{
  const sinEnv = easCon("https://x.onrender.com"); delete sinEnv.build.preview.env;
  prueba("perfil sin env: falta la dirección de la API", hay(revisarProyecto(crearProyecto({ eas: sinEnv })), /Falta EXPO_PUBLIC_API_URL/));
}
{
  const sinApk = easCon("https://x.onrender.com", { android: {} });
  prueba("preview sin buildType apk es un error (saldría un .aab que no se instala)", hay(revisarProyecto(crearProyecto({ eas: sinApk })), /no genera un APK/));
}
{
  const r = revisarProyecto(crearProyecto(), "production");
  prueba("perfil production: avisa que genera .aab y no es un error", errores(r).length === 0 && hay(r, /\.aab/));
}
prueba("un perfil que no existe es un error y lista los que hay", hay(revisarProyecto(crearProyecto(), "otro"), /no tiene el perfil "otro".*preview, production/));
prueba("sin eas.json es un error", hay(revisarProyecto(fs.mkdtempSync(path.join(os.tmpdir(), "taqi-vacio-"))), /No encuentro eas\.json/));
prueba("sin android.package es un error", hay(revisarProyecto(crearProyecto({ appJson: appSin((e) => delete e.android.package) })), /android\.package/));
prueba("android.package inválido (TAQI, 1com.taqi, com..taqi) es un error",
  ["TAQI", "1com.taqi", "com..taqi", "com.taqi-app"].every((p) => hay(revisarProyecto(crearProyecto({ appJson: appSin((e) => { e.android.package = p; }) })), /android\.package/)));
prueba("sin ios.bundleIdentifier es un error", hay(revisarProyecto(crearProyecto({ appJson: appSin((e) => delete e.ios.bundleIdentifier) })), /bundleIdentifier/));
prueba("ios.bundleIdentifier inválido (TAQI, com..taqi, com.taqi_app) es un error",
  ["TAQI", "com..taqi", "com.taqi_app"].every((b) => hay(revisarProyecto(crearProyecto({ appJson: appSin((e) => { e.ios.bundleIdentifier = b; }) })), /bundleIdentifier/)));
{
  const r = revisarProyecto(crearProyecto({ eas: easCon("https://taqi-api.onrender.com", { distribution: "store" }) }));
  prueba("preview sin distribution internal: aviso (no error) para que EAS dé el enlace de instalación", errores(r).length === 0 && hay(avisos(r), /"distribution": "internal"/));
}
prueba("versión mal escrita es un error", hay(revisarProyecto(crearProyecto({ appJson: appSin((e) => { e.version = "1.0"; }) })), /expo\.version/));
prueba("un ícono que no existe es un error", hay(revisarProyecto(crearProyecto({ sinIcono: true })), /no existe el archivo de icon/));
prueba("app.json dañado es un error", hay(revisarProyecto((() => { const d = crearProyecto(); fs.writeFileSync(path.join(d, "app.json"), "{ no es json"); return d; })()), /app\.json no es un JSON válido/));
{
  const lock = leer(path.join(raizReal, "package-lock.json"));
  delete lock.packages[""].dependencies["expo-secure-store"];
  prueba("un lock desactualizado bloquea la compilación y dice qué hacer", hay(revisarProyecto(crearProyecto({ lock })), /npm install/) && hay(revisarProyecto(crearProyecto({ lock })), /expo-secure-store/));
}
prueba("package.json dañado es un error", hay(revisarProyecto((() => { const d = crearProyecto(); fs.writeFileSync(path.join(d, "package.json"), "{ no es json"); return d; })()), /package\.json no es un JSON válido/));
prueba("sin package-lock.json es un error que manda a ejecutar npm install", (() => {
  const d = crearProyecto(); fs.rmSync(path.join(d, "package-lock.json"));
  const r = revisarProyecto(d);
  return hay(r, /package-lock\.json/) && hay(r, /npm install/);
})());

// ---- desde la terminal (código de salida, como lo usa "npm run build:apk") ------------------------------
function terminal(dir, ...extra) {
  const r = spawnSync(process.execPath, [path.join(aqui, "verificar-build.mjs"), "--raiz", dir, ...extra], { encoding: "utf8" });
  return { codigo: r.status, salida: r.stdout + r.stderr };
}
{
  const bien = terminal(crearProyecto());
  prueba("terminal: proyecto listo termina con código 0 y dice LISTO", bien.codigo === 0 && /LISTO para compilar/.test(bien.salida));
  const mal = terminal(crearProyecto({ eas: easCon("http://localhost:3000") }));
  prueba("terminal: proyecto con error termina con código 1 (así 'npm run build:apk' se detiene)", mal.codigo === 1 && /NO está listo/.test(mal.salida));
  const prod = terminal(crearProyecto(), "production");
  prueba("terminal: acepta el perfil como argumento", prod.codigo === 0 && /perfil: production/.test(prod.salida));
  const http = terminal(crearProyecto({ eas: easCon("http://192.168.1.44:3000") }));
  prueba("terminal: una API con http:// detiene la compilación (código 1) y explica por qué", http.codigo === 1 && /usa http:\/\//.test(http.salida) && /NO está listo/.test(http.salida));
}

// ---- el proyecto real -----------------------------------------------------------------------------------
{
  const eas = leer(path.join(raizReal, "eas.json"));
  prueba("eas.json real: preview genera APK de distribución interna", eas.build.preview.android.buildType === "apk" && eas.build.preview.distribution === "internal");
  prueba("eas.json real: preview y production traen EXPO_PUBLIC_API_URL", typeof eas.build.preview.env?.EXPO_PUBLIC_API_URL === "string" && typeof eas.build.production.env?.EXPO_PUBLIC_API_URL === "string");
  const expo = leer(path.join(raizReal, "app.json")).expo;
  prueba("app.json real: bloquea SYSTEM_ALERT_WINDOW y conserva SCHEDULE_EXACT_ALARM (avisos puntuales en Android 14)",
    expo.android.blockedPermissions?.includes("android.permission.SYSTEM_ALERT_WINDOW") && expo.android.permissions?.includes("android.permission.SCHEDULE_EXACT_ALARM"));
  const selector = expo.plugins.find((p) => Array.isArray(p) && p[0] === "expo-image-picker");
  prueba("app.json real: la cámara no pide el micrófono (la app no graba audio)", selector?.[1].microphonePermission === false);
  prueba("no hay app.config.js: con una configuración dinámica 'eas init' no puede guardar el ID del proyecto", !fs.existsSync(path.join(raizReal, "app.config.js")));
  const real = revisarProyecto(raizReal);
  const otros = errores(real).filter((x) => !/texto de ejemplo/.test(x.texto));
  prueba("proyecto real: lo único pendiente (si algo) es poner la dirección de tu API", otros.length === 0, otros.map((x) => x.texto).join(" | "));
}

for (const d of temporales) fs.rmSync(d, { recursive: true, force: true });
console.log(fallos === 0 ? "\n✔ Todas las pruebas de la preparación del APK pasaron" : `\n✘ ${fallos} prueba(s) fallaron`);
process.exit(fallos === 0 ? 0 : 1);
