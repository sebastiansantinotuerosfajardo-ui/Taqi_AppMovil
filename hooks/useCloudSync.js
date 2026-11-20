import { useCallback, useEffect, useMemo, useRef } from "react";
import { llamarApi } from "../services/backend";
import { getItem, setItem } from "../services/storage";
import { logger } from "../services/logger";

const ESPERA_MS = 1500; // se espera un momento por si el usuario hace varios cambios seguidos
const REINTENTO_MS = 30000; // si no hay conexión se vuelve a intentar

// Mantiene los datos del usuario copiados en el servidor (Supabase, mediante la API).
//  - La app sigue funcionando con AsyncStorage (rápido y sin conexión).
//  - Al abrir sesión: si hay cambios locales pendientes se suben; si no, se bajan los del servidor.
//  - Cada cambio posterior se sube con un pequeño retraso.
// "snapshot" es el objeto con todos los datos; "aplicar(datos)" los carga en la app.
export default function useCloudSync({ activo, uid, listo, snapshot, aplicar }) {
  const json = useMemo(() => JSON.stringify(snapshot), [snapshot]);
  const jsonRef = useRef(json);
  jsonRef.current = json;
  const aplicarRef = useRef(aplicar);
  aplicarRef.current = aplicar;

  const ultimoSincronizado = useRef(null); // texto JSON que ya coincide con el servidor
  const iniciado = useRef(false);
  const temporizador = useRef(null);
  const clavePendiente = `@taqi:sync_pendiente:${uid}`;

  const subir = useCallback(async () => {
    const texto = jsonRef.current;
    const r = await llamarApi("/datos", { metodo: "PUT", cuerpo: JSON.parse(texto) });
    if (r.ok) {
      ultimoSincronizado.current = texto;
      await setItem(clavePendiente, false);
      return true;
    }
    logger.warn("sync", `No se pudieron subir los datos (${r.estado || "sin conexión"}): ${r.error || ""}`);
    return false;
  }, [clavePendiente]);

  // Al cambiar de usuario se vuelve a empezar
  useEffect(() => {
    iniciado.current = false;
    ultimoSincronizado.current = null;
    return () => clearTimeout(temporizador.current);
  }, [uid, activo]);

  // 1) Sincronización inicial
  useEffect(() => {
    if (!activo || !listo || iniciado.current) return;
    iniciado.current = true;
    let cancelado = false;
    (async () => {
      const pendiente = await getItem(clavePendiente, false);
      if (cancelado) return;
      if (pendiente) {
        await subir();
        return;
      }
      const r = await llamarApi("/datos");
      if (cancelado) return;
      if (!r.ok) {
        logger.warn("sync", `No se pudo leer del servidor; se usan los datos del celular: ${r.error || ""}`);
        return;
      }
      if (r.datos.inicializado) {
        const { inicializado, ...datos } = r.datos;
        ultimoSincronizado.current = JSON.stringify(datos);
        aplicarRef.current(datos);
      } else {
        await subir(); // cuenta nueva: se suben los datos iniciales
      }
    })();
    return () => {
      cancelado = true;
    };
  }, [activo, listo, uid, clavePendiente, subir]);

  // 2) Cada cambio se marca como pendiente y se sube con retraso
  useEffect(() => {
    if (!activo || !listo || !iniciado.current) return;
    if (json === ultimoSincronizado.current) return;
    setItem(clavePendiente, true);
    clearTimeout(temporizador.current);
    const intentar = async () => {
      const exito = await subir();
      if (!exito) temporizador.current = setTimeout(intentar, REINTENTO_MS);
    };
    temporizador.current = setTimeout(intentar, ESPERA_MS);
    return () => clearTimeout(temporizador.current);
  }, [json, activo, listo, clavePendiente, subir]);
}
