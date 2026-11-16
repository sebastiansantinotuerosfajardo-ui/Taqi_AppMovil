import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { logger } from "./logger";

// Notificaciones LOCALES: las programa el propio celular, sin servidor.
// (Las notificaciones push remotas necesitan un backend y una build propia de la app.)
// Documentación usada: https://docs.expo.dev/versions/v57.0.0/sdk/notifications/

// En la versión web no existen las notificaciones programadas, así que todo se desactiva allí.
export const soportado = Platform.OS !== "web";

const CANAL = "taqi-recordatorios";

// Qué hacer cuando llega una notificación con la app abierta: mostrarla como aviso.
// (shouldShowAlert está deprecado; ahora se usan shouldShowBanner y shouldShowList.)
if (soportado) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

// En Android 8 o superior toda notificación pertenece a un canal.
// En Android 13 o superior el aviso de permiso no aparece hasta que exista al menos un canal.
export async function prepararCanal() {
  if (!soportado || Platform.OS !== "android") return;
  try {
    await Notifications.setNotificationChannelAsync(CANAL, {
      name: "Recordatorios de TAQI",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  } catch (error) {
    // Expo Go en Android no puede crear canales (falla con NullPointerException), pero en una
    // build propia sí funciona. Si falla se continúa: las notificaciones usan el canal por defecto.
    logger.warn("notifications", "No se pudo crear el canal de notificaciones (normal en Expo Go)", error);
  }
}

// Pide permiso al usuario si todavía no lo dio.
// Devuelve { granted, canAskAgain }. Si canAskAgain es false, solo se puede activar desde los ajustes del teléfono.
export async function pedirPermiso() {
  if (!soportado) return { granted: false, canAskAgain: false };
  try {
    await prepararCanal();
    const actual = await Notifications.getPermissionsAsync();
    if (actual.granted) return { granted: true, canAskAgain: true };

    const nuevo = await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowBadge: true, allowSound: true },
    });
    return { granted: nuevo.granted, canAskAgain: nuevo.canAskAgain };
  } catch (error) {
    logger.error("notifications", "No se pudo pedir el permiso de notificaciones", error);
    return { granted: false, canAskAgain: true };
  }
}

// Notificación que llega una sola vez, en una fecha y hora concretas (vencimiento de un gasto fijo).
export function programarEnFecha(date, title, body) {
  return Notifications.scheduleNotificationAsync({
    content: { title, body },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date },
  });
}

// Notificación que se repite todos los días a la misma hora (recordatorio de ahorro).
export function programarDiaria(hour, minute, title, body) {
  return Notifications.scheduleNotificationAsync({
    content: { title, body },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute },
  });
}

// Notificación de prueba: llega a los 5 segundos. Sirve para demostrar que todo funciona.
export function probarEn5s() {
  return Notifications.scheduleNotificationAsync({
    content: { title: "TAQI", body: "Así te llegarán tus recordatorios." },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 5 },
  });
}

// Borra todos los avisos programados (se usa antes de volver a programarlos desde cero).
export function cancelarTodas() {
  return Notifications.cancelAllScheduledNotificationsAsync();
}
