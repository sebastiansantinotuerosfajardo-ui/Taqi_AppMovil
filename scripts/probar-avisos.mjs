// Prueba de la lógica de avisos y de las deudas de demostración (sin teléfono).
// Ejecutar:  node scripts/probar-avisos.mjs
import { planificarAvisos } from "../utils/avisos.js";
import { crearDeudasDemo } from "../utils/demo.js";

let fallos = 0;
const verificar = (nombre, condicion, detalle = "") => {
  console.log(`${condicion ? "✔" : "✘"} ${nombre}${detalle ? "  → " + detalle : ""}`);
  if (!condicion) fallos++;
};
const f = (iso) => new Date(iso); // hora local
const txt = (d) => `${d.getDate()}/${d.getMonth() + 1} ${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;

// Miércoles 25-nov-2026 a las 08:00 (antes de las 9:00)
let hoy = f("2026-11-25T08:00:00");
let demos = crearDeudasDemo(hoy);
verificar("hay 4 deudas de demostración", demos.length === 4);
verificar("vencen jueves 26, viernes 27, sábado 28 y domingo 29", demos.map((d) => d.diaVencimiento).join() === "26,27,28,29", demos.map((d) => d.diaVencimiento).join());
const gastos = demos.map((d, i) => ({ id: `d${i}`, title: d.title, amount: d.amount, diaVencimiento: d.diaVencimiento }));

let r = planificarAvisos(gastos, hoy, { hora: 9, meses: 1 });
verificar("miércoles 8:00: el aviso de la deuda del jueves queda programado hoy 9:00", txt(r.programados.find((p) => p.titulo.includes("Internet")).fecha) === "25/11 9:00");
verificar("miércoles 8:00: no hay avisos inmediatos", r.inmediatos.length === 0);
verificar("los 4 avisos van a las 9:00 del día anterior", r.programados.map((p) => txt(p.fecha)).join() === "25/11 9:00,26/11 9:00,27/11 9:00,28/11 9:00", r.programados.map((p) => txt(p.fecha)).join());

// Miércoles 15:00 (ya pasaron las 9:00): la deuda del jueves debe avisar enseguida
hoy = f("2026-11-25T15:00:00");
r = planificarAvisos(gastos, hoy, { hora: 9, meses: 1 });
verificar("miércoles 15:00: la deuda del jueves avisa de inmediato", r.inmediatos.length === 1 && r.inmediatos[0].titulo.includes("vence mañana"), r.inmediatos.map((i) => i.titulo).join("|"));
verificar("miércoles 15:00: las otras 3 siguen programadas", r.programados.length === 3);

// No se repite el aviso inmediato
const yaAvisado = r.inmediatos.map((i) => i.clave);
r = planificarAvisos(gastos, hoy, { hora: 9, meses: 1, avisados: yaAvisado });
verificar("un aviso inmediato no se repite", r.inmediatos.length === 0);

// El mismo día del vencimiento
hoy = f("2026-11-26T10:00:00");
r = planificarAvisos(gastos, hoy, { hora: 9, meses: 1 });
verificar("jueves 10:00: la deuda del jueves dice 'vence hoy'", r.inmediatos.some((i) => i.titulo.includes("vence hoy")), r.inmediatos.map((i) => i.titulo).join("|"));

// Hora personalizada: 20:00 y se activa a las 15:00 → todavía queda programado
hoy = f("2026-11-25T15:00:00");
r = planificarAvisos(gastos, hoy, { hora: 20, meses: 1 });
verificar("con hora 20:00 y activando a las 15:00, el aviso del jueves se programa hoy 20:00", txt(r.programados.find((p) => p.titulo.includes("Internet")).fecha) === "25/11 20:00");

// Tres meses programados
r = planificarAvisos(gastos.slice(0, 1), f("2026-11-25T08:00:00"), { hora: 9, meses: 3 });
verificar("se programan 3 meses por gasto", r.programados.length === 3, r.programados.map((p) => txt(p.fecha)).join());

// Gasto del día 1 y hoy 30 de noviembre → vence 1 de diciembre, aviso 30/11
r = planificarAvisos([{ id: "x", title: "Alquiler", amount: 650, diaVencimiento: 1 }], f("2026-11-30T08:00:00"), { hora: 9, meses: 1 });
verificar("cambio de mes: vence 1/12 y avisa 30/11 9:00", txt(r.programados[0].fecha) === "30/11 9:00", txt(r.programados[0].fecha));

// Día 31 en mes de 30 días
r = planificarAvisos([{ id: "y", title: "Luz", amount: 100, diaVencimiento: 31 }], f("2026-11-01T08:00:00"), { hora: 9, meses: 1 });
verificar("día 31 en noviembre vence el 30 y avisa el 29", txt(r.programados[0].fecha) === "29/11 9:00", txt(r.programados[0].fecha));

// Si hoy es jueves, "demo jueves" vence hoy y las demás en los días siguientes
demos = crearDeudasDemo(f("2026-11-26T09:30:00"));
verificar("si hoy es jueves la primera deuda vence hoy (26)", demos[0].diaVencimiento === 26, String(demos[0].diaVencimiento));

console.log(fallos === 0 ? "\n✔ Todas las pruebas de avisos pasaron" : `\n✘ ${fallos} prueba(s) fallaron`);
process.exit(fallos === 0 ? 0 : 1);
