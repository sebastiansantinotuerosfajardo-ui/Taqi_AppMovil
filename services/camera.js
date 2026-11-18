import * as ImagePicker from "expo-image-picker";
import { logger } from "./logger";

// Abre la cámara para fotografiar un comprobante o capturar la foto de perfil.
// Devuelve { ok: true, uri } si se tomó la foto, o { ok: false, motivo } con el porqué:
// "permiso" (el usuario negó la cámara), "cancelado" (cerró la cámara) o "error".
// Documentación usada: https://docs.expo.dev/versions/v57.0.0/sdk/imagepicker/
export async function tomarFoto(options = {}) {
  try {
    const permiso = await ImagePicker.requestCameraPermissionsAsync();
    if (!permiso.granted) return { ok: false, motivo: "permiso" };

    const resultado = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: options.aspect || [4, 3],
      quality: options.quality !== undefined ? options.quality : 0.5, // calidad media para no saturar memoria
    });
    if (resultado.canceled) return { ok: false, motivo: "cancelado" };

    return { ok: true, uri: resultado.assets[0].uri };
  } catch (error) {
    logger.error("camera", "No se pudo abrir la cámara", error);
    return { ok: false, motivo: "error" };
  }
}
