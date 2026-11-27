import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { esClaveValida } from "../utils/sesionSegura";
import { logger } from "./logger";

// Almacén para datos SENSIBLES (token de sesión y preferencias de seguridad).
//  - Android: Android Keystore (los valores se cifran con una llave que no sale del dispositivo).
//  - iOS: Keychain, con "WHEN_UNLOCKED_THIS_DEVICE_ONLY" (no se respalda ni pasa a otro teléfono).
//  - Web: no existe un almacén cifrado, así que se usa localStorage (AsyncStorage) y la pantalla
//    "Seguridad" lo avisa. Es el patrón Adapter: la app usa estas 3 funciones sin saber qué hay detrás.
// Los datos NO sensibles (metas, gastos, etc.) siguen en AsyncStorage, en services/storage.js.

const OPCIONES = { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY };

let disponible = null;

// true en Android/iOS; false en la versión web.
export async function almacenSeguroDisponible() {
  if (disponible === null) {
    try {
      disponible = await SecureStore.isAvailableAsync();
    } catch {
      disponible = false;
    }
  }
  return disponible;
}

// Devuelve el texto guardado o null. Si hay un error de lectura NO se borra nada:
// la app simplemente pedirá iniciar sesión otra vez y el valor se reemplaza.
export async function leerSeguro(clave) {
  try {
    if (!esClaveValida(clave)) throw new Error(`clave no válida: ${clave}`);
    if (await almacenSeguroDisponible()) return await SecureStore.getItemAsync(clave, OPCIONES);
    return await AsyncStorage.getItem(clave);
  } catch (error) {
    logger.warn("seguro", `No se pudo leer ${clave}`, error);
    return null;
  }
}

// Devuelve true si se guardó. Nunca cae a un almacén sin cifrar en Android/iOS.
export async function guardarSeguro(clave, valor) {
  try {
    if (!esClaveValida(clave)) throw new Error(`clave no válida: ${clave}`);
    if (await almacenSeguroDisponible()) await SecureStore.setItemAsync(clave, String(valor), OPCIONES);
    else await AsyncStorage.setItem(clave, String(valor));
    return true;
  } catch (error) {
    logger.warn("seguro", `No se pudo guardar ${clave}`, error);
    return false;
  }
}

export async function borrarSeguro(clave) {
  try {
    if (!esClaveValida(clave)) throw new Error(`clave no válida: ${clave}`);
    if (await almacenSeguroDisponible()) await SecureStore.deleteItemAsync(clave, OPCIONES);
    else await AsyncStorage.removeItem(clave);
    return true;
  } catch (error) {
    logger.warn("seguro", `No se pudo borrar ${clave}`, error);
    return false;
  }
}
