import { getItem, removeItem, KEYS } from "./storage";
import { leerSeguro, guardarSeguro, borrarSeguro } from "./secureStore";
import { CLAVE_TOKEN, leerConMigracion } from "../utils/sesionSegura";
import { logger } from "./logger";

// Dirección de la API de TAQI. Se define en el archivo .env de la raíz del proyecto:
//   EXPO_PUBLIC_API_URL=http://192.168.1.50:3000   (IP de tu PC en la red, si pruebas con el celular)
//   EXPO_PUBLIC_API_URL=https://tu-api.onrender.com (API publicada)
const BASE_URL = (process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000").replace(/\/$/, "");
const TIMEOUT_MS = 10000;

let tokenEnMemoria = null;

// El token de sesión es el dato más sensible de la app: se guarda en el almacén cifrado del sistema
// (Keystore/Keychain), no en AsyncStorage. Si una versión anterior lo dejó en AsyncStorage,
// se mueve al almacén seguro la primera vez y se borra la copia sin cifrar.
export async function leerToken() {
  if (tokenEnMemoria) return tokenEnMemoria;
  tokenEnMemoria = await leerConMigracion({
    leerSeguro: () => leerSeguro(CLAVE_TOKEN),
    guardarSeguro: (valor) => guardarSeguro(CLAVE_TOKEN, valor),
    leerAntiguo: () => getItem(KEYS.token, null),
    borrarAntiguo: () => removeItem(KEYS.token),
  });
  return tokenEnMemoria;
}

export async function guardarToken(token) {
  tokenEnMemoria = token;
  const guardado = await guardarSeguro(CLAVE_TOKEN, token);
  await removeItem(KEYS.token); // nunca dejar una copia sin cifrar
  return guardado;
}

export async function borrarToken() {
  tokenEnMemoria = null;
  await removeItem(KEYS.token);
  return borrarSeguro(CLAVE_TOKEN);
}

// Llama a la API y devuelve siempre { ok, estado, ...respuesta }.
// Si no hay red o el servidor no responde, devuelve { ok: false, sinConexion: true }.
export async function llamarApi(ruta, { metodo = "GET", cuerpo, conSesion = true } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const headers = { "Content-Type": "application/json" };
    if (conSesion) {
      const token = await leerToken();
      if (token) headers.Authorization = `Bearer ${token}`;
    }
    const respuesta = await fetch(`${BASE_URL}${ruta}`, {
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
    logger.warn("backend", `No se pudo conectar con la API (${metodo} ${ruta})`, error);
    return { ok: false, sinConexion: true, estado: 0, error: "No se pudo conectar con el servidor. Revisa tu conexión" };
  } finally {
    clearTimeout(timer);
  }
}
