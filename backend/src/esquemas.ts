import { z } from "zod";

const id = z.string().min(1).max(64);
const fecha = z.string().refine((s) => !Number.isNaN(Date.parse(s)), "Fecha no válida");

export const registroSchema = z.object({
  email: z.string().trim().email().max(120),
  username: z.string().trim().min(2).max(40),
  password: z.string().min(6).max(100),
});

export const loginSchema = z.object({
  identifier: z.string().trim().min(1).max(120),
  password: z.string().min(1).max(100),
});

export const resetSchema = z.object({
  email: z.string().trim().email().max(120),
  newPassword: z.string().min(6).max(100),
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
