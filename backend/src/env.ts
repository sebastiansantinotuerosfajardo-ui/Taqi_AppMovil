import "dotenv/config";

// Variables de entorno de la API. "leerEntorno" es una función pura (recibe un objeto y devuelve la
// configuración ya validada) para poder probarla sin tocar el archivo .env: npm run test:logica

export type ModoReset = "demo" | "consola";

export type Entorno = {
  nodeEnv: string;
  produccion: boolean;
  databaseUrl: string;
  jwtSecret: string;
  port: number;
  corsOrigins: string[]; // orígenes de navegador permitidos; "*" solo fuera de producción
  trustProxy: number; // cuántos proxys hay delante de la API (0 = ninguno)
  resetModo: ModoReset;
  avisos: string[]; // advertencias que se muestran al arrancar
};

export const JWT_SECRET_MINIMO = 32;
const COMANDO_SECRETO = `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`;

export function leerEntorno(fuente: Record<string, string | undefined>): Entorno {
  const avisos: string[] = [];

  const requerida = (nombre: string): string => {
    const valor = fuente[nombre];
    if (!valor) {
      throw new Error(`Falta la variable ${nombre}. Copia .env.example como .env y complétala.`);
    }
    return valor;
  };

  const nodeEnv = fuente.NODE_ENV || "development";
  const produccion = nodeEnv === "production";

  // La clave que firma las sesiones: si es corta o es la del ejemplo, cualquiera podría falsificar tokens.
  const jwtSecret = requerida("JWT_SECRET");
  if (jwtSecret.length < JWT_SECRET_MINIMO || /cambia-esto/i.test(jwtSecret)) {
    throw new Error(
      `JWT_SECRET es demasiado débil (debe tener al menos ${JWT_SECRET_MINIMO} caracteres y no puede ser la del ejemplo). ` +
        `Genera una con:  ${COMANDO_SECRETO}`
    );
  }

  // CORS solo afecta a navegadores (la app del celular no lo usa). En desarrollo se permite todo
  // para probar la versión web; en producción se exige una lista de orígenes.
  let corsOrigins = (fuente.CORS_ORIGIN ?? (produccion ? "" : "*"))
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
  if (produccion && corsOrigins.includes("*")) {
    avisos.push('CORS_ORIGIN="*" se ignora en producción: escribe los orígenes permitidos separados por coma.');
    corsOrigins = corsOrigins.filter((o) => o !== "*");
  }

  const trustProxy = Number(fuente.TRUST_PROXY ?? 0);
  if (!Number.isInteger(trustProxy) || trustProxy < 0 || trustProxy > 5) {
    throw new Error("TRUST_PROXY debe ser un número entero entre 0 y 5 (cuántos proxys hay delante de la API).");
  }

  const resetModo = (fuente.RESET_MODO || "consola") as ModoReset;
  if (resetModo !== "demo" && resetModo !== "consola") {
    throw new Error('RESET_MODO debe ser "demo" o "consola".');
  }
  if (resetModo === "demo") {
    avisos.push(
      'RESET_MODO="demo": el código de recuperación de contraseña se devuelve en la respuesta de la API. ' +
        "Úsalo solo en la demostración (con un servicio de correo real el código no sale del servidor)."
    );
  }

  return {
    nodeEnv,
    produccion,
    databaseUrl: requerida("DATABASE_URL"),
    jwtSecret,
    port: Number(fuente.PORT ?? 3000),
    corsOrigins,
    trustProxy,
    resetModo,
    avisos,
  };
}

export const env = leerEntorno(process.env);
