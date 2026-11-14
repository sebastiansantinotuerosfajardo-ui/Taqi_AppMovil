// Cálculo de vencimientos de gastos fijos. Cada gasto guarda solo el día del mes (1–31).

function ultimoDiaDelMes(anio, mes) {
  return new Date(anio, mes + 1, 0).getDate();
}

// Próxima fecha (a las 00:00) en que vence un gasto con ese día del mes.
// Si el mes no tiene ese día (ej. 31 en abril), vence el último día del mes.
export function proximoVencimiento(dia, hoy = new Date()) {
  const inicioHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  for (let i = 0; i < 2; i++) {
    const anio = inicioHoy.getFullYear();
    const mes = inicioHoy.getMonth() + i;
    const fecha = new Date(anio, mes, Math.min(dia, ultimoDiaDelMes(anio, mes)));
    if (fecha >= inicioHoy) return fecha;
  }
  const anio = inicioHoy.getFullYear();
  const mes = inicioHoy.getMonth() + 2;
  return new Date(anio, mes, Math.min(dia, ultimoDiaDelMes(anio, mes)));
}

// Días que faltan para el próximo vencimiento (0 = vence hoy).
export function diasParaVencer(dia, hoy = new Date()) {
  const inicioHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  const ms = proximoVencimiento(dia, hoy) - inicioHoy;
  return Math.round(ms / 86400000);
}

// Texto corto para mostrar en pantalla.
export function textoVencimiento(dias) {
  if (dias === 0) return "vence hoy";
  if (dias === 1) return "vence mañana";
  return `vence en ${dias} días`;
}
