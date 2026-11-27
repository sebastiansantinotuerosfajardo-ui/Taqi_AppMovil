import { clasificarRenovacion, crearRenovadorUnico, debeRenovar } from "./renovacion.js";

// Cliente HTTP de la API de TAQI, sin dependencias de React Native: recibe de fuera (inyección de
// dependencias) cómo guardar los tokens y cómo hacer la petición. Así se puede probar en Node con
// un servidor falso (npm run test:sesion). services/backend.js lo conecta con el almacén seguro real.
//
// Qué hace por encima de un simple fetch:
//  1. Agrega el token de acceso (que dura 15 minutos).
//  2. Si el servidor responde "401" (el token venció), canjea el refresh token por tokens nuevos y
//     REPITE la petición una vez, sin que la persona se entere (patrón Interceptor).
//  3. Varias peticiones fallidas a la vez comparten UNA sola renovación (single-flight).
//  4. Si el servidor dice que la sesión ya no vale, borra los tokens y avisa UNA vez (patrón Observer).
//  5. Si no hay internet durante la renovación, NO cierra la sesión: responde "sin conexión".

const MENSAJE_SIN_CONEXION = "No se pudo conectar con el servidor. Revisa tu conexión";
export const respuestaSinConexion = () => ({ ok: false, sinConexion: true, estado: 0, error: MENSAJE_SIN_CONEXION });

export function crearClienteApi({
  baseUrl,
  fetchFn = (...args) => fetch(...args),
  leerToken,
  leerRefresh,
  guardarSesion, // ({ token, refreshToken }) => Promise
  borrarSesion, // () => Promise
  avisarCaducada, // () => void  (se llama una vez cuando la sesión ya no se puede renovar)
  timeoutMs = 10000,
  registrar = () => {},
}) {
  // Una sola petición, sin reintentos. Siempre devuelve { ok, estado, ...respuesta }.
  async function enviar(ruta, { metodo = "GET", cuerpo, token } = {}) {
    const controller = new AbortController();
    const temporizador = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const headers = { "Content-Type": "application/json" };
      if (token) headers.Authorization = `Bearer ${token}`;
      const respuesta = await fetchFn(`${baseUrl}${ruta}`, {
        method: metodo,
        headers,
        body: cuerpo !== undefined ? JSON.stringify(cuerpo) : undefined,
        signal: controller.signal,
      });
      let datos = {};
      try {
        datos = await respuesta.json();
      } catch {
        // respuesta sin cuerpo JSON
      }
      return { ...datos, ok: respuesta.ok && datos.ok !== false, estado: respuesta.status };
    } catch (error) {
      registrar(`No se pudo conectar con la API (${metodo} ${ruta})`, error);
      return respuestaSinConexion();
    } finally {
      clearTimeout(temporizador);
    }
  }

  // Canjea el refresh token por un par nuevo. Se ejecuta de a una vez aunque lo pidan varias peticiones.
  const renovarSesion = crearRenovadorUnico(async () => {
    const refreshToken = await leerRefresh();
    if (!refreshToken) return "caducada"; // no hay sesión que renovar (otra petición ya la cerró)
    const r = await enviar("/auth/refresh", { metodo: "POST", cuerpo: { refreshToken } });
    const resultado = clasificarRenovacion(r);
    if (resultado === "renovada") {
      await guardarSesion({ token: r.token, refreshToken: r.refreshToken });
    } else if (resultado === "caducada") {
      await borrarSesion();
      avisarCaducada();
    }
    return resultado;
  });

  async function llamarApi(ruta, { metodo = "GET", cuerpo, conSesion = true } = {}) {
    const token = conSesion ? await leerToken() : null;
    const primera = await enviar(ruta, { metodo, cuerpo, token });

    const hayRefresh = conSesion && Boolean(await leerRefresh());
    if (!debeRenovar({ estado: primera.estado, conSesion, yaReintentado: false, hayRefresh })) return primera;

    // Si mientras tanto otra petición ya renovó los tokens, basta con repetir con el token nuevo.
    const actual = await leerToken();
    if (actual && actual !== token) return enviar(ruta, { metodo, cuerpo, token: actual });

    const resultado = await renovarSesion();
    if (resultado === "renovada") return enviar(ruta, { metodo, cuerpo, token: await leerToken() });
    if (resultado === "sin-conexion") return respuestaSinConexion();
    return primera; // "caducada": se devuelve el 401; la app ya recibió el aviso para pedir iniciar sesión
  }

  return { llamarApi, renovarSesion };
}
