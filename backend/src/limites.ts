import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import type { Request } from "express";
import { registrarEvento } from "./seguridad";

// Límites de intentos (rate limiting). Frenan la fuerza bruta contra contraseñas y códigos y el
// "spam" de cuentas. Cada límite cuenta por IP; los de acceso y recuperación también por cuenta.
//
// IMPORTANTE: los contadores viven en la memoria del servidor. Con una sola instancia (como en esta
// demostración) funciona bien; con varias instancias hay que guardarlos en un almacén compartido
// (Redis) -> express-rate-limit lo permite cambiando el "store".

const MIN = 60 * 1000;

type Opciones = {
  nombre: string;
  ventanaMs: number;
  maximo: number;
  soloFallos?: boolean; // true: solo cuentan las respuestas con error (401, 400...), no los accesos correctos
  clave?: (req: Request) => string; // por defecto, la IP
};

const ip = (req: Request) => ipKeyGenerator(req.ip ?? "desconocida");
const texto = (valor: unknown) => (typeof valor === "string" ? valor.trim().toLowerCase().slice(0, 120) : "");

function crear({ nombre, ventanaMs, maximo, soloFallos = false, clave = ip }: Opciones) {
  return rateLimit({
    windowMs: ventanaMs,
    limit: maximo,
    standardHeaders: "draft-8", // cabeceras RateLimit / RateLimit-Policy (estándar en borrador del IETF)
    legacyHeaders: false,
    skipSuccessfulRequests: soloFallos,
    keyGenerator: clave,
    handler: (req, res, _next, opciones) => {
      registrarEvento("limite_superado", { limite: nombre, ip: req.ip });
      res.status(opciones.statusCode).json({
        ok: false,
        error: "Demasiados intentos. Espera unos minutos e inténtalo de nuevo",
        codigo: "demasiados_intentos",
      });
    },
  });
}

// Tope general contra inundaciones (600 peticiones por minuto y por IP; varias personas pueden
// compartir una misma IP, por ejemplo en el Wi-Fi de la universidad).
export const limiteGeneral = crear({ nombre: "general", ventanaMs: MIN, maximo: 600 });

export const limiteRegistro = crear({ nombre: "registro", ventanaMs: 60 * MIN, maximo: 20 });

// Acceso: 5 fallos por cuenta y por IP cada 15 minutos (frena adivinar la contraseña de UNA cuenta)
// y 100 fallos por IP (frena probar muchas cuentas distintas desde un mismo lugar).
export const limiteLoginCuenta = crear({
  nombre: "login_cuenta",
  ventanaMs: 15 * MIN,
  maximo: 5,
  soloFallos: true,
  clave: (req) => `${ip(req)}|${texto(req.body?.identifier)}`,
});
export const limiteLoginIp = crear({ nombre: "login_ip", ventanaMs: 15 * MIN, maximo: 100, soloFallos: true });

export const limiteRefresh = crear({ nombre: "refresh", ventanaMs: 15 * MIN, maximo: 120 });

// Recuperación de contraseña: pocas solicitudes por IP, una por correo cada 30 segundos (igual si el
// correo existe o no, para no revelar qué cuentas existen) y pocos intentos de verificar/confirmar.
export const limiteResetIp = crear({ nombre: "reset_ip", ventanaMs: 15 * MIN, maximo: 10 });
export const limiteResetCorreo = crear({
  nombre: "reset_correo",
  ventanaMs: 30 * 1000,
  maximo: 1,
  clave: (req) => `correo|${texto(req.body?.email)}`,
});
export const limiteResetVerificar = crear({ nombre: "reset_verificar", ventanaMs: 15 * MIN, maximo: 20 });
