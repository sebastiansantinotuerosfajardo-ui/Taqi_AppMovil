// Deudas de demostración para la exposición: una por cada día de aviso, de miércoles a sábado.
// Cada deuda vence el día SIGUIENTE al aviso, así TAQI avisa el mismo día en que se expone:
//   exponer el miércoles → vence el jueves, jueves → viernes, viernes → sábado, sábado → domingo.
export const PREFIJO_DEMO = "Demo · ";

const PLANTILLAS = [
  { avisa: 3, titulo: "Internet", monto: 89, icono: "wifi-outline" },
  { avisa: 4, titulo: "Luz", monto: 120, icono: "flash-outline" },
  { avisa: 5, titulo: "Agua", monto: 45, icono: "water-outline" },
  { avisa: 6, titulo: "Gas", monto: 38, icono: "flame-outline" },
];

// Primera fecha, desde hoy (incluido), que cae en ese día de la semana (0 = domingo … 6 = sábado).
function proximoDiaSemana(diaSemana, desde) {
  const inicio = new Date(desde.getFullYear(), desde.getMonth(), desde.getDate());
  const falta = (diaSemana - inicio.getDay() + 7) % 7;
  return new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate() + falta);
}

export const esDemo = (gasto) => typeof gasto.title === "string" && gasto.title.startsWith(PREFIJO_DEMO);

export function crearDeudasDemo(hoy = new Date()) {
  return PLANTILLAS.map((p) => {
    const venceSemana = (p.avisa + 1) % 7;
    const vence = proximoDiaSemana(venceSemana, hoy);
    return {
      title: `${PREFIJO_DEMO}${p.titulo}`,
      amount: p.monto,
      icon: p.icono,
      category: "Servicios",
      diaVencimiento: vence.getDate(),
    };
  });
}
