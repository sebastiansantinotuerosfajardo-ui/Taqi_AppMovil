// Pruebas de la renovación automática de sesión de la app (sin celular y sin servidor real).
// Ejecutar:  npm run test:sesion
// Usan un "servidor falso" en memoria que se comporta como la API real: el token de acceso vence y el
// refresh token rota (si se reutiliza uno ya usado, el servidor cierra la sesión).
import { clasificarRenovacion, crearEmisor, crearRenovadorUnico, debeRenovar } from "../utils/renovacion.js";
import { crearClienteApi } from "../utils/clienteApi.js";
import { CLAVE_REFRESH, CLAVE_TOKEN, esClaveValida } from "../utils/sesionSegura.js";

let fallos = 0;
const verificar = (nombre, condicion, detalle = "") => {
  console.log(`${condicion ? "✔" : "✘"} ${nombre}${detalle ? "  → " + detalle : ""}`);
  if (!condicion) fallos++;
};
const pausa = (ms = 1) => new Promise((r) => setTimeout(r, ms));
const BASE = "http://api.test";

// ----------------------------------------------------------------- servidor falso + almacén falso
function crearEscenario({ token = "A1", refresh = "R1" } = {}) {
  const servidor = {
    accesoValido: "A1", // el único token de acceso que el servidor acepta ahora
    refreshVigente: "R1",
    refreshUsados: new Set(),
    sesionCerrada: false, // se pone en true cuando detecta un refresh token reutilizado
    contador: 1,
    llamadas: [],
    sinRed: false, // simula que no hay internet
    sinRedSoloRefresh: false,
    refreshRespondeCon: null, // fuerza un estado (500, 429...) en /auth/refresh
    siempre401: false, // /datos responde 401 aunque el token sea el correcto
  };
  const respuesta = (estado, cuerpo) => ({ ok: estado >= 200 && estado < 300, status: estado, json: async () => cuerpo });

  const fetchFn = async (url, { method, headers, body }) => {
    const ruta = url.replace(BASE, "");
    servidor.llamadas.push(`${method} ${ruta}`);
    await pausa();
    if (servidor.sinRed || (servidor.sinRedSoloRefresh && ruta === "/auth/refresh")) throw new TypeError("Network request failed");

    if (ruta === "/auth/refresh") {
      const { refreshToken } = JSON.parse(body);
      if (servidor.refreshRespondeCon) return respuesta(servidor.refreshRespondeCon, { ok: false });
      if (servidor.sesionCerrada) return respuesta(401, { ok: false, codigo: "sesion_invalida" });
      if (servidor.refreshUsados.has(refreshToken)) {
        servidor.sesionCerrada = true; // reutilización detectada: se cierra toda la cadena
        servidor.reutilizacionDetectada = true;
        return respuesta(401, { ok: false, codigo: "sesion_invalida" });
      }
      if (refreshToken !== servidor.refreshVigente) return respuesta(401, { ok: false, codigo: "sesion_invalida" });
      servidor.refreshUsados.add(refreshToken);
      servidor.contador += 1;
      servidor.accesoValido = `A${servidor.contador}`;
      servidor.refreshVigente = `R${servidor.contador}`;
      return respuesta(200, { ok: true, token: servidor.accesoValido, refreshToken: servidor.refreshVigente, expiresIn: 900 });
    }
    if (ruta === "/auth/login") return respuesta(401, { ok: false, error: "Correo o contraseña incorrectos" });
    // rutas protegidas
    if (servidor.siempre401 || servidor.sesionCerrada || headers.Authorization !== `Bearer ${servidor.accesoValido}`) {
      return respuesta(401, { ok: false, codigo: "token_vencido" });
    }
    return respuesta(200, { ok: true, datos: { ruta } });
  };

  const almacen = { token, refresh, guardados: 0, borrados: 0, caducadas: 0 };
  const cliente = crearClienteApi({
    baseUrl: BASE,
    fetchFn,
    leerToken: async () => almacen.token,
    leerRefresh: async () => almacen.refresh,
    guardarSesion: async ({ token: t, refreshToken: r }) => {
      almacen.token = t;
      almacen.refresh = r;
      almacen.guardados++;
    },
    borrarSesion: async () => {
      almacen.token = null;
      almacen.refresh = null;
      almacen.borrados++;
    },
    avisarCaducada: () => almacen.caducadas++,
  });
  return { servidor, almacen, ...cliente };
}
const vencerAcceso = (e) => (e.servidor.accesoValido = "TOKEN-NUEVO-QUE-LA-APP-NO-TIENE");
const refrescos = (e) => e.servidor.llamadas.filter((l) => l === "POST /auth/refresh").length;

// ----------------------------------------------------------------- lógica pura
verificar("las claves del almacén seguro son válidas y distintas", esClaveValida(CLAVE_REFRESH) && esClaveValida(CLAVE_TOKEN) && CLAVE_REFRESH !== CLAVE_TOKEN, `${CLAVE_TOKEN} / ${CLAVE_REFRESH}`);

verificar("debeRenovar: solo con 401, con sesión, sin reintento previo y con refresh token", [
  debeRenovar({ estado: 401, conSesion: true, yaReintentado: false, hayRefresh: true }) === true,
  debeRenovar({ estado: 401, conSesion: false, yaReintentado: false, hayRefresh: true }) === false, // login con clave incorrecta
  debeRenovar({ estado: 401, conSesion: true, yaReintentado: true, hayRefresh: true }) === false, // nunca dos veces
  debeRenovar({ estado: 401, conSesion: true, yaReintentado: false, hayRefresh: false }) === false,
  debeRenovar({ estado: 500, conSesion: true, yaReintentado: false, hayRefresh: true }) === false,
  debeRenovar({ estado: 0, conSesion: true, yaReintentado: false, hayRefresh: true }) === false, // sin conexión
  debeRenovar({ estado: 200, conSesion: true, yaReintentado: false, hayRefresh: true }) === false,
].every(Boolean));

verificar("clasificarRenovacion distingue renovada / caducada / sin conexión", [
  clasificarRenovacion({ ok: true, token: "a", refreshToken: "b", estado: 200 }) === "renovada",
  clasificarRenovacion({ ok: true, estado: 200 }) === "sin-conexion", // respuesta rara sin tokens: no se confía
  clasificarRenovacion({ ok: false, estado: 401 }) === "caducada",
  clasificarRenovacion({ ok: false, estado: 403 }) === "caducada",
  clasificarRenovacion({ ok: false, estado: 400 }) === "caducada",
  clasificarRenovacion({ ok: false, sinConexion: true, estado: 0 }) === "sin-conexion",
  clasificarRenovacion({ ok: false, estado: 500 }) === "sin-conexion",
  clasificarRenovacion({ ok: false, estado: 429 }) === "sin-conexion",
  clasificarRenovacion(null) === "sin-conexion",
].every(Boolean));

{
  let ejecuciones = 0;
  const una = crearRenovadorUnico(async () => {
    ejecuciones++;
    await pausa(5);
    return `resultado-${ejecuciones}`;
  });
  const [a, b, c] = await Promise.all([una(), una(), una()]);
  verificar("renovador único: 3 llamadas simultáneas ejecutan UNA sola renovación y comparten el resultado", ejecuciones === 1 && a === b && b === c, `${ejecuciones} ejecución`);
  const d = await una();
  verificar("renovador único: después de terminar, una llamada nueva vuelve a ejecutar", ejecuciones === 2 && d === "resultado-2");

  let intento = 0;
  const falla = crearRenovadorUnico(async () => {
    intento++;
    if (intento === 1) throw new Error("falló");
    return "bien";
  });
  const e1 = await falla().catch((e) => e.message);
  const e2 = await falla();
  verificar("renovador único: si falla, el error llega a quien esperaba y el siguiente intento funciona", e1 === "falló" && e2 === "bien");
}

{
  const emisor = crearEmisor();
  const visto = [];
  const baja = emisor.suscribir((x) => visto.push(["a", x]));
  emisor.suscribir(() => {
    throw new Error("oyente roto");
  });
  emisor.suscribir((x) => visto.push(["c", x]));
  emisor.emitir(1);
  baja();
  emisor.emitir(2);
  verificar("emisor (Observer): avisa a todos, aunque uno falle, y respeta la baja", JSON.stringify(visto) === JSON.stringify([["a", 1], ["c", 1], ["c", 2]]) && emisor.cantidad() === 2);
}

// ----------------------------------------------------------------- cliente + servidor falso
{
  const e = crearEscenario();
  const r = await e.llamarApi("/datos");
  verificar("token vigente: una sola llamada y sin renovar", r.ok && r.estado === 200 && e.servidor.llamadas.length === 1 && refrescos(e) === 0);
}

{
  const e = crearEscenario();
  vencerAcceso(e); // el token de acceso de la app ya no sirve
  e.servidor.accesoValido = "A1-vencido";
  e.servidor.refreshVigente = "R1";
  const r = await e.llamarApi("/datos");
  verificar("token vencido: se renueva solo y la petición se repite con éxito", r.ok && r.estado === 200, e.servidor.llamadas.join(" > "));
  verificar("  la secuencia fue GET /datos > POST /auth/refresh > GET /datos", e.servidor.llamadas.join(" > ") === "GET /datos > POST /auth/refresh > GET /datos");
  verificar("  los tokens nuevos quedaron guardados (acceso y refresh)", e.almacen.token === "A2" && e.almacen.refresh === "R2" && e.almacen.guardados === 1, `${e.almacen.token}/${e.almacen.refresh}`);
  verificar("  no se avisó de sesión caducada", e.almacen.caducadas === 0);
}

{
  const e = crearEscenario();
  vencerAcceso(e);
  const rs = await Promise.all(Array.from({ length: 5 }, () => e.llamarApi("/datos")));
  verificar("5 peticiones simultáneas con el token vencido: todas terminan bien", rs.every((r) => r.ok), rs.map((r) => r.estado).join());
  verificar("  se hizo UNA sola renovación (si fueran 5, el servidor vería el refresh token reutilizado)", refrescos(e) === 1, `${refrescos(e)} renovaciones`);
  verificar("  el servidor no detectó reutilización ni cerró la sesión", !e.servidor.reutilizacionDetectada && !e.servidor.sesionCerrada);
}

{
  const e = crearEscenario();
  vencerAcceso(e);
  await e.llamarApi("/datos"); // 1.ª renovación: R1 -> R2
  e.servidor.accesoValido = "OTRO-QUE-LA-APP-NO-TIENE";
  const r = await e.llamarApi("/datos"); // 2.ª renovación: usa R2 -> R3
  verificar("dos vencimientos seguidos: la cadena de refresh tokens rota sin errores", r.ok && e.almacen.refresh === "R3" && !e.servidor.reutilizacionDetectada, `${e.almacen.refresh}`);
}

{
  const e = crearEscenario();
  vencerAcceso(e);
  e.servidor.sesionCerrada = true; // p. ej. se cambió la contraseña desde otro lugar
  const rs = await Promise.all([e.llamarApi("/datos"), e.llamarApi("/datos"), e.llamarApi("/auth/me")]);
  verificar("sesión que el servidor ya no acepta: las peticiones reciben 401", rs.every((r) => r.estado === 401 && !r.ok));
  verificar("  se borraron los tokens y se avisó UNA sola vez (aunque fueran 3 peticiones)", e.almacen.token === null && e.almacen.refresh === null && e.almacen.caducadas === 1, `avisos: ${e.almacen.caducadas}`);
}

{
  const e = crearEscenario();
  vencerAcceso(e);
  e.servidor.sinRedSoloRefresh = true;
  const r = await e.llamarApi("/datos");
  verificar("sin internet al renovar: responde 'sin conexión' y NO cierra la sesión", r.sinConexion === true && r.estado === 0 && e.almacen.token === "A1" && e.almacen.refresh === "R1" && e.almacen.caducadas === 0 && e.almacen.borrados === 0);
  e.servidor.sinRedSoloRefresh = false;
  const r2 = await e.llamarApi("/datos");
  verificar("  al volver internet, la siguiente petición renueva y funciona", r2.ok && e.almacen.refresh === "R2");
}

for (const estado of [500, 503, 429]) {
  const e = crearEscenario();
  vencerAcceso(e);
  e.servidor.refreshRespondeCon = estado;
  const r = await e.llamarApi("/datos");
  verificar(`el servidor falla al renovar (${estado}): no se cierra la sesión`, r.sinConexion === true && e.almacen.refresh === "R1" && e.almacen.caducadas === 0);
}

{
  const e = crearEscenario();
  const r = await e.llamarApi("/auth/login", { metodo: "POST", cuerpo: { identifier: "a", password: "mala" }, conSesion: false });
  verificar("login con contraseña incorrecta (401): se devuelve tal cual, SIN intentar renovar ni cerrar nada", r.estado === 401 && r.error === "Correo o contraseña incorrectos" && refrescos(e) === 0 && e.almacen.caducadas === 0 && e.almacen.token === "A1");
}

{
  const e = crearEscenario({ token: null, refresh: null });
  const r = await e.llamarApi("/datos");
  verificar("sin tokens guardados: 401 directo, sin renovar", r.estado === 401 && refrescos(e) === 0);
}

{
  const e = crearEscenario({ token: null, refresh: "R1" }); // se perdió el token de acceso pero queda el de renovación
  const r = await e.llamarApi("/auth/me");
  verificar("sin token de acceso pero con refresh token: renueva y entra", r.ok && e.almacen.token === "A2");
}

{
  const e = crearEscenario();
  vencerAcceso(e);
  e.servidor.siempre401 = true; // aunque se renueve, el servidor sigue diciendo 401
  const r = await e.llamarApi("/datos");
  verificar("si tras renovar sigue el 401: no hay bucle (máximo 1 renovación y 1 reintento)", r.estado === 401 && e.servidor.llamadas.length === 3 && refrescos(e) === 1, e.servidor.llamadas.join(" > "));
}

{
  const e = crearEscenario();
  e.servidor.sinRed = true;
  const r = await e.llamarApi("/datos");
  verificar("sin internet desde el inicio: 'sin conexión', sin tocar los tokens", r.sinConexion === true && refrescos(e) === 0 && e.almacen.token === "A1");
}

console.log(fallos === 0 ? "\n✔ Todas las pruebas de renovación de sesión pasaron" : `\n✘ ${fallos} prueba(s) fallaron`);
process.exit(fallos === 0 ? 0 : 1);
