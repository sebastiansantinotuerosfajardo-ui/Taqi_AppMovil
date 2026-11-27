// Lógica pura del bloqueo de la app con huella o rostro. Se prueba con Node: npm run test:seguridad

export const OPCIONES_TIEMPO = [
  { segundos: 0, etiqueta: "Al salir" },
  { segundos: 30, etiqueta: "30 s" },
  { segundos: 60, etiqueta: "1 min" },
  { segundos: 300, etiqueta: "5 min" },
];
export const TIEMPO_POR_DEFECTO = 30;

const TIEMPOS_VALIDOS = OPCIONES_TIEMPO.map((o) => o.segundos);

// Interpreta lo guardado ("{"a":true,"t":60}"). Ante cualquier duda queda DESACTIVADO con tiempo por defecto.
export function interpretarPreferencia(crudo) {
  const base = { activado: false, tiempoSeg: TIEMPO_POR_DEFECTO };
  if (typeof crudo !== "string" || crudo === "") return base;
  try {
    const dato = JSON.parse(crudo);
    return {
      activado: dato && dato.a === true,
      tiempoSeg: dato && TIEMPOS_VALIDOS.includes(dato.t) ? dato.t : TIEMPO_POR_DEFECTO,
    };
  } catch {
    return base;
  }
}

export function serializarPreferencia({ activado, tiempoSeg }) {
  return JSON.stringify({ a: activado === true, t: TIEMPOS_VALIDOS.includes(tiempoSeg) ? tiempoSeg : TIEMPO_POR_DEFECTO });
}

// Al abrir la app desde cero con sesión guardada: se bloquea si el usuario lo activó.
export function debeBloquearAlAbrir({ activado, haySesion }) {
  return Boolean(activado && haySesion);
}

// Al volver de segundo plano: se bloquea si estuvo fuera más tiempo del permitido.
// Si el reloj del teléfono retrocedió (tiempo negativo), por seguridad también se bloquea.
export function debeBloquearAlVolver({ activado, haySesion, segundoPlanoDesde, ahora, tiempoSeg }) {
  if (!activado || !haySesion) return false;
  if (typeof segundoPlanoDesde !== "number") return false;
  const transcurrido = ahora - segundoPlanoDesde;
  if (transcurrido < 0) return true;
  return transcurrido >= tiempoSeg * 1000;
}

// AuthenticationType de expo-local-authentication: 1 = huella, 2 = rostro, 3 = iris.
export function describirBiometria(tipos) {
  const lista = Array.isArray(tipos) ? tipos : [];
  const huella = lista.includes(1);
  const rostro = lista.includes(2);
  if (huella && rostro) return "huella o rostro";
  if (huella) return "huella";
  if (rostro) return "rostro";
  return "biometría";
}

const CANCELACIONES = ["user_cancel", "system_cancel", "app_cancel", "user_fallback"];
export const esCancelacion = (codigo) => CANCELACIONES.includes(codigo);

const MENSAJES = {
  lockout: "Demasiados intentos fallidos. Espera un momento o usa el PIN del teléfono.",
  not_enrolled: "No tienes huella ni rostro registrados. Regístralos en los ajustes del teléfono.",
  not_available: "La verificación biométrica no está disponible en este dispositivo.",
  passcode_not_set: "Tu teléfono no tiene bloqueo de pantalla. Configúralo en los ajustes.",
  timeout: "Se agotó el tiempo. Inténtalo de nuevo.",
  authentication_failed: "No te reconocimos. Inténtalo de nuevo.",
};

// Texto para mostrar al usuario; null si solo canceló (no es un error).
export function mensajeDeError(codigo) {
  if (esCancelacion(codigo)) return null;
  return MENSAJES[codigo] || "No se pudo verificar tu identidad. Inténtalo de nuevo.";
}
