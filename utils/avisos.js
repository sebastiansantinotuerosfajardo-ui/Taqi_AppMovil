import { proximoVencimiento } from "./vencimientos.js";

// Decide qué avisos de vencimiento hay que programar. Es una función pura (no usa el teléfono),
// por eso se puede probar fácilmente con scripts/probar-avisos.mjs.
//
// Regla: se avisa el día anterior al vencimiento, a la hora elegida por el usuario (9:00 por defecto).
//  - Si esa hora todavía no llegó → aviso "programado" para esa fecha y hora.
//  - Si esa hora ya pasó pero el gasto aún no vence (vence hoy o mañana) → aviso "inmediato" (una sola vez),
//    para que el usuario no se quede sin aviso solo por activar los recordatorios tarde.

const dos = (n) => String(n).padStart(2, "0");

// "2026-11-26": identifica el día de un vencimiento.
export const claveFecha = (fecha) => `${fecha.getFullYear()}-${dos(fecha.getMonth() + 1)}-${dos(fecha.getDate())}`;

const soles = (monto) => `S/ ${Number(monto).toFixed(2)}`;

export function planificarAvisos(gastos, ahora, { hora = 9, minuto = 0, meses = 3, avisados = [] } = {}) {
  const programados = [];
  const inmediatos = [];
  const yaAvisados = new Set(avisados);
  const hoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());

  for (const gasto of gastos) {
    let referencia = ahora;
    for (let i = 0; i < meses; i++) {
      const vence = proximoVencimiento(gasto.diaVencimiento || 1, referencia);
      const aviso = new Date(vence.getFullYear(), vence.getMonth(), vence.getDate() - 1, hora, minuto, 0);
      const clave = `${gasto.id}|${claveFecha(vence)}`;

      if (aviso > ahora) {
        programados.push({
          clave,
          fecha: aviso,
          titulo: `${gasto.title} vence mañana`,
          cuerpo: `Tienes ${soles(gasto.amount)} por pagar. Ya está descontado de tu saldo libre.`,
        });
      } else if (!yaAvisados.has(clave)) {
        const dias = Math.round((vence - hoy) / 86400000);
        inmediatos.push({
          clave,
          titulo: dias === 0 ? `${gasto.title} vence hoy` : `${gasto.title} vence mañana`,
          cuerpo:
            dias === 0
              ? `Hoy vencen ${soles(gasto.amount)}. Págalo para no tener recargos.`
              : `Tienes ${soles(gasto.amount)} por pagar. Ya está descontado de tu saldo libre.`,
        });
      }
      // la siguiente búsqueda empieza el día después de este vencimiento
      referencia = new Date(vence.getFullYear(), vence.getMonth(), vence.getDate() + 1);
    }
  }
  return { programados, inmediatos };
}
