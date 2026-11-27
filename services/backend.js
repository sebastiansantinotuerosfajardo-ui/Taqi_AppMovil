import { getItem, removeItem, KEYS } from "./storage";
import { leerSeguro, guardarSeguro, borrarSeguro } from "./secureStore";
import { CLAVE_TOKEN, CLAVE_REFRESH, leerConMigracion } from "../utils/sesionSegura";
import { crearClienteApi } from "../utils/clienteApi";
import { avisarSesionCaducada } from "./sesionEventos";
import { logger } from "./logger";

// Dirección de la API de TAQI. Se define en el archivo .env de la raíz del proyecto:
//   EXPO_PUBLIC_API_URL=http://192.168.1.50:3000   (IP de tu PC en la red, si pruebas con el celular)
//   EXPO_PUBLIC_API_URL=https://tu-api.onrender.com (API publicada)
const BASE_URL = (process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000").replace(/\/$/, "");

let tokenEnMemoria = null;
let refreshEnMemoria = null;

// Los tokens son el dato más sensible de la app: se guardan en el almacén cifrado del sistema
// (Keystore/Keychain), no en AsyncStorage. Si una versión anterior dejó el token en AsyncStorage,
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

export async function leerRefresh() {
  if (refreshEnMemoria) return refreshEnMemoria;
  refreshEnMemoria = await leerSeguro(CLAVE_REFRESH);
  return refreshEnMemoria;
}

export async function guardarToken(token) {
  tokenEnMemoria = token;
  const guardado = await guardarSeguro(CLAVE_TOKEN, token);
  await removeItem(KEYS.token); // nunca dejar una copia sin cifrar
  return guardado;
}

// Guarda el par de tokens. El refresh token va PRIMERO: si la app se cerrara justo en medio, es mejor
// quedarse con el refresh nuevo y un token de acceso viejo (se renueva solo) que al revés (el servidor
// vería un refresh token ya usado y cerraría la sesión por seguridad).
export async function guardarSesion({ token, refreshToken }) {
  refreshEnMemoria = refreshToken;
  await guardarSeguro(CLAVE_REFRESH, refreshToken);
  return guardarToken(token);
}

export async function borrarToken() {
  tokenEnMemoria = null;
  refreshEnMemoria = null;
  await removeItem(KEYS.token);
  await borrarSeguro(CLAVE_REFRESH);
  return borrarSeguro(CLAVE_TOKEN);
}

// Llama a la API y devuelve siempre { ok, estado, ...respuesta }.
// Si no hay red o el servidor no responde, devuelve { ok: false, sinConexion: true }.
// Si el token venció, lo renueva solo y repite la petición (ver utils/clienteApi.js).
const cliente = crearClienteApi({
  baseUrl: BASE_URL,
  leerToken,
  leerRefresh,
  guardarSesion,
  borrarSesion: borrarToken,
  avisarCaducada: avisarSesionCaducada,
  registrar: (mensaje, error) => logger.warn("backend", mensaje, error),
});

export const llamarApi = cliente.llamarApi;
