import express from "express";
import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { ACCESS_TTL_SEG, coincide, exigirSesion, firmarAccessToken, hashear, necesitaRehash, normalizar } from "./auth";
import { guardarDatos, leerDatos } from "./datos";
import { prisma } from "./db";
import {
  limiteGeneral,
  limiteLoginCuenta,
  limiteLoginIp,
  limiteRefresh,
  limiteRegistro,
  limiteResetCorreo,
  limiteResetIp,
  limiteResetVerificar,
} from "./limites";
import { confirmarReset, solicitarCodigo, verificarCodigo } from "./reset";
import {
  datosSchema,
  loginSchema,
  refreshSchema,
  registroSchema,
  resetConfirmarSchema,
  resetSolicitarSchema,
  resetVerificarSchema,
} from "./esquemas";
import { configurarSeguridad, enmascarar, registrarEvento } from "./seguridad";
import { abrirSesion, cerrarSesion, rotarSesion } from "./sesiones";

export const app = express();
configurarSeguridad(app); // proxy, cabeceras de seguridad (helmet), CORS y "no-store"
app.use(limiteGeneral);
app.use(express.json({ limit: "1mb" }));

const usuarioPublico = (u: { id: string; email: string; username: string }) => ({
  id: u.id,
  email: u.email,
  username: u.username,
});

// Lo que recibe la app al entrar: token de acceso (15 min) + refresh token (30 días, rota en cada uso)
const respuestaDeSesion = (usuario: { id: string; email: string; username: string }, refreshToken: string) => ({
  ok: true,
  token: firmarAccessToken(usuario.id),
  refreshToken,
  expiresIn: ACCESS_TTL_SEG,
  user: usuarioPublico(usuario),
});

const sesionNoValida = (res: Response) =>
  res.status(401).json({ ok: false, error: "Sesión no válida. Inicia sesión de nuevo", codigo: "sesion_invalida" });

app.get("/salud", (_req, res) => {
  res.json({ ok: true, servicio: "taqi-backend" });
});

// ---------------------------------------------------------------- Autenticación
app.post("/auth/register", limiteRegistro, async (req, res) => {
  const { email, username, password } = registroSchema.parse(req.body);
  const mail = normalizar(email);
  const clave = normalizar(username);

  if (await prisma.usuario.findUnique({ where: { email: mail } })) {
    return res.status(409).json({ ok: false, error: "Ya existe una cuenta con ese correo" });
  }
  if (await prisma.usuario.findUnique({ where: { usernameKey: clave } })) {
    return res.status(409).json({ ok: false, error: "Ese nombre de usuario ya está en uso" });
  }

  let usuario;
  try {
    usuario = await prisma.usuario.create({
      data: {
        email: mail,
        username: username.trim(),
        usernameKey: clave,
        passwordHash: await hashear(password),
      },
    });
  } catch (error) {
    // Dos registros simultáneos con los mismos datos: gana uno y el otro choca con el índice único.
    if ((error as { code?: string }).code === "P2002") {
      return res.status(409).json({ ok: false, error: "Ya existe una cuenta con ese correo o usuario" });
    }
    throw error;
  }
  const { refreshToken } = await abrirSesion(usuario.id);
  res.status(201).json(respuestaDeSesion(usuario, refreshToken));
});

app.post("/auth/login", limiteLoginIp, limiteLoginCuenta, async (req, res) => {
  const { identifier, password } = loginSchema.parse(req.body);
  const clave = normalizar(identifier);
  const usuario = await prisma.usuario.findFirst({
    where: { OR: [{ email: clave }, { usernameKey: clave }] },
  });
  // Si no hay usuario se compara contra un hash falso (mismo tiempo) y se responde el mismo mensaje.
  const correcta = await coincide(password, usuario?.passwordHash);
  if (!usuario || !correcta) {
    registrarEvento("login_fallido", { cuenta: enmascarar(clave), ip: req.ip });
    return res.status(401).json({ ok: false, error: "Correo o contraseña incorrectos" });
  }
  // Cuentas creadas con un costo de bcrypt menor se actualizan al costo actual al entrar.
  if (necesitaRehash(usuario.passwordHash)) {
    await prisma.usuario.update({ where: { id: usuario.id }, data: { passwordHash: await hashear(password) } });
  }
  const { refreshToken } = await abrirSesion(usuario.id);
  res.json(respuestaDeSesion(usuario, refreshToken));
});

// Canjea un refresh token por un par nuevo (token de acceso + refresh token). El anterior queda usado.
app.post("/auth/refresh", limiteRefresh, async (req, res) => {
  const { refreshToken } = refreshSchema.parse(req.body);
  const r = await rotarSesion(refreshToken);
  if (!r.ok) {
    // "reutilizado" = alguien presentó un token ya usado: se cerró toda la cadena de esa sesión
    registrarEvento(r.motivo === "reutilizado" ? "refresh_reutilizado" : "refresh_rechazado", {
      motivo: r.motivo,
      ip: req.ip,
    });
    return sesionNoValida(res);
  }
  res.json({
    ok: true,
    token: firmarAccessToken(r.usuarioId),
    refreshToken: r.refreshToken,
    expiresIn: ACCESS_TTL_SEG,
  });
});

// Cierra la sesión en el servidor (el token queda inservible). Siempre responde ok: no revela si existía.
app.post("/auth/logout", limiteRefresh, async (req, res) => {
  const { refreshToken } = refreshSchema.parse(req.body);
  await cerrarSesion(refreshToken);
  res.json({ ok: true });
});

app.get("/auth/me", exigirSesion, async (req, res) => {
  const usuario = await prisma.usuario.findUnique({ where: { id: req.usuarioId! } });
  if (!usuario) return res.status(401).json({ ok: false, error: "Sesión no válida. Inicia sesión de nuevo" });
  res.json({ ok: true, user: usuarioPublico(usuario) });
});

// ---------------------------------------------------------------- Recuperar contraseña (ver reset.ts)
app.post("/auth/reset/solicitar", limiteResetIp, limiteResetCorreo, async (req, res) => {
  const { email } = resetSolicitarSchema.parse(req.body);
  const extra = await solicitarCodigo(normalizar(email));
  // Misma respuesta exista o no el correo (no se revela qué cuentas existen)
  res.json({ ok: true, mensaje: "Si el correo tiene cuenta, se generó un código de 6 dígitos que vale 10 minutos", ...extra });
});

const codigoInvalido = (res: Response) =>
  res.status(400).json({ ok: false, error: "Código incorrecto o vencido. Pide uno nuevo", codigo: "codigo_invalido" });

app.post("/auth/reset/verificar", limiteResetVerificar, async (req, res) => {
  const { email, codigo } = resetVerificarSchema.parse(req.body);
  const r = await verificarCodigo(normalizar(email), codigo);
  if (!r.ok) return codigoInvalido(res);
  res.json({ ok: true, permiso: r.permiso });
});

app.post("/auth/reset/confirmar", limiteResetVerificar, async (req, res) => {
  const { permiso, newPassword } = resetConfirmarSchema.parse(req.body);
  if (!(await confirmarReset(permiso, newPassword))) {
    return res.status(400).json({
      ok: false,
      error: "La verificación venció. Pide un código nuevo",
      codigo: "permiso_invalido",
    });
  }
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
app.use((_req, res) => {
  res.status(404).json({ ok: false, error: "Ruta no encontrada" });
});

app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (error instanceof ZodError) {
    return res.status(400).json({
      ok: false,
      error: "Datos no válidos",
      detalle: error.issues.map((i) => `${i.path.join(".")}: ${i.message}`),
    });
  }
  // Errores del lector de JSON (cuerpo mal formado o demasiado grande): son del cliente, no del servidor
  const estado = (error as { status?: number }).status;
  if (typeof estado === "number" && estado >= 400 && estado < 500) {
    return res.status(estado).json({
      ok: false,
      error: estado === 413 ? "La petición es demasiado grande" : "Petición no válida",
    });
  }
  console.error("[api] error no controlado", error);
  res.status(500).json({ ok: false, error: "Error interno del servidor" });
});
