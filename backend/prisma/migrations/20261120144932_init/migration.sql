-- CreateTable
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "usernameKey" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ajustes" (
    "usuarioId" TEXT NOT NULL,
    "ingresoMensual" DECIMAL(12,2) NOT NULL DEFAULT 3428.5,
    "gastoVariableEstimado" DECIMAL(12,2) NOT NULL DEFAULT 1200,
    "perfilVivienda" TEXT NOT NULL DEFAULT 'fija',
    "recordatorios" BOOLEAN NOT NULL DEFAULT false,
    "activas" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "ajustes_pkey" PRIMARY KEY ("usuarioId")
);

-- CreateTable
CREATE TABLE "metas" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "objetivo" DECIMAL(12,2) NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "creadaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "metas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "aportes" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "metaId" TEXT NOT NULL,
    "monto" DECIMAL(12,2) NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "foto" TEXT,

    CONSTRAINT "aportes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gastos_fijos" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "monto" DECIMAL(12,2) NOT NULL,
    "icono" TEXT NOT NULL DEFAULT 'receipt-outline',
    "categoria" TEXT NOT NULL DEFAULT 'Fijo',
    "diaVencimiento" INTEGER NOT NULL DEFAULT 1,
    "orden" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "gastos_fijos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_usernameKey_key" ON "usuarios"("usernameKey");

-- CreateIndex
CREATE UNIQUE INDEX "metas_usuarioId_clienteId_key" ON "metas"("usuarioId", "clienteId");

-- CreateIndex
CREATE UNIQUE INDEX "aportes_metaId_clienteId_key" ON "aportes"("metaId", "clienteId");

-- CreateIndex
CREATE UNIQUE INDEX "gastos_fijos_usuarioId_clienteId_key" ON "gastos_fijos"("usuarioId", "clienteId");

-- AddForeignKey
ALTER TABLE "ajustes" ADD CONSTRAINT "ajustes_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "metas" ADD CONSTRAINT "metas_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aportes" ADD CONSTRAINT "aportes_metaId_fkey" FOREIGN KEY ("metaId") REFERENCES "metas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gastos_fijos" ADD CONSTRAINT "gastos_fijos_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
