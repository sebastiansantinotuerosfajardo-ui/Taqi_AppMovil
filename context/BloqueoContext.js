import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AppState } from "react-native";
import { useAuth } from "./AuthContext";
import { almacenSeguroDisponible, guardarSeguro, leerSeguro } from "../services/secureStore";
import { capacidadBiometrica, verificarIdentidad } from "../services/biometria";
import { claveBloqueo } from "../utils/sesionSegura";
import {
  TIEMPO_POR_DEFECTO,
  debeBloquearAlAbrir,
  debeBloquearAlVolver,
  interpretarPreferencia,
  serializarPreferencia,
} from "../utils/bloqueo";

// Bloqueo de la app con huella o rostro (opcional, lo activa el usuario en Perfil > Seguridad).
// Patrón Provider/Context: toda la app consulta el estado con useBloqueo().
// Principio "fallar cerrado": ante cualquier duda (dato dañado, reloj movido) la app queda bloqueada
// o desactivada de forma explícita, nunca abierta por accidente.

const BloqueoContext = createContext(null);

export function BloqueoProvider({ children }) {
  const { user, ready } = useAuth();
  const uid = user ? user.id : null;

  const [activado, setActivado] = useState(false);
  const [tiempoSeg, setTiempoSeg] = useState(TIEMPO_POR_DEFECTO);
  const [bloqueada, setBloqueada] = useState(false);
  const [listo, setListo] = useState(false); // ya se sabe si hay que bloquear (se leyeron las preferencias)

  // Valores actuales para el escuchador de AppState (que se crea una sola vez)
  const actual = useRef({ activado: false, tiempoSeg: TIEMPO_POR_DEFECTO, uid: null });
  useEffect(() => {
    actual.current = { activado, tiempoSeg, uid };
  }, [activado, tiempoSeg, uid]);

  const segundoPlanoDesde = useRef(null);
  const verificando = useRef(false); // mientras se muestra la ventana de huella se ignoran los cambios de AppState
  const arranqueEvaluado = useRef(false);

  // Lee las preferencias del usuario. Solo la PRIMERA vez que se sabe si hay sesión (al abrir la app)
  // se bloquea; si el usuario acaba de escribir su contraseña, no se le pide la huella otra vez.
  useEffect(() => {
    if (!ready) return undefined;
    const alArrancar = !arranqueEvaluado.current;
    arranqueEvaluado.current = true;
    if (!uid) {
      setActivado(false);
      setBloqueada(false);
      setListo(true);
      return undefined;
    }
    let activo = true;
    setListo(false);
    leerSeguro(claveBloqueo(uid)).then((crudo) => {
      if (!activo) return;
      const preferencia = interpretarPreferencia(crudo);
      setActivado(preferencia.activado);
      setTiempoSeg(preferencia.tiempoSeg);
      setBloqueada(alArrancar && debeBloquearAlAbrir({ activado: preferencia.activado, haySesion: true }));
      setListo(true);
    });
    return () => {
      activo = false;
    };
  }, [ready, uid]);

  // Al volver de segundo plano se bloquea si pasó más tiempo del permitido
  useEffect(() => {
    const suscripcion = AppState.addEventListener("change", (estado) => {
      if (verificando.current) return;
      if (estado === "background") {
        segundoPlanoDesde.current = Date.now();
        return;
      }
      if (estado === "active") {
        const desde = segundoPlanoDesde.current;
        segundoPlanoDesde.current = null;
        const { activado: a, tiempoSeg: t, uid: u } = actual.current;
        if (debeBloquearAlVolver({ activado: a, haySesion: Boolean(u), segundoPlanoDesde: desde, ahora: Date.now(), tiempoSeg: t })) {
          setBloqueada(true);
        }
      }
    });
    return () => suscripcion.remove();
  }, []);

  // Ejecuta una verificación del sistema sin que AppState provoque un bloqueo por el propio aviso
  const verificar = useCallback(async (motivo) => {
    verificando.current = true;
    try {
      return await verificarIdentidad(motivo);
    } finally {
      verificando.current = false;
      segundoPlanoDesde.current = null;
    }
  }, []);

  const guardarPreferencia = useCallback(async (nueva) => {
    const id = actual.current.uid;
    if (!id) return false;
    return guardarSeguro(claveBloqueo(id), serializarPreferencia(nueva));
  }, []);

  const activarBloqueo = useCallback(async () => {
    if (!(await almacenSeguroDisponible())) {
      return { ok: false, mensaje: "El bloqueo no está disponible en la versión web. Úsalo en la app del celular." };
    }
    const capacidad = await capacidadBiometrica();
    if (!capacidad.disponible) {
      return {
        ok: false,
        mensaje:
          capacidad.motivo === "sin-registro"
            ? "No tienes huella ni rostro registrados. Regístralos en los ajustes del teléfono."
            : "Este dispositivo no tiene huella ni reconocimiento facial.",
      };
    }
    const r = await verificar("Confirma que eres tú para activar el bloqueo");
    if (!r.ok) return r;
    if (!(await guardarPreferencia({ activado: true, tiempoSeg: actual.current.tiempoSeg }))) {
      return { ok: false, mensaje: "No se pudo guardar el ajuste. Inténtalo de nuevo." };
    }
    setActivado(true);
    return { ok: true };
  }, [guardarPreferencia, verificar]);

  const desactivarBloqueo = useCallback(async () => {
    const r = await verificar("Confirma que eres tú para desactivar el bloqueo");
    if (!r.ok) return r;
    if (!(await guardarPreferencia({ activado: false, tiempoSeg: actual.current.tiempoSeg }))) {
      return { ok: false, mensaje: "No se pudo guardar el ajuste. Inténtalo de nuevo." };
    }
    setActivado(false);
    return { ok: true };
  }, [guardarPreferencia, verificar]);

  const cambiarTiempo = useCallback(
    async (segundos) => {
      setTiempoSeg(segundos);
      await guardarPreferencia({ activado: actual.current.activado, tiempoSeg: segundos });
    },
    [guardarPreferencia]
  );

  const bloquearAhora = useCallback(() => {
    if (actual.current.activado && actual.current.uid) setBloqueada(true);
  }, []);

  const desbloquear = useCallback(async () => {
    const r = await verificar("Desbloquea TAQI");
    if (r.ok) setBloqueada(false);
    return r;
  }, [verificar]);

  const valor = useMemo(
    () => ({ activado, tiempoSeg, bloqueada, listo, activarBloqueo, desactivarBloqueo, cambiarTiempo, bloquearAhora, desbloquear }),
    [activado, tiempoSeg, bloqueada, listo, activarBloqueo, desactivarBloqueo, cambiarTiempo, bloquearAhora, desbloquear]
  );

  return <BloqueoContext.Provider value={valor}>{children}</BloqueoContext.Provider>;
}

export function useBloqueo() {
  const contexto = useContext(BloqueoContext);
  if (!contexto) throw new Error("useBloqueo debe usarse dentro de BloqueoProvider");
  return contexto;
}
