import * as LocalAuthentication from "expo-local-authentication";
import { describirBiometria, esCancelacion, mensajeDeError } from "../utils/bloqueo";
import { logger } from "./logger";

// Huella / rostro mediante el sistema del teléfono (BiometricPrompt en Android, Face ID/Touch ID en iOS).
// TAQI nunca ve ni guarda la huella o el rostro: el sistema solo responde "sí" o "no".

// Dice si se puede usar y por qué no, para mostrar un mensaje claro.
// motivo: null | "sin-hardware" | "sin-registro" | "error"
export async function capacidadBiometrica() {
  try {
    if (!(await LocalAuthentication.hasHardwareAsync())) {
      return { disponible: false, motivo: "sin-hardware", tipo: "biometría" };
    }
    const inscrito = await LocalAuthentication.isEnrolledAsync();
    let tipos = [];
    try {
      tipos = await LocalAuthentication.supportedAuthenticationTypesAsync();
    } catch {
      // si no se puede saber el tipo, se usa el texto genérico
    }
    return { disponible: inscrito, motivo: inscrito ? null : "sin-registro", tipo: describirBiometria(tipos) };
  } catch (error) {
    logger.warn("biometria", "No se pudo consultar la biometría del dispositivo", error);
    return { disponible: false, motivo: "error", tipo: "biometría" };
  }
}

// Muestra la ventana del sistema. Devuelve { ok: true } o { ok: false, cancelado, mensaje }.
// Si falla la huella, el sistema permite usar el PIN/patrón del teléfono (no se desactiva esa opción).
export async function verificarIdentidad(motivo = "Verifica tu identidad para entrar a TAQI") {
  try {
    const resultado = await LocalAuthentication.authenticateAsync({
      promptMessage: motivo,
      cancelLabel: "Cancelar",
    });
    if (resultado.success) return { ok: true };
    return { ok: false, codigo: resultado.error, cancelado: esCancelacion(resultado.error), mensaje: mensajeDeError(resultado.error) };
  } catch (error) {
    logger.warn("biometria", "Falló la verificación de identidad", error);
    return { ok: false, codigo: "error", cancelado: false, mensaje: mensajeDeError("error") };
  }
}
