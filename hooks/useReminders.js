import { useEffect } from "react";
import {
  soportado,
  cancelarTodas,
  programarEnFecha,
  programarDiaria,
} from "../services/notifications";
import { proximoVencimiento } from "../utils/vencimientos";
import { formatSoles } from "../utils/format";
import { logger } from "../services/logger";

const MESES_A_PROGRAMAR = 3;

// Programa los recordatorios locales según los datos del usuario.
// Cada vez que cambian los gastos fijos, las actividades o el ajuste, se borra todo y se vuelve a programar,
// así nunca quedan avisos viejos ni duplicados.
//  - Cada gasto fijo: aviso el día anterior a su vencimiento, a las 9:00 (los próximos 3 meses).
//  - Si hay alguna actividad de ahorro activa: aviso diario a las 20:00.
export default function useReminders({ listo, activado, gastosFijos, activas }) {
  useEffect(() => {
    if (!soportado || !listo) return;
    let cancelado = false;

    async function programar() {
      try {
        await cancelarTodas();
        if (!activado || cancelado) return;

        // Se programan los próximos MESES_A_PROGRAMAR vencimientos de cada gasto, no solo el más cercano:
        // así los avisos siguen llegando aunque el usuario no abra la app durante varios meses.
        const ahora = new Date();
        for (const gasto of gastosFijos) {
          let referencia = ahora;
          for (let i = 0; i < MESES_A_PROGRAMAR; i++) {
            const vence = proximoVencimiento(gasto.diaVencimiento || 1, referencia);
            const aviso = new Date(vence.getFullYear(), vence.getMonth(), vence.getDate() - 1, 9, 0, 0);
            if (aviso > ahora) {
              await programarEnFecha(
                aviso,
                `${gasto.title} vence mañana`,
                `Tienes ${formatSoles(gasto.amount)} por pagar. Ya está descontado de tu saldo libre.`
              );
            }
            // la siguiente búsqueda empieza el día después de este vencimiento
            referencia = new Date(vence.getFullYear(), vence.getMonth(), vence.getDate() + 1);
          }
        }

        if (Object.values(activas).some(Boolean)) {
          await programarDiaria(20, 0, "Hora de ahorrar", "Registra un aporte a tu meta de hoy.");
        }
      } catch (error) {
        logger.error("recordatorios", "No se pudieron programar los recordatorios", error);
      }
    }

    programar();
    return () => {
      cancelado = true;
    };
  }, [listo, activado, gastosFijos, activas]);
}
