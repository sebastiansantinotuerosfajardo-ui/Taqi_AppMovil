import { app } from "./app";
import { env } from "./env";
import { limpiarCodigos } from "./reset";
import { limpiarSesiones } from "./sesiones";

for (const aviso of env.avisos) console.warn(`[api] AVISO: ${aviso}`);

// Cada hora se borran las sesiones y códigos vencidos (la base de datos no crece sin límite).
async function mantenimiento() {
  try {
    const n = (await limpiarSesiones()) + (await limpiarCodigos());
    if (n > 0) console.log(`[api] mantenimiento: ${n} registros vencidos eliminados`);
  } catch (error) {
    console.error("[api] el mantenimiento falló", error);
  }
}
void mantenimiento();
setInterval(mantenimiento, 60 * 60 * 1000).unref();

app.listen(env.port, () => {
  console.log(`[api] TAQI escuchando en el puerto ${env.port}`);
});
