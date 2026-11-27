-- CreateTable
CREATE TABLE "sesiones" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "familia" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "creadaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiraEn" TIMESTAMP(3) NOT NULL,
    "usadaEn" TIMESTAMP(3),
    "revocadaEn" TIMESTAMP(3),

    CONSTRAINT "sesiones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "codigos_reset" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "codigoHash" TEXT NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiraEn" TIMESTAMP(3) NOT NULL,
    "intentos" INTEGER NOT NULL DEFAULT 0,
    "permisoHash" TEXT,
    "permisoExpiraEn" TIMESTAMP(3),
    "usadoEn" TIMESTAMP(3),

    CONSTRAINT "codigos_reset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sesiones_tokenHash_key" ON "sesiones"("tokenHash");

-- CreateIndex
CREATE INDEX "sesiones_usuarioId_idx" ON "sesiones"("usuarioId");

-- CreateIndex
CREATE INDEX "sesiones_familia_idx" ON "sesiones"("familia");

-- CreateIndex
CREATE UNIQUE INDEX "codigos_reset_permisoHash_key" ON "codigos_reset"("permisoHash");

-- CreateIndex
CREATE INDEX "codigos_reset_usuarioId_idx" ON "codigos_reset"("usuarioId");

-- AddForeignKey
ALTER TABLE "sesiones" ADD CONSTRAINT "sesiones_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "codigos_reset" ADD CONSTRAINT "codigos_reset_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------------------------
-- Seguridad en Supabase: Row Level Security (RLS) en TODAS las tablas.
-- Supabase publica las tablas del esquema "public" mediante su API REST, que se consulta con la
-- clave "anon" (una clave pública). Con RLS activado y SIN políticas, esa API no devuelve nada.
-- La API de TAQI no se ve afectada: Prisma se conecta con el usuario dueño de las tablas, y el
-- dueño no queda sujeto a RLS (a menos que se use FORCE ROW LEVEL SECURITY, que aquí NO se usa).
-- Prisma no modela RLS, así que esto no genera diferencias ("drift") en futuras migraciones.
-- ---------------------------------------------------------------------------------------------
ALTER TABLE "usuarios" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ajustes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "metas" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "aportes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "gastos_fijos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "sesiones" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "codigos_reset" ENABLE ROW LEVEL SECURITY;
