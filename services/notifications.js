import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { logger } from "./logger";

// Notificaciones LOCALES: las programa el propio celular, sin servidor.
// (Las notificaciones push remotas necesitan un backend y una build propia de la app.)
// Documentación usada: https://docs.expo.dev/versions/v58.0.0/sdk/notifications/

// En la versión web no existen las notificaciones programadas, así que todo se desactiva allí.
export const soportado = Platform.OS !== "web";

// Canal nuevo ("-avisos") con importancia ALTA: un canal ya creado no puede cambiar su importancia,
// así que no se reutiliza el anterior ("taqi-recordatorios", importancia normal).
const CANAL = "taqi-avisos";

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
      name: "Avisos de TAQI",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 150, 250],
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
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

// Pide a Android que permita alarmas exactas. Sin este permiso (Android 12 o superior) los avisos
// llegan "a una hora aproximada", que es la causa típica de notificaciones que demoran.
// Abre la pantalla de ajustes del sistema; el usuario solo debe activar "Alarmas y recordatorios".
// En Expo Go el permiso no está declarado y la función falla: eso es normal y se ignora.
export async function pedirAlarmaExacta() {
  if (!soportado || Platform.OS !== "android") return { granted: true };
  try {
    const actual = await Notifications.getExactAlarmPermissionsAsync();
    if (actual.granted) return { granted: true };
    const nuevo = await Notifications.requestExactAlarmPermissionsAsync();
    return { granted: nuevo.granted };
  } catch (error) {
    logger.info("notifications", "Alarma exacta no disponible (normal en Expo Go)");
    return { granted: false, noDisponible: true };
  }
}

// Notificación que llega una sola vez, en una fecha y hora concretas (vencimiento de un gasto fijo).
// puntual = true usa "alarmClock": Android la entrega a la hora exacta y no la retrasa por ahorro de batería.
// (Muestra un ícono de alarma en la barra superior hasta que llega.)
export function programarEnFecha(date, title, body, puntual = true) {
  return Notifications.scheduleNotificationAsync({
    content: { title, body },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date,
      channelId: CANAL,
      ...(puntual ? { delivery: "alarmClock" } : {}),
    },
  });
}

// Notificación que se repite todos los días a la misma hora (recordatorio de ahorro).
export function programarDiaria(hour, minute, title, body) {
  return Notifications.scheduleNotificationAsync({
    content: { title, body },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute, channelId: CANAL },
  });
}

// Notificación que llega dentro de unos segundos (avisos inmediatos y prueba).
export function programarEnSegundos(seconds, title, body) {
  return Notifications.scheduleNotificationAsync({
    content: { title, body },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds, channelId: CANAL },
  });
}

// Notificación de prueba: llega a los 5 segundos. Sirve para demostrar que todo funciona.
export function probarEn5s() {
  return programarEnSegundos(5, "TAQI", "Así te llegarán tus recordatorios.");
}

// Lista los avisos que el teléfono tiene pendientes (para mostrarlos en pantalla durante la demostración).
export async function listarProgramadas() {
  const lista = await Notifications.getAllScheduledNotificationsAsync();
  return lista.map((n) => ({
    titulo: n.content.title,
    fecha: n.trigger && n.trigger.value ? new Date(n.trigger.value) : null,
    tipo: n.trigger && n.trigger.type,
  }));
}

// Borra todos los avisos programados (se usa antes de volver a programarlos desde cero).
export function cancelarTodas() {
  return Notifications.cancelAllScheduledNotificationsAsync();
}
