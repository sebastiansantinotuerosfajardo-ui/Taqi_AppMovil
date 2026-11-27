import cors from "cors";
import type { CorsOptions } from "cors";
import type { Express, NextFunction, Request, Response } from "express";
import helmet from "helmet";
import { env } from "./env";

// ------------------------------------------------------------------ Registro de eventos de seguridad
// Una línea JSON por evento (login fallido, token reutilizado, límite superado...). Nunca incluye
// contraseñas, tokens ni códigos, y los correos se enmascaran: así el registro sirve para auditar
// sin convertirse en otro lugar donde se filtren datos.
let salida: (linea: string) => void = (linea) => console.warn(linea);

// Solo para pruebas: permite capturar lo que se registra.
export function usarSalidaDeEventos(destino: (linea: string) => void) {
  salida = destino;
}

export function registrarEvento(evento: string, datos: Record<string, string | number | boolean | undefined> = {}) {
  salida(JSON.stringify({ t: new Date().toISOString(), evento, ...datos }));
}

// "ana@correo.com" -> "a***@correo.com"; "ana_perez" -> "a***"
export function enmascarar(valor: string): string {
  const v = valor.trim();
  const arroba = v.indexOf("@");
  if (arroba > 0) return `${v[0]}***${v.slice(arroba)}`;
  return v.length <= 1 ? "*" : `${v[0]}***`;
}

// ------------------------------------------------------------------ CORS
// CORS solo lo aplican los NAVEGADORES. La app del celular no lo usa (no envía "Origin"), así que
// una lista estricta no la afecta; solo evita que otras páginas web llamen a la API desde un navegador.
export function opcionesCors(permitidos: string[]): CorsOptions {
  return {
    origin: (origen, devolver) => {
      if (!origen) return devolver(null, true); // app del celular, curl, pruebas: no son navegadores
      devolver(null, permitidos.includes("*") || permitidos.includes(origen));
    },
    methods: ["GET", "POST", "PUT"],
    allowedHeaders: ["Content-Type", "Authorization"],
    maxAge: 600,
  };
}

// Las respuestas con tokens o datos personales no deben guardarse en cachés intermedias.
function sinCache(_req: Request, res: Response, next: NextFunction) {
  res.setHeader("Cache-Control", "no-store");
  next();
}

// Capa de seguridad HTTP: se aplica antes que cualquier ruta.
export function configurarSeguridad(app: Express) {
  app.disable("x-powered-by");
  // Detrás de un proxy (Render, Railway...) la IP real viene en X-Forwarded-For: sin esto, todos los
  // usuarios compartirían la IP del proxy y el límite de intentos bloquearía a todos a la vez.
  app.set("trust proxy", env.trustProxy);
  app.use(helmet()); // cabeceras: nosniff, HSTS, no-referrer, etc.
  app.use(cors(opcionesCors(env.corsOrigins)));
  app.use(["/auth", "/datos"], sinCache);
}
