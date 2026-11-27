import { KEYS, getItem, setItem, removeItem } from "./storage";
import { borrarToken, guardarSesion, leerRefresh, leerToken, llamarApi } from "./backend";

// Registro, acceso y sesión contra la API de TAQI (Express + Prisma + Supabase).
// Las funciones devuelven lo mismo que antes ({ ok, user } o { ok: false, error }),
// por lo que las pantallas no cambian.

// La foto de perfil se guarda solo en el celular (por usuario); la API no la guarda todavía.
const claveAvatar = (userId) => `@taqi:avatar:${userId}`;

async function conAvatar(user) {
  if (!user) return user;
  const avatar = await getItem(claveAvatar(user.id), null);
  return avatar ? { ...user, avatar } : user;
}

async function abrirSesion(respuesta) {
  await guardarSesion({ token: respuesta.token, refreshToken: respuesta.refreshToken });
  await setItem(KEYS.sessionUser, respuesta.user);
  return { ok: true, user: await conAvatar(respuesta.user) };
}

// Actualiza la foto de perfil (avatar) del usuario actual
export async function updateUserAvatar(userId, avatar) {
  const base = await getItem(KEYS.sessionUser, null);
  if (!base || base.id !== userId) return { ok: false, error: "Usuario no encontrado" };
  await setItem(claveAvatar(userId), avatar);
  return { ok: true, user: { ...base, avatar } };
}

export async function registerUser({ email, username, password }) {
  const r = await llamarApi("/auth/register", {
    metodo: "POST",
    cuerpo: { email, username, password },
    conSesion: false,
  });
  if (!r.ok) return { ok: false, error: mensajeDeError(r, "No se pudo crear la cuenta. Intenta de nuevo") };
  return abrirSesion(r);
}

export async function loginUser({ identifier, password }) {
  const r = await llamarApi("/auth/login", {
    metodo: "POST",
    cuerpo: { identifier, password },
    conSesion: false,
  });
  if (!r.ok) return { ok: false, error: mensajeDeError(r, "Correo o contraseña incorrectos") };
  return abrirSesion(r);
}

// Recuperar contraseña en 3 pasos (el código lo genera y verifica el SERVIDOR; ver backend/src/reset.ts):
//  1) solicitarCodigoReset: el servidor crea un código de 6 dígitos que vale 10 minutos.
//     Si la API está en modo demostración devuelve también "codigoDemo" (se muestra en pantalla).
//  2) verificarCodigoReset: máximo 5 intentos; si es correcto entrega un "permiso" de un solo uso.
//  3) confirmarReset: con el permiso se guarda la nueva contraseña y se cierran todas las sesiones.
export async function solicitarCodigoReset(email) {
  const r = await llamarApi("/auth/reset/solicitar", { metodo: "POST", cuerpo: { email }, conSesion: false });
  if (!r.ok) return { ok: false, error: mensajeDeError(r, "No se pudo generar el código. Intenta de nuevo") };
  return { ok: true, codigoDemo: r.codigoDemo ?? null };
}

export async function verificarCodigoReset(email, codigo) {
  const r = await llamarApi("/auth/reset/verificar", { metodo: "POST", cuerpo: { email, codigo }, conSesion: false });
  if (!r.ok) return { ok: false, error: mensajeDeError(r, "Código incorrecto o vencido") };
  return { ok: true, permiso: r.permiso };
}

export async function confirmarReset(permiso, newPassword) {
  const r = await llamarApi("/auth/reset/confirmar", { metodo: "POST", cuerpo: { permiso, newPassword }, conSesion: false });
  if (!r.ok) return { ok: false, error: mensajeDeError(r, "No se pudo cambiar la contraseña") };
  return { ok: true };
}

// Devuelve el usuario de la sesión guardada o null si no hay sesión.
// Sin conexión, usa la copia guardada para que la app abra igual.
export async function getSessionUser() {
  // Basta con tener alguno de los dos tokens: si falta el de acceso (o venció), se renueva con el otro.
  if (!(await leerToken()) && !(await leerRefresh())) return null;
  const r = await llamarApi("/auth/me");
  if (r.ok) {
    await setItem(KEYS.sessionUser, r.user);
    return conAvatar(r.user);
  }
  // el servidor respondió que la sesión ya no vale (ya se intentó renovarla)
  if (r.estado === 401 || r.estado === 403) {
    await clearSession();
    return null;
  }
  // sin conexión o con un error temporal del servidor (500, 429...): se abre con la copia guardada, sin cerrar la sesión
  return conAvatar(await getItem(KEYS.sessionUser, null));
}

// Espera una promesa, pero no más de "ms" (cerrar sesión nunca debe quedar colgado si no hay internet).
const conLimite = (promesa, ms) => Promise.race([promesa, new Promise((resolver) => setTimeout(() => resolver(null), ms))]);

export async function clearSession() {
  // Se le avisa al servidor para que el refresh token deje de servir. Si no hay conexión, igual se cierra la sesión aquí.
  const refreshToken = await leerRefresh();
  if (refreshToken) {
    await conLimite(
      llamarApi("/auth/logout", { metodo: "POST", cuerpo: { refreshToken }, conSesion: false }),
      3000
    );
  }
  await borrarToken();
  await removeItem(KEYS.sessionUser);
  await removeItem(KEYS.session);
}

function mensajeDeError(respuesta, porDefecto) {
  return respuesta.error || porDefecto;
}
