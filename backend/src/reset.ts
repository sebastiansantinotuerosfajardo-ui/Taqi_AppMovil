import { hashear } from "./auth";
import { generarCodigo, hmacCodigo, huella, iguales, nuevoTokenOpaco } from "./cripto";
import { prisma } from "./db";
import { env } from "./env";
import type { ModoReset } from "./env";
import { enmascarar, registrarEvento } from "./seguridad";

// Recuperación de contraseña en 3 pasos. TODO se decide en el servidor (la app solo muestra pantallas):
//
//   1. solicitarCodigo : se crea un código de 6 dígitos que vale 10 minutos (y se "entrega", ver abajo).
//   2. verificarCodigo : máximo 5 intentos. Si es correcto devuelve un "permiso" (token aleatorio de 256 bits).
//   3. confirmarReset  : con el permiso se cambia la contraseña UNA sola vez y se cierran todas las sesiones.
//
// Antes, la app inventaba el código en el celular y el servidor aceptaba cambiar la contraseña de
// cualquier correo sin comprobar nada. Ahora, sin el código (o el permiso) no se puede cambiar.

export const CODIGO_TTL_MS = 10 * 60 * 1000;
export const PERMISO_TTL_MS = 10 * 60 * 1000;
export const MAX_INTENTOS = 5;

// --------------------------------------------------------------- Entrega del código (patrón Strategy)
// Cómo le llega el código a la persona es intercambiable. Mientras no exista un servicio de correo:
//   - "consola": el código se escribe en la consola del servidor (para quien administra). Es el modo seguro por defecto.
//   - "demo":    el código también se devuelve en la respuesta, para mostrarlo en pantalla durante la presentación.
//                En este modo, quien llame a la API conociendo un correo también ve el código: solo para demostrar.
// Para producción real se agregaría una tercera estrategia (SMTP, Resend, Supabase Auth...) que envíe
// el código al correo y no lo devuelva: no hay que tocar nada más.
export interface EntregaCodigo {
  entregar(datos: { email: string; codigo: string; existe: boolean }): Promise<{ codigoDemo?: string }>;
}

export const entregaConsola: EntregaCodigo = {
  async entregar({ email, codigo, existe }) {
    if (existe) console.warn(`[reset] código para ${enmascarar(email)}: ${codigo}`);
    return {};
  },
};

export const entregaDemo: EntregaCodigo = {
  async entregar({ email, codigo, existe }) {
    if (existe) console.warn(`[reset] (demo) código para ${enmascarar(email)}: ${codigo}`);
    // También se devuelve un código cuando el correo NO existe: así la respuesta es igual y no se puede
    // saber qué correos tienen cuenta.
    return { codigoDemo: codigo };
  },
};

export const elegirEntrega = (modo: ModoReset): EntregaCodigo => (modo === "demo" ? entregaDemo : entregaConsola);

let entrega: EntregaCodigo = elegirEntrega(env.resetModo);

// Permite cambiar la estrategia (pruebas, o un servicio de correo real).
export function usarEntrega(nueva: EntregaCodigo) {
  entrega = nueva;
}

// --------------------------------------------------------------- Paso 1
export async function solicitarCodigo(email: string): Promise<{ codigoDemo?: string }> {
  const usuario = await prisma.usuario.findUnique({ where: { email } });
  const codigo = generarCodigo();
  if (usuario) {
    // Solo el código más reciente sirve: se borran los anteriores.
    await prisma.$transaction([
      prisma.codigoReset.deleteMany({ where: { usuarioId: usuario.id } }),
      prisma.codigoReset.create({
        data: {
          usuarioId: usuario.id,
          codigoHash: hmacCodigo(codigo, usuario.id),
          expiraEn: new Date(Date.now() + CODIGO_TTL_MS),
        },
      }),
    ]);
    registrarEvento("reset_solicitado", { cuenta: enmascarar(email) });
  }
  return entrega.entregar({ email, codigo, existe: Boolean(usuario) });
}

// --------------------------------------------------------------- Paso 2
export type ResultadoVerificacion = { ok: true; permiso: string } | { ok: false };

export async function verificarCodigo(email: string, codigo: string): Promise<ResultadoVerificacion> {
  const usuario = await prisma.usuario.findUnique({ where: { email } });
  if (!usuario) return { ok: false };

  const ahora = new Date();
  const fila = await prisma.codigoReset.findFirst({
    where: { usuarioId: usuario.id, usadoEn: null, expiraEn: { gt: ahora } },
    orderBy: { creadoEn: "desc" },
  });
  if (!fila) return { ok: false };

  // El intento se RESERVA antes de comparar. Si se comparara primero y se contara después, mil
  // peticiones simultáneas podrían probar mil códigos antes de que el contador subiera.
  const reservado = await prisma.codigoReset.updateMany({
    where: { id: fila.id, usadoEn: null, intentos: { lt: MAX_INTENTOS } },
    data: { intentos: { increment: 1 } },
  });
  if (reservado.count !== 1) {
    registrarEvento("reset_intentos_agotados", { cuenta: enmascarar(email) });
    return { ok: false };
  }

  if (!iguales(hmacCodigo(codigo, usuario.id), fila.codigoHash)) {
    registrarEvento("reset_codigo_incorrecto", { cuenta: enmascarar(email) });
    return { ok: false };
  }

  const permiso = nuevoTokenOpaco();
  await prisma.codigoReset.update({
    where: { id: fila.id },
    data: { permisoHash: huella(permiso), permisoExpiraEn: new Date(ahora.getTime() + PERMISO_TTL_MS) },
  });
  return { ok: true, permiso };
}

// --------------------------------------------------------------- Paso 3
export async function confirmarReset(permiso: string, nuevaPassword: string): Promise<boolean> {
  const ahora = new Date();
  const fila = await prisma.codigoReset.findUnique({ where: { permisoHash: huella(permiso) } });
  if (!fila || fila.usadoEn || !fila.permisoExpiraEn || fila.permisoExpiraEn <= ahora) return false;

  const nuevoHash = await hashear(nuevaPassword);
  const hecho = await prisma.$transaction(async (tx) => {
    // El permiso se consume ANTES de cambiar nada: dos peticiones simultáneas no pueden usarlo a la vez.
    const consumido = await tx.codigoReset.updateMany({
      where: { id: fila.id, usadoEn: null },
      data: { usadoEn: ahora },
    });
    if (consumido.count !== 1) return false;
    await tx.usuario.update({ where: { id: fila.usuarioId }, data: { passwordHash: nuevoHash } });
    // Cambió la contraseña: se cierran todas las sesiones abiertas (por si alguien más había entrado).
    await tx.sesion.updateMany({ where: { usuarioId: fila.usuarioId, revocadaEn: null }, data: { revocadaEn: ahora } });
    return true;
  });
  if (hecho) registrarEvento("reset_completado", { usuario: fila.usuarioId });
  return hecho;
}

// Borra códigos ya usados o vencidos hace más de un día.
export async function limpiarCodigos(): Promise<number> {
  const ayer = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const r = await prisma.codigoReset.deleteMany({
    where: { OR: [{ expiraEn: { lt: ayer } }, { usadoEn: { lt: ayer } }] },
  });
  return r.count;
}
