import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { env } from "./env";

// Funciones criptográficas pequeñas y sin base de datos (se prueban en test/logica.ts).

// Token opaco de 256 bits (refresh token, permiso de recuperación). No tiene datos dentro: solo
// sirve si su huella está guardada en la base de datos.
export const nuevoTokenOpaco = () => randomBytes(32).toString("base64url");

// Huella SHA-256 de un token. Como el token ya es aleatorio de 256 bits, un hash rápido es suficiente
// (a diferencia de las contraseñas, que son cortas y por eso usan bcrypt, que es lento a propósito).
export const huella = (token: string) => createHash("sha256").update(token).digest("hex");

// Código de 6 dígitos con generador criptográfico (Math.random NO es seguro para esto).
export const generarCodigo = () => String(randomInt(0, 1_000_000)).padStart(6, "0");

// HMAC del código de 6 dígitos. Un código tiene solo un millón de combinaciones: con un hash simple
// se podría adivinar en segundos si se filtrara la base de datos. El HMAC usa una clave secreta del
// servidor (derivada de JWT_SECRET), por lo que sin esa clave no se puede probar offline.
export const hmacCodigo = (codigo: string, usuarioId: string) =>
  createHmac("sha256", env.jwtSecret).update(`taqi:reset:v1:${usuarioId}:${codigo}`).digest("hex");

// Comparación en tiempo constante (evita descubrir el valor midiendo cuánto tarda la comparación).
export function iguales(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
