// Pruebas de la lógica de seguridad de la app (sin celular). Ejecutar: npm run test:seguridad
import { esClaveValida, CLAVE_TOKEN, claveBloqueo, leerConMigracion } from "../utils/sesionSegura.js";
import {
  OPCIONES_TIEMPO,
  TIEMPO_POR_DEFECTO,
  interpretarPreferencia,
  serializarPreferencia,
  debeBloquearAlAbrir,
  debeBloquearAlVolver,
  describirBiometria,
  esCancelacion,
  mensajeDeError,
} from "../utils/bloqueo.js";

let fallos = 0;
function prueba(nombre, condicion, detalle = "") {
  if (condicion) console.log(`✔ ${nombre}${detalle ? "  → " + detalle : ""}`);
  else {
    fallos++;
    console.log(`✘ ${nombre}${detalle ? "  → " + detalle : ""}`);
  }
}

// ---- claves del almacén seguro (si una clave no es válida, la app falla al guardar la sesión) ----
prueba("la clave del token es válida", esClaveValida(CLAVE_TOKEN), CLAVE_TOKEN);
prueba("la clave antigua '@taqi:token' NO era válida (por eso se renombró)", !esClaveValida("@taqi:token"));
prueba("clave de bloqueo con id tipo cuid es válida", esClaveValida(claveBloqueo("cmfx1a2b3c4d5e6f7g8h9i0j")));
prueba("clave de bloqueo con id tipo uuid es válida", esClaveValida(claveBloqueo("3f2b8c1e-9a4d-4e7b-8c11-2a5d6e7f8091")));
prueba("clave de bloqueo con caracteres raros se limpia", esClaveValida(claveBloqueo("a b:c@d")), claveBloqueo("a b:c@d"));
prueba("clave vacía o no texto no es válida", !esClaveValida("") && !esClaveValida(null) && !esClaveValida(42));

// ---- migración del token (almacén antiguo sin cifrar → almacén seguro) ----
function crearAlmacenes({ seguro = null, antiguo = null, fallaGuardado = false } = {}) {
  const estado = { seguro, antiguo, borradoAntiguo: 0, guardadoSeguro: 0 };
  return {
    estado,
    deps: {
      leerSeguro: async () => estado.seguro,
      guardarSeguro: async (v) => {
        if (fallaGuardado) return false;
        estado.guardadoSeguro++;
        estado.seguro = v;
        return true;
      },
      leerAntiguo: async () => estado.antiguo,
      borrarAntiguo: async () => {
        estado.borradoAntiguo++;
        estado.antiguo = null;
      },
    },
  };
}

{
  const { estado, deps } = crearAlmacenes({ antiguo: "token-viejo" });
  const r = await leerConMigracion(deps);
  prueba("migra: devuelve el token antiguo", r === "token-viejo");
  prueba("migra: queda guardado en el almacén seguro", estado.seguro === "token-viejo");
  prueba("migra: se borra la copia sin cifrar", estado.antiguo === null && estado.borradoAntiguo === 1);
}
{
  const { estado, deps } = crearAlmacenes({ seguro: "token-nuevo", antiguo: "token-viejo" });
  const r = await leerConMigracion(deps);
  prueba("si ya hay token seguro, gana el seguro", r === "token-nuevo");
  prueba("si ya hay token seguro, se borra el texto plano sobrante", estado.antiguo === null);
}
{
  const { estado, deps } = crearAlmacenes({ seguro: "token-nuevo" });
  const r = await leerConMigracion(deps);
  prueba("solo seguro: se devuelve y no se toca nada", r === "token-nuevo" && estado.borradoAntiguo === 0 && estado.guardadoSeguro === 0);
}
{
  const { deps } = crearAlmacenes();
  prueba("sin ningún token: devuelve null", (await leerConMigracion(deps)) === null);
}
{
  const { estado, deps } = crearAlmacenes({ antiguo: "token-viejo", fallaGuardado: true });
  const r = await leerConMigracion(deps);
  prueba("si falla guardar en el seguro, NO se borra el antiguo (no se pierde la sesión)", r === "token-viejo" && estado.antiguo === "token-viejo");
}

// ---- preferencias del bloqueo ----
const porDefecto = { activado: false, tiempoSeg: TIEMPO_POR_DEFECTO };
prueba("sin dato guardado: desactivado y 30 s", JSON.stringify(interpretarPreferencia(null)) === JSON.stringify(porDefecto));
prueba("dato dañado: desactivado y 30 s", JSON.stringify(interpretarPreferencia("{no es json")) === JSON.stringify(porDefecto));
prueba("lee activado y 60 s", JSON.stringify(interpretarPreferencia('{"a":true,"t":60}')) === JSON.stringify({ activado: true, tiempoSeg: 60 }));
prueba("tiempo no permitido vuelve a 30 s", interpretarPreferencia('{"a":true,"t":999}').tiempoSeg === 30);
prueba("'activado' solo vale si es exactamente true", interpretarPreferencia('{"a":"true","t":30}').activado === false && interpretarPreferencia('{"a":1}').activado === false);
prueba("guardar y leer da lo mismo", JSON.stringify(interpretarPreferencia(serializarPreferencia({ activado: true, tiempoSeg: 300 }))) === JSON.stringify({ activado: true, tiempoSeg: 300 }));
prueba("hay 4 opciones de tiempo y empiezan en 'Al salir'", OPCIONES_TIEMPO.length === 4 && OPCIONES_TIEMPO[0].segundos === 0);

// ---- cuándo bloquear ----
prueba("al abrir: bloquea si está activado y hay sesión", debeBloquearAlAbrir({ activado: true, haySesion: true }) === true);
prueba("al abrir: no bloquea sin sesión o desactivado", !debeBloquearAlAbrir({ activado: true, haySesion: false }) && !debeBloquearAlAbrir({ activado: false, haySesion: true }));

const t0 = 1_000_000;
const base = { activado: true, haySesion: true, segundoPlanoDesde: t0, tiempoSeg: 30 };
prueba("volver a los 10 s con límite de 30 s: NO bloquea", debeBloquearAlVolver({ ...base, ahora: t0 + 10_000 }) === false);
prueba("volver justo a los 30 s: bloquea", debeBloquearAlVolver({ ...base, ahora: t0 + 30_000 }) === true);
prueba("volver a los 2 min: bloquea", debeBloquearAlVolver({ ...base, ahora: t0 + 120_000 }) === true);
prueba("modo 'Al salir' (0 s): bloquea siempre", debeBloquearAlVolver({ ...base, tiempoSeg: 0, ahora: t0 }) === true);
prueba("desactivado: nunca bloquea", debeBloquearAlVolver({ ...base, activado: false, ahora: t0 + 999_999 }) === false);
prueba("sin sesión: no bloquea", debeBloquearAlVolver({ ...base, haySesion: false, ahora: t0 + 999_999 }) === false);
prueba("si nunca pasó a segundo plano: no bloquea", debeBloquearAlVolver({ ...base, segundoPlanoDesde: null, ahora: t0 + 999_999 }) === false);
prueba("si el reloj retrocedió: bloquea por seguridad", debeBloquearAlVolver({ ...base, ahora: t0 - 5_000 }) === true);

// ---- biometría ----
prueba("describe huella", describirBiometria([1]) === "huella");
prueba("describe rostro", describirBiometria([2]) === "rostro");
prueba("describe huella o rostro", describirBiometria([2, 1]) === "huella o rostro");
prueba("sin datos: 'biometría'", describirBiometria([]) === "biometría" && describirBiometria(undefined) === "biometría");
prueba("cancelar no es error (sin mensaje)", esCancelacion("user_cancel") && mensajeDeError("user_cancel") === null && mensajeDeError("system_cancel") === null);
prueba("lockout, sin huellas registradas y fallo tienen mensaje propio",
  mensajeDeError("lockout").includes("intentos") && mensajeDeError("not_enrolled").includes("registrad") && mensajeDeError("authentication_failed").includes("reconocimos"));
prueba("un error desconocido tiene mensaje genérico", typeof mensajeDeError("algo_raro") === "string" && mensajeDeError("algo_raro").length > 10);

console.log(fallos === 0 ? "\n✔ Todas las pruebas de seguridad pasaron" : `\n✘ ${fallos} prueba(s) fallaron`);
process.exit(fallos === 0 ? 0 : 1);
