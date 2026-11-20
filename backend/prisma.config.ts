import "dotenv/config";
import { defineConfig } from "prisma/config";

// Las migraciones usan DIRECT_URL si existe (despliegue serverless) y, si no, DATABASE_URL.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: {
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? "",
  },
});
