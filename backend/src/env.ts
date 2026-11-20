import "dotenv/config";

function requerida(nombre: string): string {
  const valor = process.env[nombre];
  if (!valor) {
    throw new Error(`Falta la variable ${nombre}. Copia .env.example como .env y complétala.`);
  }
  return valor;
}

export const env = {
  databaseUrl: requerida("DATABASE_URL"),
  jwtSecret: requerida("JWT_SECRET"),
  port: Number(process.env.PORT ?? 3000),
  corsOrigin: process.env.CORS_ORIGIN ?? "*",
};
