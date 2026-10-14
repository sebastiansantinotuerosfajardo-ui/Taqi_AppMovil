import { KEYS, getItem, setItem, removeItem } from "./storage";

const normalize = (text) => String(text || "").trim().toLowerCase();

// Usuario precargado para demostración y evaluación del proyecto
const SEED_USERS = [
  {
    id: "user-camila",
    email: "camila.rojas@gmail.com",
    username: "Camila Rojas",
    password: "Clave123!",
  },
];

// Obtiene la lista de usuarios. Si no hay ninguno, siembra el usuario de prueba
async function getUsers() {
  const users = await getItem(KEYS.users, null);
  if (!users || users.length === 0) {
    await setItem(KEYS.users, SEED_USERS);
    return SEED_USERS;
  }
  return users;
}

// Quita la contraseña antes de entregar el usuario al resto de la app
const toPublicUser = ({ password, ...rest }) => rest;

export async function registerUser({ email, username, password }) {
  const users = await getUsers();
  const mail = normalize(email);

  if (users.some((u) => u.email === mail)) {
    return { ok: false, error: "Ya existe una cuenta con ese correo" };
  }
  if (users.some((u) => normalize(u.username) === normalize(username))) {
    return { ok: false, error: "Ese nombre de usuario ya está en uso" };
  }

  const user = {
    id: String(Date.now()),
    email: mail,
    username: username.trim(),
    password,
  };

  const saved = await setItem(KEYS.users, [...users, user]);
  if (!saved) {
    return { ok: false, error: "No se pudo guardar la cuenta. Intenta de nuevo" };
  }
  await setItem(KEYS.session, user.id);
  return { ok: true, user: toPublicUser(user) };
}

export async function loginUser({ identifier, password }) {
  const users = await getUsers();
  const id = normalize(identifier);
  const user = users.find((u) => u.email === id || normalize(u.username) === id);

  if (!user || user.password !== password) {
    return { ok: false, error: "Correo o contraseña incorrectos" };
  }
  await setItem(KEYS.session, user.id);
  return { ok: true, user: toPublicUser(user) };
}

// Restablece la contraseña de un usuario a partir de su correo verificado
export async function resetPassword(email, newPassword) {
  const users = await getUsers();
  const mail = normalize(email);
  const index = users.findIndex((u) => u.email === mail);

  if (index === -1) {
    return { ok: false, error: "No se encontró ninguna cuenta con ese correo" };
  }

  users[index].password = newPassword;
  await setItem(KEYS.users, users);
  return { ok: true };
}

// Devuelve el usuario de la sesión guardada o null si no hay sesión
export async function getSessionUser() {
  const sessionId = await getItem(KEYS.session, null);
  if (!sessionId) return null;
  const users = await getUsers();
  const user = users.find((u) => u.id === sessionId);
  return user ? toPublicUser(user) : null;
}

export async function clearSession() {
  await removeItem(KEYS.session);
}
