import { z } from "zod";

const id = z.string().min(1).max(64);
const fecha = z.string().refine((s) => !Number.isNaN(Date.parse(s)), "Fecha no válida");

// bcrypt solo usa los primeros 72 BYTES de la contraseña: más allá se ignora en silencio. Por eso al
// crear o cambiar una contraseña se rechaza lo que pase de 72 bytes (no al entrar, para no dejar
// fuera a quien ya tenía una contraseña más larga).
const passwordNueva = z
  .string()
  .min(6)
  .max(100)
  .refine((p) => Buffer.byteLength(p, "utf8") <= 72, "La contraseña es demasiado larga (máximo 72 caracteres)");

export const registroSchema = z.object({
  email: z.string().trim().email().max(120),
  username: z.string().trim().min(2).max(40),
  password: passwordNueva,
});

export const loginSchema = z.object({
  identifier: z.string().trim().min(1).max(120),
  password: z.string().min(1).max(100),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(20).max(200),
});

// Recuperación de contraseña (3 pasos, ver reset.ts)
export const resetSolicitarSchema = z.object({
  email: z.string().trim().email().max(120),
});

export const resetVerificarSchema = z.object({
  email: z.string().trim().email().max(120),
  codigo: z.string().regex(/^\d{6}$/, "El código tiene 6 dígitos"),
});

export const resetConfirmarSchema = z.object({
  permiso: z.string().min(20).max(200),
  newPassword: passwordNueva,
});

// Forma de los datos tal como los maneja la app (AppDataContext)
const aporteSchema = z.object({
  id,
  amount: z.number().finite().nonnegative().max(1e9),
  date: fecha,
  foto: z.string().max(2000).nullish(),
});

const metaSchema = z.object({
  id,
  title: z.string().trim().min(1).max(120),
  target: z.number().finite().positive().max(1e9),
  aportes: z.array(aporteSchema).max(5000).default([]),
});

const gastoFijoSchema = z.object({
  id,
  title: z.string().trim().min(1).max(120),
  amount: z.number().finite().nonnegative().max(1e9),
  icon: z.string().max(60).default("receipt-outline"),
  category: z.string().max(60).default("Fijo"),
  diaVencimiento: z.number().int().min(1).max(31).default(1),
});

export const datosSchema = z.object({
  metas: z.array(metaSchema).max(500),
  gastosFijos: z.array(gastoFijoSchema).max(500),
  presupuesto: z.object({
    ingresoMensual: z.number().finite().nonnegative().max(1e9),
    gastoVariableEstimado: z.number().finite().nonnegative().max(1e9),
  }),
  perfilVivienda: z.enum(["fija", "variable"]),
  ajustes: z.object({ recordatorios: z.boolean() }),
  activas: z.record(z.string(), z.boolean()),
});

export type Datos = z.infer<typeof datosSchema>;
