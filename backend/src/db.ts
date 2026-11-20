import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma/client";
import { env } from "./env";

// Prisma 7 se conecta a PostgreSQL (Supabase) mediante el adaptador "pg".
const adapter = new PrismaPg({ connectionString: env.databaseUrl });
export const prisma = new PrismaClient({ adapter });
