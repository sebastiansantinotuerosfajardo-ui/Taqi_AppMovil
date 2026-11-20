import { prisma } from "./db";
import type { Datos } from "./esquemas";

const num = (d: { toString(): string }) => Number(d.toString());

// Lee todo lo del usuario con la misma forma que usa la app
export async function leerDatos(usuarioId: string) {
  const [ajustes, metas, gastos] = await Promise.all([
    prisma.ajustes.findUnique({ where: { usuarioId } }),
    prisma.meta.findMany({
      where: { usuarioId },
      orderBy: [{ orden: "asc" }, { creadaEn: "asc" }],
      include: { aportes: { orderBy: { fecha: "desc" } } },
    }),
    prisma.gastoFijo.findMany({ where: { usuarioId }, orderBy: { orden: "asc" } }),
  ]);

  if (!ajustes) return { inicializado: false as const };

  return {
    inicializado: true as const,
    metas: metas.map((m) => ({
      id: m.clienteId,
      title: m.titulo,
      target: num(m.objetivo),
      aportes: m.aportes.map((a) => ({
        id: a.clienteId,
        amount: num(a.monto),
        date: a.fecha.toISOString(),
        foto: a.foto,
      })),
    })),
    gastosFijos: gastos.map((g) => ({
      id: g.clienteId,
      title: g.titulo,
      amount: num(g.monto),
      icon: g.icono,
      category: g.categoria,
      diaVencimiento: g.diaVencimiento,
    })),
    presupuesto: {
      ingresoMensual: num(ajustes.ingresoMensual),
      gastoVariableEstimado: num(ajustes.gastoVariableEstimado),
    },
    perfilVivienda: ajustes.perfilVivienda as "fija" | "variable",
    ajustes: { recordatorios: ajustes.recordatorios },
    activas: ajustes.activas as Record<string, boolean>,
  };
}

// Reemplaza los datos del usuario por los que envía la app, todo dentro de una transacción:
// crea o actualiza lo que llega y borra lo que ya no está.
export async function guardarDatos(usuarioId: string, datos: Datos) {
  await prisma.$transaction(async (tx) => {
    await tx.ajustes.upsert({
      where: { usuarioId },
      create: {
        usuarioId,
        ingresoMensual: datos.presupuesto.ingresoMensual,
        gastoVariableEstimado: datos.presupuesto.gastoVariableEstimado,
        perfilVivienda: datos.perfilVivienda,
        recordatorios: datos.ajustes.recordatorios,
        activas: datos.activas,
      },
      update: {
        ingresoMensual: datos.presupuesto.ingresoMensual,
        gastoVariableEstimado: datos.presupuesto.gastoVariableEstimado,
        perfilVivienda: datos.perfilVivienda,
        recordatorios: datos.ajustes.recordatorios,
        activas: datos.activas,
      },
    });

    // Metas y sus aportes
    await tx.meta.deleteMany({
      where: { usuarioId, clienteId: { notIn: datos.metas.map((m) => m.id) } },
    });
    for (const [orden, m] of datos.metas.entries()) {
      const meta = await tx.meta.upsert({
        where: { usuarioId_clienteId: { usuarioId, clienteId: m.id } },
        create: { usuarioId, clienteId: m.id, titulo: m.title, objetivo: m.target, orden },
        update: { titulo: m.title, objetivo: m.target, orden },
      });
      await tx.aporte.deleteMany({
        where: { metaId: meta.id, clienteId: { notIn: m.aportes.map((a) => a.id) } },
      });
      for (const a of m.aportes) {
        await tx.aporte.upsert({
          where: { metaId_clienteId: { metaId: meta.id, clienteId: a.id } },
          create: {
            metaId: meta.id,
            clienteId: a.id,
            monto: a.amount,
            fecha: new Date(a.date),
            foto: a.foto ?? null,
          },
          update: { monto: a.amount, fecha: new Date(a.date), foto: a.foto ?? null },
        });
      }
    }

    // Gastos fijos
    await tx.gastoFijo.deleteMany({
      where: { usuarioId, clienteId: { notIn: datos.gastosFijos.map((g) => g.id) } },
    });
    for (const [orden, g] of datos.gastosFijos.entries()) {
      const campos = {
        titulo: g.title,
        monto: g.amount,
        icono: g.icon,
        categoria: g.category,
        diaVencimiento: g.diaVencimiento,
        orden,
      };
      await tx.gastoFijo.upsert({
        where: { usuarioId_clienteId: { usuarioId, clienteId: g.id } },
        create: { usuarioId, clienteId: g.id, ...campos },
        update: campos,
      });
    }
  });
}
