import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { NextFunction, Request, Response } from "express";
import { env } from "./env";

export const normalizar = (texto: string) => texto.trim().toLowerCase();

export const hashear = (password: string) => bcrypt.hash(password, 10);
export const coincide = (password: string, hash: string) => bcrypt.compare(password, hash);

export function firmarToken(usuarioId: string): string {
  return jwt.sign({ sub: usuarioId }, env.jwtSecret, { expiresIn: "30d" });
}

declare module "express-serve-static-core" {
  interface Request {
    usuarioId?: string;
  }
}

// Exige el encabezado "Authorization: Bearer <token>" y deja el id del usuario en req.usuarioId
export function exigirSesion(req: Request, res: Response, next: NextFunction) {
  const cabecera = req.headers.authorization ?? "";
  const token = cabecera.startsWith("Bearer ") ? cabecera.slice(7) : "";
  try {
    const datos = jwt.verify(token, env.jwtSecret) as { sub?: string };
    if (!datos.sub) throw new Error("token sin usuario");
    req.usuarioId = datos.sub;
    next();
  } catch {
    res.status(401).json({ ok: false, error: "Sesión no válida. Inicia sesión de nuevo" });
  }
}

// Limitador sencillo en memoria para frenar intentos repetidos de acceso por IP
export function limitar(maximo: number, ventanaMs: number) {
  const registro = new Map<string, { cuenta: number; hasta: number }>();
  return (req: Request, res: Response, next: NextFunction) => {
    const ahora = Date.now();
    const clave = req.ip ?? "desconocida";
    const actual = registro.get(clave);
    if (!actual || actual.hasta < ahora) {
      registro.set(clave, { cuenta: 1, hasta: ahora + ventanaMs });
      return next();
    }
    actual.cuenta += 1;
    if (actual.cuenta > maximo) {
      return res
        .status(429)
        .json({ ok: false, error: "Demasiados intentos. Espera unos minutos e inténtalo de nuevo" });
    }
    next();
  };
}
