// Revisa, ANTES de gastar una compilación en EAS, que el proyecto esté listo para generar el APK.
//
// Uso:   npm run verificar:build            (perfil "preview", el APK para el celular)
//        node scripts/verificar-build.mjs production
// Termina con código 1 si hay algún ✘ (así "npm run build:apk" no sigue). Los ⚠ son avisos y no impiden compilar.
//
// Qué comprueba:
//   1. eas.json: que el perfil genere un APK y que tenga la dirección https de TU API (no el texto de ejemplo,
//      no "localhost": en otro celular esa dirección no existe; no http://: un APK instalado la bloquea).
//   2. app.json: nombre, versión, identificadores del paquete (Android e iOS), íconos que existen y si el
//      proyecto ya está enlazado con tu cuenta de Expo (aviso, no error).
//   3. package.json y package-lock.json: que estén sincronizados (si no, la compilación no es reproducible).
// Las pruebas de este archivo están en scripts/probar-build.mjs (npm run test:build).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const TEXTO_DE_EJEMPLO = /PON-AQUI|TU-API|TU_API|EJEMPLO|EXAMPLE|CAMBIA/i;
const PAQUETE_ANDROID = /^[A-Za-z][A-Za-z0-9_]*(\.[A-Za-z][A-Za-z0-9_]*)+$/;
const IDENTIFICADOR_IOS = /^[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+$/;
const VERSION = /^\d+\.\d+\.\d+$/;

const SIMBOLO = { ok: "✔", aviso: "⚠", error: "✘" };

function leerJson(ruta) {
  let texto;
  try {
    texto = fs.readFileSync(ruta, "utf8");
  } catch {
    return { ok: false, mensaje: `No encuentro ${path.basename(ruta)}.` };
  }
  try {
    return { ok: true, valor: JSON.parse(texto.replace(/^﻿/, "")) };
  } catch (error) {
    return { ok: false, mensaje: `${path.basename(ruta)} no es un JSON válido (${error.message}).` };
  }
}

// ---------------------------------------------------------------------------------------------
// Dirección de la API
// ---------------------------------------------------------------------------------------------
export function revisarUrlApi(valor) {
  const texto = typeof valor === "string" ? valor.trim() : "";
  if (!texto) {
    return [{ nivel: "error", texto: "Falta EXPO_PUBLIC_API_URL en este perfil de eas.json: la app no sabría a qué servidor conectarse." }];
  }
  if (TEXTO_DE_EJEMPLO.test(texto)) {
    return [{ nivel: "error", texto: `EXPO_PUBLIC_API_URL todavía tiene el texto de ejemplo (${texto}). Reemplázalo por la dirección real de tu API.` }];
  }
  let url;
  try {
    url = new URL(texto);
  } catch {
    return [{ nivel: "error", texto: `EXPO_PUBLIC_API_URL no es una dirección válida: ${texto}` }];
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    return [{ nivel: "error", texto: `EXPO_PUBLIC_API_URL debe empezar con https://, no con ${url.protocol}//` }];
  }
  const host = url.hostname;
  if (/^(localhost|127\.|0\.0\.0\.0|10\.0\.2\.2|\[::1\]$)/i.test(host)) {
    return [{ nivel: "error", texto: `EXPO_PUBLIC_API_URL apunta a tu propio equipo (${host}): en el celular esa dirección no existe. Usa la dirección https de tu API publicada.` }];
  }
  // Android 9 o superior bloquea el tráfico sin cifrar en un APK instalado (en Expo Go sí funciona).
  if (url.protocol === "http:") {
    return [{ nivel: "error", texto: `EXPO_PUBLIC_API_URL usa http:// (${url.origin}): un APK instalado no puede conectarse a una dirección sin cifrar. Publica la API en Render y usa su dirección https://. Para probar con tu PC usa Expo Go, no el APK.` }];
  }

  const r = [{ nivel: "ok", texto: `API: ${url.origin} (https, cifrada)` }];
  if ((url.pathname && url.pathname !== "/") || url.search || url.hash) {
    r.push({ nivel: "aviso", texto: "La dirección lleva una ruta o parámetros: debe ser solo el dominio (la app agrega /auth/login, /datos, etc.)." });
  }
  if (/\.onrender\.com$/i.test(host)) {
    r.push({ nivel: "aviso", texto: `Render gratis duerme el servidor tras 15 minutos sin uso y tarda cerca de 1 minuto en despertar: abre ${url.origin}/salud un minuto antes de usar el APK.` });
  }
  return r;
}

// ---------------------------------------------------------------------------------------------
// package.json contra package-lock.json
// ---------------------------------------------------------------------------------------------
export function revisarLock(pkg, lock) {
  const raiz = lock && lock.packages && lock.packages[""];
  if (!raiz) return ["package-lock.json no tiene el formato esperado (lockfileVersion 2 o 3)."];
  const problemas = [];
  for (const tipo of ["dependencies", "devDependencies"]) {
    for (const [nombre, rango] of Object.entries(pkg[tipo] || {})) {
      const enLock = raiz[tipo] && raiz[tipo][nombre];
      if (enLock === undefined) problemas.push(`${nombre} está en package.json pero no en package-lock.json`);
      else if (enLock !== rango) problemas.push(`${nombre}: package.json pide ${rango} y el lock tiene ${enLock}`);
      else if (!lock.packages[`node_modules/${nombre}`]) problemas.push(`${nombre} no tiene su entrada de instalación en package-lock.json`);
    }
  }
  return problemas;
}

// ---------------------------------------------------------------------------------------------
// Revisión del proyecto
// ---------------------------------------------------------------------------------------------
export function revisarProyecto(raiz, perfil = "preview") {
  const r = [];
  const ok = (texto) => r.push({ nivel: "ok", texto });
  const aviso = (texto) => r.push({ nivel: "aviso", texto });
  const error = (texto) => r.push({ nivel: "error", texto });

  // 1. eas.json -------------------------------------------------------------------------------
  const eas = leerJson(path.join(raiz, "eas.json"));
  if (!eas.ok) {
    error(eas.mensaje + " Aplica P5 o crea eas.json.");
  } else {
    const config = eas.valor;
    const compilacion = config.build && config.build[perfil];
    if (!compilacion) {
      const que = Object.keys(config.build || {});
      error(`eas.json no tiene el perfil "${perfil}". Perfiles que hay: ${que.length ? que.join(", ") : "ninguno"}.`);
    } else {
      if (config.cli && config.cli.appVersionSource) ok(`eas.json: la versión interna (versionCode) la lleva EAS (${config.cli.appVersionSource})`);
      else aviso("eas.json no define cli.appVersionSource: EAS puede preguntarte o avisarte al compilar.");

      if (compilacion.android && compilacion.android.buildType === "apk") {
        ok(`eas.json: el perfil "${perfil}" genera un APK, que se instala directo en el celular`);
      } else if (perfil === "production") {
        aviso('El perfil "production" genera un .aab (formato de Google Play): no se instala directo en el celular. Para el celular usa el perfil "preview".');
      } else {
        error(`El perfil "${perfil}" no genera un APK: agrega "android": { "buildType": "apk" }. Sin eso EAS crea un .aab que NO se puede instalar en el celular.`);
      }
      if (perfil === "preview" && compilacion.distribution !== "internal") {
        aviso('El perfil "preview" debería tener "distribution": "internal" (así EAS te da un enlace para instalar el APK).');
      }
      r.push(...revisarUrlApi(compilacion.env && compilacion.env.EXPO_PUBLIC_API_URL));
    }
  }

  // 2. app.json -------------------------------------------------------------------------------
  const app = leerJson(path.join(raiz, "app.json"));
  if (!app.ok) {
    error(app.mensaje);
  } else {
    const expo = app.valor.expo || {};
    if (expo.name && expo.slug) ok(`app.json: nombre "${expo.name}", versión ${expo.version || "?"}`);
    else error("app.json debe tener expo.name y expo.slug.");
    if (!VERSION.test(expo.version || "")) error(`expo.version debe verse como 1.0.0 (tiene "${expo.version}").`);

    const paquete = expo.android && expo.android.package;
    if (paquete && PAQUETE_ANDROID.test(paquete)) ok(`app.json: paquete de Android ${paquete}`);
    else error(`Falta expo.android.package o no es válido (ejemplo: com.taqi.app). Tiene: ${paquete || "nada"}.`);

    const bundle = expo.ios && expo.ios.bundleIdentifier;
    if (bundle && IDENTIFICADOR_IOS.test(bundle)) ok(`app.json: identificador de iOS ${bundle}`);
    else error(`Falta expo.ios.bundleIdentifier o no es válido (ejemplo: com.taqi.app). Tiene: ${bundle || "nada"}.`);

    const adaptativo = (expo.android && expo.android.adaptiveIcon) || {};
    const imagenes = [
      ["icon", expo.icon],
      ["android.adaptiveIcon.foregroundImage", adaptativo.foregroundImage],
      ["android.adaptiveIcon.backgroundImage", adaptativo.backgroundImage],
    ];
    const faltan = imagenes.filter(([, ruta]) => !ruta || !fs.existsSync(path.join(raiz, ruta)));
    if (faltan.length === 0) ok("app.json: los íconos existen");
    else for (const [clave, ruta] of faltan) error(`app.json: no existe el archivo de ${clave} (${ruta || "sin definir"}).`);

    // "eas init" (o la primera compilación) guarda aquí el ID del proyecto. Sin él EAS pregunta si lo crea: no es un error.
    if (expo.extra && expo.extra.eas && expo.extra.eas.projectId) ok("app.json: el proyecto ya está enlazado con tu cuenta de Expo");
    else aviso("El proyecto todavía no está enlazado con tu cuenta de Expo (falta extra.eas.projectId en app.json). En la primera compilación EAS te preguntará si lo crea: responde que sí, o ejecuta antes:  npx eas-cli init");
  }

  // 3. dependencias ---------------------------------------------------------------------------
  const pkg = leerJson(path.join(raiz, "package.json"));
  const lock = leerJson(path.join(raiz, "package-lock.json"));
  if (!pkg.ok) {
    error(pkg.mensaje);
  } else {
    if (!lock.ok) {
      error(lock.mensaje + " Ejecuta npm install.");
    } else {
      const problemas = revisarLock(pkg.valor, lock.valor);
      if (problemas.length === 0) ok("package-lock.json está sincronizado con package.json");
      else {
        error(`package-lock.json no coincide con package.json (${problemas.length} diferencia${problemas.length === 1 ? "" : "s"}). Ejecuta npm install y guarda el cambio con Git.`);
        for (const p of problemas.slice(0, 5)) error(`   · ${p}`);
        if (problemas.length > 5) error(`   · …y ${problemas.length - 5} más`);
      }
    }
  }
  return r;
}

// ---------------------------------------------------------------------------------------------
// Uso desde la terminal
// ---------------------------------------------------------------------------------------------
function main() {
  const argumentos = process.argv.slice(2);
  const iRaiz = argumentos.indexOf("--raiz");
  const raiz = iRaiz >= 0 ? path.resolve(argumentos[iRaiz + 1] || ".") : process.cwd();
  const iValorRaiz = iRaiz >= 0 ? iRaiz + 1 : -1; // la ruta que sigue a --raiz no es un perfil
  const perfil = argumentos.find((a, i) => !a.startsWith("--") && i !== iValorRaiz) || "preview";

  console.log(`TAQI · revisión antes de compilar (perfil: ${perfil})\n`);
  const resultados = revisarProyecto(raiz, perfil);
  for (const x of resultados) console.log(`  ${SIMBOLO[x.nivel]} ${x.texto}`);

  const errores = resultados.filter((x) => x.nivel === "error").length;
  const avisos = resultados.filter((x) => x.nivel === "aviso").length;
  console.log("");
  if (errores > 0) {
    console.log(`NO está listo: corrige ${errores} ✘ y vuelve a ejecutar:  npm run verificar:build`);
    process.exitCode = 1;
  } else {
    console.log(avisos > 0 ? `LISTO para compilar (con ${avisos} aviso${avisos === 1 ? "" : "s"} ⚠: léelos).` : "LISTO para compilar.");
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) main();
