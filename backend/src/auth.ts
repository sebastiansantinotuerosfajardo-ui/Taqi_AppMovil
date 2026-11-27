import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { NextFunction, Request, Response } from "express";
import { env } from "./env";

export const normalizar = (texto: string) => texto.trim().toLowerCase();

// ------------------------------------------------------------------ Contraseñas (bcrypt)
// bcrypt es lento A PROPÓSITO: cada intento de adivinar una contraseña cuesta tiempo. El "costo" 12
// (4096 vueltas internas) toma unos 250-300 ms; cada +1 duplica el tiempo. OWASP recomienda 10 o más.
export const COSTO_BCRYPT = 12;
export const hashear = (password: string) => bcrypt.hash(password, COSTO_BCRYPT);

// true si el hash se hizo con un costo menor: se vuelve a calcular cuando la persona entra
// (único momento en que se conoce la contraseña) para subir la seguridad de las cuentas antiguas.
export function necesitaRehash(hash: string): boolean {
  try {
    const vueltas = bcrypt.getRounds(hash); // con un texto que no es un hash devuelve NaN (no lanza error)
    return Number.isNaN(vueltas) || vueltas < COSTO_BCRYPT;
  } catch {
    return true;
  }
}

// Si el usuario NO existe se compara contra un hash falso: así tardar lo mismo que con un usuario real
// y no se puede descubrir qué correos tienen cuenta midiendo el tiempo de respuesta.
let hashFalso: Promise<string> | undefined;
export async function coincide(password: string, hash: string | null | undefined): Promise<boolean> {
  if (!hash) {
    hashFalso ??= bcrypt.hash("taqi-relleno-de-tiempo", COSTO_BCRYPT);
    await bcrypt.compare(password, await hashFalso);
    return false;
  }
  return bcrypt.compare(password, hash);
}

// ------------------------------------------------------------------ Token de acceso (JWT)
// Dura solo 15 minutos: si lo roban, sirve poco tiempo. Para seguir con la sesión, la app canjea su
// "refresh token" (ver sesiones.ts) y recibe uno nuevo.
export const ACCESS_TTL_SEG = 15 * 60;
export const EMISOR = "taqi-api";
export const AUDIENCIA = "taqi-app";
const ALGORITMO = "HS256" as const;

export function firmarAccessToken(usuarioId: string): string {
  return jwt.sign({}, env.jwtSecret, {
    algorithm: ALGORITMO,
    subject: usuarioId,
    issuer: EMISOR,
    audience: AUDIENCIA,
    expiresIn: ACCESS_TTL_SEG,
  });
}

// Se fija el algoritmo permitido: así no se aceptan tokens "alg: none" ni firmados con otro algoritmo.
export function verificarAccessToken(token: string): { sub: string } {
  const datos = jwt.verify(token, env.jwtSecret, {
    algorithms: [ALGORITMO],
    issuer: EMISOR,
    audience: AUDIENCIA,
  });
  if (typeof datos === "string" || !datos.sub) throw new Error("token sin usuario");
  return { sub: datos.sub };
}

declare module "express-serve-static-core" {
  interface Request {
    usuarioId?: string;
  }
}

// Exige "Authorization: Bearer <token>" y deja el id del usuario en req.usuarioId
export function exigirSesion(req: Request, res: Response, next: NextFunction) {
  const coincidencia = /^Bearer\s+(\S+)$/i.exec(req.headers.authorization ?? "");
  try {
    if (!coincidencia) throw new Error("sin token");
    req.usuarioId = verificarAccessToken(coincidencia[1]).sub;
    next();
  } catch (error) {
    // "token_vencido" le indica a la app que debe renovar la sesión con su refresh token
    const vencido = error instanceof jwt.TokenExpiredError;
    res.status(401).json({
      ok: false,
      error: "Sesión no válida. Inicia sesión de nuevo",
      codigo: vencido ? "token_vencido" : "token_invalido",
    });
  }
}
