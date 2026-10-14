import AsyncStorage from "@react-native-async-storage/async-storage";

// Claves donde se guarda la información en el celular (AsyncStorage)
export const KEYS = {
  users: "@taqi:users",
  session: "@taqi:session",
};

// Lee un valor guardado. Si no existe o hay un error, devuelve "fallback".
export async function getItem(key, fallback = null) {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw !== null ? JSON.parse(raw) : fallback;
  } catch (error) {
    console.warn("[storage] No se pudo leer", key, error);
    return fallback;
  }
}

// Guarda un valor (se convierte a texto JSON). Devuelve true si salió bien.
export async function setItem(key, value) {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.warn("[storage] No se pudo guardar", key, error);
    return false;
  }
}

export async function removeItem(key) {
  try {
    await AsyncStorage.removeItem(key);
    return true;
  } catch (error) {
    console.warn("[storage] No se pudo borrar", key, error);
    return false;
  }
}
