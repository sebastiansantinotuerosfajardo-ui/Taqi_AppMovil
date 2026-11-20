import cors from "cors";
import express from "express";
import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { coincide, exigirSesion, firmarToken, hashear, limitar, normalizar } from "./auth";
import { guardarDatos, leerDatos } from "./datos";
import { prisma } from "./db";
import { env } from "./env";
import { datosSchema, loginSchema, registroSchema, resetSchema } from "./esquemas";

export const app = express();
app.use(cors({ origin: env.corsOrigin }));
app.use(express.json({ limit: "1mb" }));

const usuarioPublico = (u: { id: string; email: string; username: string }) => ({
  id: u.id,
  email: u.email,
  username: u.username,
});

app.get("/salud", (_req, res) => {
  res.json({ ok: true, servicio: "taqi-backend" });
});

// ---------------------------------------------------------------- Autenticación
const limiteAcceso = limitar(30, 15 * 60 * 1000);

app.post("/auth/register", limiteAcceso, async (req, res) => {
  const { email, username, password } = registroSchema.parse(req.body);
  const mail = normalizar(email);
  const clave = normalizar(username);

  if (await prisma.usuario.findUnique({ where: { email: mail } })) {
    return res.status(409).json({ ok: false, error: "Ya existe una cuenta con ese correo" });
  }
  if (await prisma.usuario.findUnique({ where: { usernameKey: clave } })) {
    return res.status(409).json({ ok: false, error: "Ese nombre de usuario ya está en uso" });
  }

  const usuario = await prisma.usuario.create({
    data: {
      email: mail,
      username: username.trim(),
      usernameKey: clave,
      passwordHash: await hashear(password),
    },
  });
  res.status(201).json({ ok: true, token: firmarToken(usuario.id), user: usuarioPublico(usuario) });
});

app.post("/auth/login", limiteAcceso, async (req, res) => {
  const { identifier, password } = loginSchema.parse(req.body);
  const clave = normalizar(identifier);
  const usuario = await prisma.usuario.findFirst({
    where: { OR: [{ email: clave }, { usernameKey: clave }] },
  });
  if (!usuario || !(await coincide(password, usuario.passwordHash))) {
    return res.status(401).json({ ok: false, error: "Correo o contraseña incorrectos" });
  }
  res.json({ ok: true, token: firmarToken(usuario.id), user: usuarioPublico(usuario) });
});

app.get("/auth/me", exigirSesion, async (req, res) => {
  const usuario = await prisma.usuario.findUnique({ where: { id: req.usuarioId! } });
  if (!usuario) return res.status(401).json({ ok: false, error: "Sesión no válida. Inicia sesión de nuevo" });
  res.json({ ok: true, user: usuarioPublico(usuario) });
});

// La app verifica un código simulado en pantalla y luego pide el cambio de contraseña.
// LIMITACIÓN: sin servidor de correo, este endpoint no puede comprobar que quien lo llama
// sea el dueño del correo. En producción debe sustituirse por Supabase Auth (correo real).
app.post("/auth/reset-password", limiteAcceso, async (req, res) => {
  const { email, newPassword } = resetSchema.parse(req.body);
  const usuario = await prisma.usuario.findUnique({ where: { email: normalizar(email) } });
  if (!usuario) {
    return res.status(404).json({ ok: false, error: "No se encontró ninguna cuenta con ese correo" });
  }
  await prisma.usuario.update({
    where: { id: usuario.id },
    data: { passwordHash: await hashear(newPassword) },
  });
  res.json({ ok: true });
});

// ---------------------------------------------------------------- Datos del usuario
app.get("/datos", exigirSesion, async (req, res) => {
  res.json({ ok: true, datos: await leerDatos(req.usuarioId!) });
});

app.put("/datos", exigirSesion, async (req, res) => {
  const datos = datosSchema.parse(req.body);
  await guardarDatos(req.usuarioId!, datos);
  res.json({ ok: true });
});

// ---------------------------------------------------------------- Errores
app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (error instanceof ZodError) {
    return res.status(400).json({
      ok: false,
      error: "Datos no válidos",
      detalle: error.issues.map((i) => `${i.path.join(".")}: ${i.message}`),
    });
  }
  console.error("[api] error no controlado", error);
  res.status(500).json({ ok: false, error: "Error interno del servidor" });
});
