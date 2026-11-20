// Prueba de humo de la API: registro, acceso, datos y aislamiento entre usuarios.
// Uso: con la base de datos lista y el archivo .env configurado, ejecutar "npm test".
import assert from "node:assert/strict";
import { app } from "../src/app";
import { prisma } from "../src/db";

const servidor = app.listen(0);
const puerto = (servidor.address() as { port: number }).port;
const base = `http://127.0.0.1:${puerto}`;

async function llamar(ruta: string, metodo = "GET", cuerpo?: unknown, token?: string) {
  const r = await fetch(base + ruta, {
    method: metodo,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
  });
  return { estado: r.status, json: (await r.json()) as any };
}

const sufijo = Date.now().toString(36);
const correoA = `ana_${sufijo}@correo.com`;
const correoB = `beto_${sufijo}@correo.com`;

const datosEjemplo = () => ({
  metas: [
    {
      id: "meta-1",
      title: "Viaje a Cusco",
      target: 1500,
      aportes: [
        { id: "ap-2", amount: 42, date: new Date(Date.now() - 86400000).toISOString(), foto: "file:///foto.jpg" },
        { id: "ap-1", amount: 150.5, date: new Date(Date.now() - 86400000 * 5).toISOString() },
      ],
    },
    { id: "meta-2", title: "Laptop nueva", target: 3500, aportes: [] },
  ],
  gastosFijos: [
    { id: "gf-1", title: "Alquiler", amount: 600, icon: "home-outline", category: "Vivienda", diaVencimiento: 1 },
    { id: "gf-2", title: "Luz", amount: 65.9, icon: "flash-outline", category: "Servicios", diaVencimiento: 10 },
  ],
  presupuesto: { ingresoMensual: 3428.5, gastoVariableEstimado: 1200 },
  perfilVivienda: "fija" as const,
  ajustes: { recordatorios: true },
  activas: { redondeo: true },
});

try {
  // salud
  assert.equal((await llamar("/salud")).estado, 200);

  // registro
  let r = await llamar("/auth/register", "POST", { email: correoA, username: `Ana_${sufijo}`, password: "secreto1" });
  assert.equal(r.estado, 201, JSON.stringify(r.json));
  const tokenA = r.json.token as string;
  assert.ok(tokenA && r.json.user.id && !("passwordHash" in r.json.user));

  // duplicados
  r = await llamar("/auth/register", "POST", { email: correoA.toUpperCase(), username: "otro", password: "secreto1" });
  assert.equal(r.estado, 409);
  assert.equal(r.json.error, "Ya existe una cuenta con ese correo");
  r = await llamar("/auth/register", "POST", { email: `x_${correoA}`, username: `ANA_${sufijo}`, password: "secreto1" });
  assert.equal(r.estado, 409);
  assert.equal(r.json.error, "Ese nombre de usuario ya está en uso");

  // validación
  r = await llamar("/auth/register", "POST", { email: "no-es-correo", username: "a", password: "1" });
  assert.equal(r.estado, 400);

  // la contraseña se guarda con hash
  const fila = await prisma.usuario.findUnique({ where: { email: correoA } });
  assert.ok(fila && fila.passwordHash.startsWith("$2") && fila.passwordHash !== "secreto1");

  // acceso por correo y por usuario; contraseña incorrecta
  r = await llamar("/auth/login", "POST", { identifier: correoA, password: "secreto1" });
  assert.equal(r.estado, 200);
  r = await llamar("/auth/login", "POST", { identifier: `ana_${sufijo}`, password: "secreto1" });
  assert.equal(r.estado, 200);
  r = await llamar("/auth/login", "POST", { identifier: correoA, password: "mala" });
  assert.equal(r.estado, 401);
  assert.equal(r.json.error, "Correo o contraseña incorrectos");

  // sesión
  r = await llamar("/auth/me", "GET", undefined, tokenA);
  assert.equal(r.estado, 200);
  assert.equal(r.json.user.email, correoA);
  assert.equal((await llamar("/auth/me")).estado, 401);
  assert.equal((await llamar("/datos", "GET", undefined, "token-falso")).estado, 401);

  // datos: al inicio no hay nada
  r = await llamar("/datos", "GET", undefined, tokenA);
  assert.equal(r.json.datos.inicializado, false);

  // guardar y leer
  const d1 = datosEjemplo();
  r = await llamar("/datos", "PUT", d1, tokenA);
  assert.equal(r.estado, 200, JSON.stringify(r.json));
  r = await llamar("/datos", "GET", undefined, tokenA);
  const g = r.json.datos;
  assert.equal(g.inicializado, true);
  assert.deepEqual(g.metas.map((m: any) => m.id), ["meta-1", "meta-2"]);
  assert.deepEqual(g.metas[0].aportes.map((a: any) => a.id), ["ap-2", "ap-1"]); // más reciente primero
  assert.equal(g.metas[0].aportes[0].foto, "file:///foto.jpg");
  assert.equal(g.metas[0].aportes[1].amount, 150.5);
  assert.equal(g.gastosFijos[1].amount, 65.9);
  assert.equal(g.gastosFijos[1].diaVencimiento, 10);
  assert.equal(g.ajustes.recordatorios, true);
  assert.deepEqual(g.activas, { redondeo: true });
  assert.equal(g.presupuesto.ingresoMensual, 3428.5);

  // actualizar: borrar una meta, agregar un aporte, cambiar un gasto
  const d2 = datosEjemplo();
  d2.metas = [d2.metas[0]];
  d2.metas[0].aportes.unshift({ id: "ap-3", amount: 10, date: new Date().toISOString(), foto: undefined } as any);
  d2.gastosFijos[0].amount = 650;
  d2.perfilVivienda = "variable" as any;
  r = await llamar("/datos", "PUT", d2, tokenA);
  assert.equal(r.estado, 200, JSON.stringify(r.json));
  r = await llamar("/datos", "GET", undefined, tokenA);
  assert.deepEqual(r.json.datos.metas.map((m: any) => m.id), ["meta-1"]);
  assert.deepEqual(r.json.datos.metas[0].aportes.map((a: any) => a.id), ["ap-3", "ap-2", "ap-1"]);
  assert.equal(r.json.datos.gastosFijos[0].amount, 650);
  assert.equal(r.json.datos.perfilVivienda, "variable");

  // datos inválidos
  const malo = datosEjemplo();
  (malo.gastosFijos[0] as any).diaVencimiento = 40;
  assert.equal((await llamar("/datos", "PUT", malo, tokenA)).estado, 400);

  // aislamiento: otro usuario usa los MISMOS ids y no se pisan
  r = await llamar("/auth/register", "POST", { email: correoB, username: `Beto_${sufijo}`, password: "secreto2" });
  const tokenB = r.json.token as string;
  assert.equal((await llamar("/datos", "GET", undefined, tokenB)).json.datos.inicializado, false);
  const dB = datosEjemplo();
  dB.metas = [{ id: "meta-1", title: "Meta de Beto", target: 99, aportes: [] }];
  assert.equal((await llamar("/datos", "PUT", dB, tokenB)).estado, 200);
  const deA = (await llamar("/datos", "GET", undefined, tokenA)).json.datos;
  const deB = (await llamar("/datos", "GET", undefined, tokenB)).json.datos;
  assert.equal(deA.metas[0].title, "Viaje a Cusco");
  assert.equal(deB.metas[0].title, "Meta de Beto");

  // recuperar contraseña
  r = await llamar("/auth/reset-password", "POST", { email: "nadie@correo.com", newPassword: "nueva123" });
  assert.equal(r.estado, 404);
  r = await llamar("/auth/reset-password", "POST", { email: correoA, newPassword: "nueva123" });
  assert.equal(r.estado, 200);
  assert.equal((await llamar("/auth/login", "POST", { identifier: correoA, password: "secreto1" })).estado, 401);
  assert.equal((await llamar("/auth/login", "POST", { identifier: correoA, password: "nueva123" })).estado, 200);

  // limpieza
  await prisma.usuario.deleteMany({ where: { email: { in: [correoA, correoB] } } });
  console.log("✔ Todas las pruebas de la API pasaron");
} catch (error) {
  console.error("✘ Falló una prueba:", error);
  process.exitCode = 1;
} finally {
  servidor.close();
  await prisma.$disconnect();
}
