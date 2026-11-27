import { useEffect } from "react";
import {
  soportado,
  cancelarTodas,
  programarEnFecha,
  programarEnSegundos,
  programarDiaria,
} from "../services/notifications";
import { planificarAvisos } from "../utils/avisos";
import { getItem, setItem } from "../services/storage";
import { logger } from "../services/logger";

const MESES_A_PROGRAMAR = 3;
const MAX_AVISADOS = 300;

// Programa los recordatorios locales según los datos del usuario.
// Cada vez que cambian los gastos fijos, las actividades o los ajustes, se borra todo y se vuelve a programar,
// así nunca quedan avisos viejos ni duplicados.
//  - Cada gasto fijo: aviso el día anterior a su vencimiento a la hora elegida (9:00 por defecto),
//    para los próximos 3 meses. Si esa hora ya pasó y el gasto vence hoy o mañana, avisa en unos segundos.
//  - Si hay alguna actividad de ahorro activa: aviso diario a las 20:00.
export default function useReminders({ listo, activado, gastosFijos, activas, uid, hora = 9, puntual = true }) {
  useEffect(() => {
    if (!soportado || !listo) return;
    let cancelado = false;

    async function programar() {
      try {
        await cancelarTodas();
        if (!activado || cancelado) return;

        const claveAvisados = `@taqi:avisados:${uid}`;
        const avisados = await getItem(claveAvisados, []);
        const { programados, inmediatos } = planificarAvisos(gastosFijos, new Date(), {
          hora,
          meses: MESES_A_PROGRAMAR,
          avisados,
        });
        if (cancelado) return;

        for (const aviso of programados) {
          await programarEnFecha(aviso.fecha, aviso.titulo, aviso.cuerpo, puntual);
        }

        // Avisos inmediatos: se escalonan unos segundos para que no lleguen todos juntos
        // y se recuerdan para no repetirlos cada vez que se vuelve a programar.
        for (let i = 0; i < inmediatos.length; i++) {
          await programarEnSegundos(5 + i * 4, inmediatos[i].titulo, inmediatos[i].cuerpo);
        }
        if (inmediatos.length > 0) {
          const nuevos = [...avisados, ...inmediatos.map((a) => a.clave)].slice(-MAX_AVISADOS);
          await setItem(claveAvisados, nuevos);
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
  }, [listo, activado, gastosFijos, activas, uid, hora, puntual]);
}
