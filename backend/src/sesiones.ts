import { randomUUID } from "node:crypto";
import { huella, nuevoTokenOpaco } from "./cripto";
import { prisma } from "./db";

// Sesiones con "refresh token" que ROTA (patrón recomendado por OAuth 2.0 Security BCP, RFC 9700):
//
//   1. Al entrar, el servidor crea una "familia" y entrega un refresh token (vale 30 días).
//   2. Cuando el token de acceso vence (15 min), la app envía su refresh token y recibe UNO NUEVO;
//      el anterior queda marcado como "usado".
//   3. Si alguien presenta un token que ya estaba usado, es señal de que fue copiado (el ladrón y la
//      persona lo usan por turnos): se cierra TODA la familia y hay que volver a iniciar sesión.
//
// En la base de datos solo se guarda la huella SHA-256 de cada token.

export const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export async function abrirSesion(usuarioId: string): Promise<{ refreshToken: string; familia: string }> {
  const refreshToken = nuevoTokenOpaco();
  const familia = randomUUID();
  await prisma.sesion.create({
    data: { usuarioId, familia, tokenHash: huella(refreshToken), expiraEn: new Date(Date.now() + REFRESH_TTL_MS) },
  });
  return { refreshToken, familia };
}

export type ResultadoRotacion =
  | { ok: true; usuarioId: string; refreshToken: string }
  | { ok: false; motivo: "desconocido" | "revocado" | "expirado" | "reutilizado" };

export async function rotarSesion(refreshToken: string): Promise<ResultadoRotacion> {
  const fila = await prisma.sesion.findUnique({ where: { tokenHash: huella(refreshToken) } });
  if (!fila) return { ok: false, motivo: "desconocido" };
  if (fila.revocadaEn) return { ok: false, motivo: "revocado" };
  const ahora = new Date();
  if (fila.expiraEn <= ahora) return { ok: false, motivo: "expirado" };

  // Canje ATÓMICO: marcar el token como usado y crear el siguiente ocurre en una sola transacción.
  // Si dos peticiones llegan a la vez con el mismo token, la base de datos deja pasar solo a una
  // (la otra espera el bloqueo de la fila, ve que ya está usado y cuenta como reutilización).
  const nuevo = nuevoTokenOpaco();
  const canjeado = await prisma.$transaction(async (tx) => {
    const canje = await tx.sesion.updateMany({
      where: { id: fila.id, usadaEn: null, revocadaEn: null },
      data: { usadaEn: ahora },
    });
    if (canje.count !== 1) return false;
    await tx.sesion.create({
      data: {
        usuarioId: fila.usuarioId,
        familia: fila.familia,
        tokenHash: huella(nuevo),
        expiraEn: new Date(ahora.getTime() + REFRESH_TTL_MS),
      },
    });
    return true;
  });

  if (!canjeado) {
    await revocarFamilia(fila.familia);
    return { ok: false, motivo: "reutilizado" };
  }
  return { ok: true, usuarioId: fila.usuarioId, refreshToken: nuevo };
}

export async function revocarFamilia(familia: string): Promise<void> {
  await prisma.sesion.updateMany({ where: { familia, revocadaEn: null }, data: { revocadaEn: new Date() } });
}

// Cierra todas las sesiones de una persona (por ejemplo, tras cambiar la contraseña).
export async function revocarTodas(usuarioId: string): Promise<void> {
  await prisma.sesion.updateMany({ where: { usuarioId, revocadaEn: null }, data: { revocadaEn: new Date() } });
}

// Cerrar sesión: si el token no existe no pasa nada (no se revela si era válido o no).
export async function cerrarSesion(refreshToken: string): Promise<void> {
  const fila = await prisma.sesion.findUnique({ where: { tokenHash: huella(refreshToken) } });
  if (fila) await revocarFamilia(fila.familia);
}

// Borra tokens vencidos y sesiones cerradas hace más de una semana (la tabla no crece sin límite).
export async function limpiarSesiones(): Promise<number> {
  const ahora = new Date();
  const semana = new Date(ahora.getTime() - 7 * 24 * 60 * 60 * 1000);
  const r = await prisma.sesion.deleteMany({
    where: { OR: [{ expiraEn: { lt: ahora } }, { revocadaEn: { lt: semana } }] },
  });
  return r.count;
}
