// Registro de mensajes de la app (logging) con niveles: info, warn y error.
// Todos los mensajes llevan una etiqueta del módulo que los genera, por ejemplo [storage].
// Así, en la consola se ve de dónde viene cada aviso y se puede cambiar el destino
// (por ejemplo, enviarlos a un servicio de monitoreo) tocando solo este archivo.

const MAX_REGISTROS = 50;
const registros = []; // últimos mensajes en memoria, útil para depurar durante la demo

function guardar(nivel, tag, mensaje, error) {
  registros.push({
    nivel,
    tag,
    mensaje,
    detalle: error?.message ?? null,
    hora: new Date().toISOString(),
  });
  if (registros.length > MAX_REGISTROS) registros.shift();
}

function formato(nivel, tag, mensaje) {
  return `[${nivel}] [${tag}] ${mensaje}`;
}

export const logger = {
  // Información normal; solo se imprime en desarrollo para no llenar la consola de producción.
  info(tag, mensaje) {
    guardar("info", tag, mensaje, null);
    if (__DEV__) console.log(formato("info", tag, mensaje));
  },

  // Algo falló pero la app puede continuar (por ejemplo, no se pudo leer un dato guardado).
  warn(tag, mensaje, error) {
    guardar("warn", tag, mensaje, error);
    console.warn(formato("warn", tag, mensaje), error?.message ?? "");
  },

  // Error grave (por ejemplo, una pantalla que se rompió al dibujarse).
  error(tag, mensaje, error) {
    guardar("error", tag, mensaje, error);
    console.error(formato("error", tag, mensaje), error ?? "");
  },

  // Devuelve una copia de los últimos mensajes registrados.
  obtenerRegistros() {
    return [...registros];
  },
};
