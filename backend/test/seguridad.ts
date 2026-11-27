// Pruebas de seguridad de la API contra la base de datos real: tokens falsos o vencidos, renovación de
// sesión con rotación y detección de reutilización, bloqueo por intentos, recuperación de contraseña,
// cabeceras de seguridad y CORS.
// Uso: con la base de datos lista y el archivo .env configurado, ejecutar:  npm run test:seguridad
// Crea cuentas @taqi-test.invalid y las BORRA al terminar (usar una base de datos de desarrollo).
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

// Configuración propia de la prueba (debe fijarse ANTES de cargar la app)
process.env.CORS_ORIGIN = "https://taqi.example";
process.env.RESET_MODO = "demo";

const { app } = await import("../src/app");
const { prisma } = await import("../src/db");
const { env } = await import("../src/env");
const { huella } = await import("../src/cripto");
const seg = await import("../src/seguridad");
const sesiones = await import("../src/sesiones");
const reset = await import("../src/reset");

const servidor = app.listen(0);
const base = `http://127.0.0.1:${(servidor.address() as { port: number }).port}`;

type Opciones = { metodo?: string; cuerpo?: unknown; token?: string; cabeceras?: Record<string, string>; crudo?: string };
async function llamar(ruta: string, { metodo = "GET", cuerpo, token, cabeceras = {}, crudo }: Opciones = {}) {
  const r = await fetch(base + ruta, {
    method: metodo,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...cabeceras,
    },
    body: crudo ?? (cuerpo !== undefined ? JSON.stringify(cuerpo) : undefined),
  });
  let json: any = {};
  try {
    json = await r.json();
  } catch {
    // sin cuerpo JSON (por ejemplo, la respuesta 204 de CORS)
  }
  return { estado: r.status, json, cab: r.headers };
}
const post = (ruta: string, cuerpo: unknown, token?: string) => llamar(ruta, { metodo: "POST", cuerpo, token });

// ----------------------------------------------------------------- preparación
const eventos: string[] = [];
seg.usarSalidaDeEventos((linea) => eventos.push(linea));
const secretos: string[] = []; // contraseñas y tokens: NUNCA deben aparecer en el registro de eventos
const codigos: string[] = []; // códigos de 6 dígitos: tampoco (se buscan como palabra suelta)

const sufijo = Date.now().toString(36);
const correo = (nombre: string) => `${nombre}_${sufijo}@taqi-test.invalid`;
const CLAVE = "secreto1";
secretos.push(CLAVE);

async function registrar(nombre: string) {
  const r = await post("/auth/register", { email: correo(nombre), username: `${nombre}_${sufijo}`, password: CLAVE });
  assert.equal(r.estado, 201, JSON.stringify(r.json));
  secretos.push(r.json.token, r.json.refreshToken);
  return r.json as { token: string; refreshToken: string; expiresIn: number; user: { id: string; email: string } };
}
async function entrar(nombre: string, password = CLAVE) {
  const r = await post("/auth/login", { identifier: correo(nombre), password });
  if (r.estado === 200) secretos.push(r.json.token, r.json.refreshToken);
  return r;
}
const refrescar = (refreshToken: string) => post("/auth/refresh", { refreshToken });
const limpiar = () => prisma.usuario.deleteMany({ where: { email: { endsWith: "@taqi-test.invalid" } } });

let n = 0;
const ok = async (nombre: string, fn: () => Promise<void>) => {
  await fn();
  n++;
  console.log(`  ✔ ${nombre}`);
};

try {
  await limpiar();

  console.log("Cabeceras y CORS");
  await ok("helmet: sin x-powered-by, con nosniff/HSTS y con encabezados de límite de intentos", async () => {
    const r = await llamar("/salud");
    assert.equal(r.estado, 200);
    assert.equal(r.cab.get("x-powered-by"), null);
    assert.equal(r.cab.get("x-content-type-options"), "nosniff");
    assert.ok(r.cab.get("strict-transport-security"));
    assert.ok(r.cab.get("ratelimit-policy"), "debe informar la política de límite (RateLimit-Policy)");
  });
  await ok("las respuestas de /auth y /datos no se guardan en cachés (no-store)", async () => {
    assert.equal((await post("/auth/login", { identifier: "x", password: "y" })).cab.get("cache-control"), "no-store");
    assert.equal((await llamar("/datos")).cab.get("cache-control"), "no-store");
  });
  await ok("CORS: solo el origen de la lista; la app (sin Origin) sigue funcionando", async () => {
    const permitido = await llamar("/salud", { cabeceras: { Origin: "https://taqi.example" } });
    assert.equal(permitido.cab.get("access-control-allow-origin"), "https://taqi.example");
    const malo = await llamar("/salud", { cabeceras: { Origin: "https://malo.example" } });
    assert.equal(malo.estado, 200); // el servidor responde, pero el navegador no dejará leerlo
    assert.equal(malo.cab.get("access-control-allow-origin"), null);
    const previo = await llamar("/auth/login", {
      metodo: "OPTIONS",
      cabeceras: {
        Origin: "https://taqi.example",
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "authorization,content-type",
      },
    });
    assert.equal(previo.estado, 204);
    assert.match(previo.cab.get("access-control-allow-headers") ?? "", /authorization/i);
    const previoMalo = await llamar("/auth/login", {
      metodo: "OPTIONS",
      cabeceras: { Origin: "https://malo.example", "Access-Control-Request-Method": "POST" },
    });
    assert.equal(previoMalo.cab.get("access-control-allow-origin"), null);
  });
  await ok("errores: JSON mal formado (400), ruta inexistente (404), cuerpo enorme (413), sin datos internos", async () => {
    let r = await llamar("/auth/login", { metodo: "POST", crudo: "{esto no es json" });
    assert.equal(r.estado, 400);
    assert.equal(r.json.error, "Petición no válida");
    r = await llamar("/ruta/que/no/existe");
    assert.equal(r.estado, 404);
    assert.equal(r.json.ok, false);
    r = await llamar("/auth/reset-password", { metodo: "POST", cuerpo: { email: "a@b.com", newPassword: "nueva123" } });
    assert.equal(r.estado, 404, "la ruta insegura anterior ya no debe existir");
    r = await llamar("/auth/login", { metodo: "POST", crudo: JSON.stringify({ identifier: "x", password: "y".repeat(1_100_000) }) });
    assert.equal(r.estado, 413);
    assert.ok(!JSON.stringify(r.json).includes("node_modules"));
  });

  console.log("Registro y acceso");
  const A = await registrar("ana");
  await ok("el registro devuelve token de acceso (15 min) y refresh token; la base solo guarda la huella", async () => {
    assert.equal(A.expiresIn, 900);
    assert.ok(A.refreshToken.length === 43);
    assert.ok(!("passwordHash" in A.user));
    const dec = jwt.decode(A.token, { complete: true }) as any;
    assert.equal(dec.header.alg, "HS256");
    assert.equal(dec.payload.exp - dec.payload.iat, 900);
    assert.equal(dec.payload.sub, A.user.id);
    assert.equal(await prisma.sesion.count({ where: { tokenHash: A.refreshToken } }), 0, "el token NO debe guardarse tal cual");
    const fila = await prisma.sesion.findUnique({ where: { tokenHash: huella(A.refreshToken) } });
    assert.ok(fila && fila.usadaEn === null && fila.revocadaEn === null);
    assert.ok(fila!.expiraEn.getTime() - Date.now() > 29 * 86400000, "el refresh token dura 30 días");
    const u = await prisma.usuario.findUnique({ where: { id: A.user.id } });
    assert.match(u!.passwordHash, /^\$2[aby]\$12\$/);
  });
  await ok("registros simultáneos con el mismo correo: uno se crea y el otro recibe 409 (no 500)", async () => {
    const datos = { email: correo("carrera"), username: `carrera_${sufijo}`, password: CLAVE };
    const rs = await Promise.all([post("/auth/register", datos), post("/auth/register", datos)]);
    assert.deepEqual(rs.map((r) => r.estado).sort(), [201, 409]);
  });
  await ok("contraseña de más de 72 bytes: se rechaza al registrar", async () => {
    const r = await post("/auth/register", { email: correo("larga"), username: `larga_${sufijo}`, password: "ñ".repeat(37) });
    assert.equal(r.estado, 400);
  });
  await ok("acceso: mismo mensaje y mismo tiempo si la cuenta no existe o la contraseña está mal", async () => {
    const t0 = Date.now();
    const mala = await entrar("ana", "equivocada");
    const t1 = Date.now();
    const inexistente = await post("/auth/login", { identifier: correo("nadie"), password: "equivocada" });
    const t2 = Date.now();
    assert.equal(mala.estado, 401);
    assert.equal(inexistente.estado, 401);
    assert.deepEqual(mala.json, inexistente.json, "las respuestas no deben diferir");
    assert.ok(t2 - t1 >= 100, `con usuario inexistente igual se ejecuta bcrypt (${t2 - t1} ms)`);
    assert.ok(t1 - t0 >= 100);
  });
  await ok("acceso con correo y con nombre de usuario; las cuentas con bcrypt antiguo se actualizan al entrar", async () => {
    assert.equal((await entrar("ana")).estado, 200);
    assert.equal((await post("/auth/login", { identifier: `ANA_${sufijo}`, password: CLAVE })).estado, 200);
    // cuenta creada con costo 4 (como las de versiones anteriores)
    const viejo = await prisma.usuario.create({
      data: { email: correo("viejo"), username: `viejo_${sufijo}`, usernameKey: `viejo_${sufijo}`, passwordHash: await bcrypt.hash(CLAVE, 4) },
    });
    assert.equal(bcrypt.getRounds(viejo.passwordHash), 4);
    assert.equal((await entrar("viejo")).estado, 200);
    const despues = await prisma.usuario.findUnique({ where: { id: viejo.id } });
    assert.equal(bcrypt.getRounds(despues!.passwordHash), 12);
    assert.equal((await entrar("viejo")).estado, 200, "la contraseña sigue funcionando tras el rehash");
  });

  console.log("Token de acceso");
  await ok("el token válido abre /auth/me; sin token, falso, vencido, 'alg none' o de otra clave: 401", async () => {
    assert.equal((await llamar("/auth/me", { token: A.token })).estado, 200);
    assert.equal((await llamar("/auth/me", { cabeceras: { Authorization: `bearer ${A.token}` } })).estado, 200);
    assert.equal((await llamar("/auth/me")).estado, 401);
    assert.equal((await llamar("/datos", { token: "token-falso" })).json.codigo, "token_invalido");
    const sub = { subject: A.user.id, issuer: "taqi-api", audience: "taqi-app" } as const;
    const vencido = jwt.sign({}, env.jwtSecret, { ...sub, expiresIn: -10 });
    const r = await llamar("/auth/me", { token: vencido });
    assert.equal(r.estado, 401);
    assert.equal(r.json.codigo, "token_vencido");
    const cuerpo = Buffer.from(JSON.stringify({ sub: A.user.id, iss: "taqi-api", aud: "taqi-app", exp: Math.floor(Date.now() / 1000) + 600 })).toString("base64url");
    const none = `${Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url")}.${cuerpo}.`;
    assert.equal((await llamar("/auth/me", { token: none })).estado, 401);
    assert.equal((await llamar("/auth/me", { token: jwt.sign({}, "otra-clave-de-mas-de-treinta-y-dos-caracteres", { ...sub, expiresIn: 600 }) })).estado, 401);
    // token de la versión anterior: 30 días, sin emisor ni audiencia -> hay que iniciar sesión otra vez
    assert.equal((await llamar("/auth/me", { token: jwt.sign({ sub: A.user.id }, env.jwtSecret, { expiresIn: "30d" }) })).estado, 401);
  });

  console.log("Renovación de sesión (refresh token con rotación)");
  await ok("cada renovación entrega tokens nuevos y deja el anterior como usado", async () => {
    const B = await registrar("rota");
    const r = await refrescar(B.refreshToken);
    assert.equal(r.estado, 200, JSON.stringify(r.json));
    secretos.push(r.json.token, r.json.refreshToken);
    assert.notEqual(r.json.refreshToken, B.refreshToken);
    assert.equal(r.json.expiresIn, 900);
    assert.equal((await llamar("/auth/me", { token: r.json.token })).estado, 200);
    const viejo = await prisma.sesion.findUnique({ where: { tokenHash: huella(B.refreshToken) } });
    const nuevo = await prisma.sesion.findUnique({ where: { tokenHash: huella(r.json.refreshToken) } });
    assert.ok(viejo!.usadaEn, "el anterior queda marcado como usado");
    assert.equal(nuevo!.familia, viejo!.familia, "pertenecen a la misma familia");
    assert.equal(nuevo!.usadaEn, null);
    // se puede encadenar varias veces
    const r2 = await refrescar(r.json.refreshToken);
    assert.equal(r2.estado, 200);
    secretos.push(r2.json.refreshToken);
  });
  await ok("REUTILIZACIÓN: presentar un token ya usado cierra TODA la cadena (también el token nuevo)", async () => {
    const C = await registrar("robo");
    const legitimo = await refrescar(C.refreshToken); // la persona renueva
    assert.equal(legitimo.estado, 200);
    secretos.push(legitimo.json.refreshToken);
    const ladron = await refrescar(C.refreshToken); // alguien que copió el token viejo lo intenta
    assert.equal(ladron.estado, 401);
    assert.equal(ladron.json.codigo, "sesion_invalida");
    const tras = await refrescar(legitimo.json.refreshToken); // y por precaución la persona también pierde la sesión
    assert.equal(tras.estado, 401);
    const familia = (await prisma.sesion.findUnique({ where: { tokenHash: huella(C.refreshToken) } }))!.familia;
    assert.equal(await prisma.sesion.count({ where: { familia, revocadaEn: null } }), 0);
    assert.ok(eventos.some((e) => e.includes('"refresh_reutilizado"')), "el evento debe quedar registrado");
  });
  await ok("dos renovaciones SIMULTÁNEAS con el mismo token: solo una pasa y la cadena queda cerrada", async () => {
    const D = await registrar("carreraT");
    const [x, y] = await Promise.all([refrescar(D.refreshToken), refrescar(D.refreshToken)]);
    assert.deepEqual([x.estado, y.estado].sort(), [200, 401]);
    const ganador = x.estado === 200 ? x : y;
    secretos.push(ganador.json.refreshToken);
    assert.equal((await refrescar(ganador.json.refreshToken)).estado, 401, "al detectar la reutilización se cierra también el token nuevo");
  });
  await ok("tokens desconocidos, mal formados o vencidos no sirven", async () => {
    assert.equal((await refrescar("a".repeat(43))).estado, 401);
    assert.equal((await refrescar("corto")).estado, 400);
    assert.equal((await post("/auth/refresh", {})).estado, 400);
    const E = await registrar("vence");
    await prisma.sesion.updateMany({ where: { tokenHash: huella(E.refreshToken) }, data: { expiraEn: new Date(Date.now() - 1000) } });
    assert.equal((await refrescar(E.refreshToken)).estado, 401);
  });
  await ok("cerrar sesión revoca el refresh token; es idempotente y no revela si el token existía", async () => {
    const F = await registrar("sale");
    assert.equal((await post("/auth/logout", { refreshToken: F.refreshToken })).estado, 200);
    assert.equal((await refrescar(F.refreshToken)).estado, 401);
    assert.equal((await post("/auth/logout", { refreshToken: F.refreshToken })).estado, 200);
    assert.deepEqual((await post("/auth/logout", { refreshToken: "z".repeat(43) })).json, { ok: true });
  });
  await ok("el mantenimiento borra sesiones vencidas y deja las vigentes", async () => {
    const G = await registrar("limpia");
    await prisma.sesion.updateMany({ where: { tokenHash: huella(G.refreshToken) }, data: { expiraEn: new Date(Date.now() - 1000) } });
    const vigente = await registrar("vigente");
    assert.ok((await sesiones.limpiarSesiones()) >= 1);
    assert.equal(await prisma.sesion.count({ where: { tokenHash: huella(G.refreshToken) } }), 0);
    assert.equal(await prisma.sesion.count({ where: { tokenHash: huella(vigente.refreshToken) } }), 1);
  });

  console.log("Límite de intentos");
  await ok("5 contraseñas incorrectas bloquean esa cuenta (aunque la 6.ª sea correcta); otras cuentas siguen", async () => {
    await registrar("fuerza");
    for (let i = 1; i <= 5; i++) assert.equal((await entrar("fuerza", `mala${i}`)).estado, 401, `intento ${i}`);
    const bloqueada = await entrar("fuerza", CLAVE);
    assert.equal(bloqueada.estado, 429);
    assert.equal(bloqueada.json.codigo, "demasiados_intentos");
    assert.ok(bloqueada.cab.get("retry-after"), "debe indicar cuántos segundos esperar");
    assert.equal((await entrar("ana")).estado, 200, "otra cuenta desde la misma IP no se ve afectada");
    assert.ok(eventos.some((e) => e.includes('"limite_superado"') && e.includes("login_cuenta")));
  });
  await ok("los accesos correctos no cuentan para el bloqueo", async () => {
    for (let i = 0; i < 8; i++) assert.equal((await entrar("ana")).estado, 200);
  });

  console.log("Recuperación de contraseña");
  const codigoDe = (r: { json: any }) => {
    assert.match(r.json.codigoDemo, /^\d{6}$/);
    codigos.push(r.json.codigoDemo);
    return r.json.codigoDemo as string;
  };
  const otroCodigo = (c: string) => String((Number(c) + 1) % 1_000_000).padStart(6, "0");

  await ok("la respuesta es igual exista o no el correo, y solo se puede pedir un código cada 30 s", async () => {
    const existe = await registrar("resetA");
    const r1 = await post("/auth/reset/solicitar", { email: existe.user.email });
    const r2 = await post("/auth/reset/solicitar", { email: correo("noexiste") });
    assert.equal(r1.estado, 200);
    assert.equal(r2.estado, 200);
    assert.deepEqual(Object.keys(r1.json).sort(), Object.keys(r2.json).sort());
    codigoDe(r1);
    codigoDe(r2);
    assert.equal(await prisma.codigoReset.count({ where: { usuario: { email: correo("noexiste") } } }), 0);
    // pedir otro enseguida: 429 tanto si existe como si no
    assert.equal((await post("/auth/reset/solicitar", { email: existe.user.email })).estado, 429);
    assert.equal((await post("/auth/reset/solicitar", { email: correo("noexiste") })).estado, 429);
  });

  await ok("flujo completo: código -> permiso -> nueva contraseña; el código no se guarda y todo es de un solo uso", async () => {
    const B = await registrar("resetB");
    const pedido = await post("/auth/reset/solicitar", { email: B.user.email });
    const codigo = codigoDe(pedido);
    const fila = await prisma.codigoReset.findFirst({ where: { usuarioId: B.user.id } });
    assert.ok(fila && !fila.codigoHash.includes(codigo) && /^[0-9a-f]{64}$/.test(fila.codigoHash), "se guarda el HMAC, no el código");
    assert.ok(fila!.expiraEn.getTime() - Date.now() <= 10 * 60 * 1000 + 1000);

    // código incorrecto: no deja avanzar y cuenta como intento
    const mal = await post("/auth/reset/verificar", { email: B.user.email, codigo: otroCodigo(codigo) });
    assert.equal(mal.estado, 400);
    assert.equal(mal.json.codigo, "codigo_invalido");
    assert.equal((await prisma.codigoReset.findUnique({ where: { id: fila!.id } }))!.intentos, 1);

    // sin permiso no se puede cambiar la contraseña (el hueco anterior)
    assert.equal((await post("/auth/reset/confirmar", { permiso: "p".repeat(43), newPassword: "nueva123" })).estado, 400);
    assert.equal((await entrar("resetB", "nueva123")).estado, 401);

    const bien = await post("/auth/reset/verificar", { email: B.user.email, codigo });
    assert.equal(bien.estado, 200);
    const permiso = bien.json.permiso as string;
    secretos.push(permiso);
    assert.equal(await prisma.codigoReset.count({ where: { permisoHash: permiso } }), 0, "el permiso tampoco se guarda tal cual");

    // contraseña no válida: se rechaza SIN gastar el permiso
    assert.equal((await post("/auth/reset/confirmar", { permiso, newPassword: "123" })).estado, 400);
    const hecho = await post("/auth/reset/confirmar", { permiso, newPassword: "nueva123" });
    assert.equal(hecho.estado, 200, JSON.stringify(hecho.json));
    secretos.push("nueva123");

    // el permiso no se puede volver a usar
    assert.equal((await post("/auth/reset/confirmar", { permiso, newPassword: "otra12345" })).estado, 400);
    // la contraseña vieja ya no sirve, la nueva sí; las sesiones que había quedaron cerradas
    assert.equal((await entrar("resetB", CLAVE)).estado, 401);
    assert.equal((await entrar("resetB", "nueva123")).estado, 200);
    assert.equal((await refrescar(B.refreshToken)).estado, 401, "las sesiones anteriores se cierran al cambiar la contraseña");
  });

  await ok("fuerza bruta del código: tras 5 intentos el código muere aunque después se acierte", async () => {
    const C = await registrar("resetC");
    const codigo = codigoDe(await post("/auth/reset/solicitar", { email: C.user.email }));
    for (let i = 1; i <= 5; i++) {
      const r = await post("/auth/reset/verificar", { email: C.user.email, codigo: otroCodigo(codigo) });
      assert.equal(r.estado, 400, `intento ${i}`);
    }
    const tarde = await post("/auth/reset/verificar", { email: C.user.email, codigo });
    assert.equal(tarde.estado, 400, "con el código correcto, pero ya sin intentos");
    assert.equal((await prisma.codigoReset.findFirst({ where: { usuarioId: C.user.id } }))!.intentos, 5);
    assert.ok(eventos.some((e) => e.includes('"reset_intentos_agotados"')));
  });

  await ok("intentos SIMULTÁNEOS (a nivel de servicio): no se pueden probar más de 5 códigos en paralelo", async () => {
    const H = await registrar("resetH");
    const codigo = codigoDe(await post("/auth/reset/solicitar", { email: H.user.email }));
    // se llama al servicio directo (sin pasar por el límite por IP) para medir solo el contador atómico
    const resultados = await Promise.all(Array.from({ length: 12 }, () => reset.verificarCodigo(H.user.email, otroCodigo(codigo))));
    assert.ok(resultados.every((r) => !r.ok));
    const fila = await prisma.codigoReset.findFirst({ where: { usuarioId: H.user.id } });
    assert.equal(fila!.intentos, 5, `se reservaron ${fila!.intentos} intentos de 12 simultáneos`);
    assert.equal((await reset.verificarCodigo(H.user.email, codigo)).ok, false, "con el código correcto, pero sin intentos");
  });

  await ok("un código vencido, o un permiso vencido, no sirven", async () => {
    const D = await registrar("resetD");
    const codigo = codigoDe(await post("/auth/reset/solicitar", { email: D.user.email }));
    await prisma.codigoReset.updateMany({ where: { usuarioId: D.user.id }, data: { expiraEn: new Date(Date.now() - 1000) } });
    assert.equal((await post("/auth/reset/verificar", { email: D.user.email, codigo })).estado, 400);

    const E = await registrar("resetE");
    const codigoE = codigoDe(await post("/auth/reset/solicitar", { email: E.user.email }));
    const v = await post("/auth/reset/verificar", { email: E.user.email, codigo: codigoE });
    assert.equal(v.estado, 200);
    await prisma.codigoReset.updateMany({ where: { usuarioId: E.user.id }, data: { permisoExpiraEn: new Date(Date.now() - 1000) } });
    assert.equal((await post("/auth/reset/confirmar", { permiso: v.json.permiso, newPassword: "nueva123" })).estado, 400);
    assert.equal((await entrar("resetE", CLAVE)).estado, 200, "la contraseña no cambió");
  });

  await ok("un código nuevo anula el anterior", async () => {
    const F = await registrar("resetF");
    const uno = await reset.solicitarCodigo(F.user.email); // se llama directo: la ruta HTTP exige 30 s entre pedidos
    const dos = await reset.solicitarCodigo(F.user.email);
    assert.notEqual(uno.codigoDemo, dos.codigoDemo);
    assert.equal(await prisma.codigoReset.count({ where: { usuarioId: F.user.id } }), 1);
    codigos.push(uno.codigoDemo!, dos.codigoDemo!);
    assert.equal((await reset.verificarCodigo(F.user.email, uno.codigoDemo!)).ok, false);
    assert.equal((await reset.verificarCodigo(F.user.email, dos.codigoDemo!)).ok, true);
  });

  await ok("el mantenimiento borra códigos viejos", async () => {
    const G = await registrar("resetG");
    await reset.solicitarCodigo(G.user.email);
    await prisma.codigoReset.updateMany({ where: { usuarioId: G.user.id }, data: { expiraEn: new Date(Date.now() - 3 * 86400000) } });
    assert.ok((await reset.limpiarCodigos()) >= 1);
    assert.equal(await prisma.codigoReset.count({ where: { usuarioId: G.user.id } }), 0);
  });

  await ok("el límite por IP también frena las verificaciones masivas (429)", async () => {
    // hasta aquí se hicieron ~15 de las 20 verificaciones/confirmaciones permitidas en 15 minutos
    let bloqueado = false;
    for (let i = 0; i < 12 && !bloqueado; i++) {
      bloqueado = (await post("/auth/reset/verificar", { email: correo("nadie"), codigo: "000000" })).estado === 429;
    }
    assert.ok(bloqueado, "debió activarse el límite por IP");
  });

  console.log("Registro de eventos");
  await ok("los eventos de seguridad no contienen contraseñas, tokens, códigos ni correos completos", async () => {
    assert.ok(eventos.length > 5, "debe haberse registrado actividad");
    const todo = eventos.join("\n");
    for (const s of secretos) assert.ok(!todo.includes(s), `el registro contiene un dato secreto: ${s.slice(0, 6)}…`);
    for (const c of codigos) assert.ok(!new RegExp(`\\b${c}\\b`).test(todo), "el registro contiene un código de recuperación");
    assert.ok(!todo.includes(`_${sufijo}@taqi-test.invalid`), "los correos deben salir enmascarados");
    for (const linea of eventos) assert.ok(JSON.parse(linea).evento, "cada línea es JSON con 'evento'");
  });

  console.log("Limpieza");
  await ok("al borrar las cuentas de prueba se borran sus sesiones y códigos (cascada)", async () => {
    await limpiar();
    assert.equal(await prisma.usuario.count({ where: { email: { endsWith: "@taqi-test.invalid" } } }), 0);
    assert.equal(await prisma.sesion.count({ where: { usuario: { email: { endsWith: "@taqi-test.invalid" } } } }), 0);
  });

  console.log(`\n✔ Todas las pruebas de seguridad pasaron (${n})`);
} catch (error) {
  console.error("\n✘ Falló una prueba de seguridad:", error);
  await limpiar().catch(() => undefined);
  process.exitCode = 1;
} finally {
  servidor.close();
  await prisma.$disconnect();
}
