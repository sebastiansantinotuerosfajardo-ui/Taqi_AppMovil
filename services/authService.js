import { KEYS, getItem, setItem, removeItem } from "./storage";
import { borrarToken, guardarToken, leerToken, llamarApi } from "./backend";

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
  await guardarToken(respuesta.token);
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

// Restablece la contraseña a partir del correo (el código de verificación se simula en pantalla)
export async function resetPassword(email, newPassword) {
  const r = await llamarApi("/auth/reset-password", {
    metodo: "POST",
    cuerpo: { email, newPassword },
    conSesion: false,
  });
  if (!r.ok) return { ok: false, error: mensajeDeError(r, "No se pudo cambiar la contraseña") };
  return { ok: true };
}

// Devuelve el usuario de la sesión guardada o null si no hay sesión.
// Sin conexión, usa la copia guardada para que la app abra igual.
export async function getSessionUser() {
  const token = await leerToken();
  if (!token) return null;
  const r = await llamarApi("/auth/me");
  if (r.ok) {
    await setItem(KEYS.sessionUser, r.user);
    return conAvatar(r.user);
  }
  if (r.sinConexion) return conAvatar(await getItem(KEYS.sessionUser, null));
  // el servidor respondió que la sesión ya no vale
  await clearSession();
  return null;
}

export async function clearSession() {
  await borrarToken();
  await removeItem(KEYS.sessionUser);
  await removeItem(KEYS.session);
}

function mensajeDeError(respuesta, porDefecto) {
  return respuesta.error || porDefecto;
}
