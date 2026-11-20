import { app } from "./app";
import { env } from "./env";

app.listen(env.port, () => {
  console.log(`[api] TAQI escuchando en el puerto ${env.port}`);
});
