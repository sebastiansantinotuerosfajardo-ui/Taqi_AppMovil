// Pruebas de la lógica de seguridad SIN base de datos ni red: se ejecutan en menos de 10 segundos.
// Uso: npm run test:logica
// Fijan sus propias variables de entorno, así que no necesitan el archivo .env.
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";

process.env.DATABASE_URL = "postgresql://nadie:nada@127.0.0.1:1/ninguna"; // no se usa: estas pruebas no consultan la base
process.env.JWT_SECRET = "clave-de-pruebas-0123456789-0123456789-0123456789";
process.env.CORS_ORIGIN = "https://taqi.example";

const { leerEntorno, JWT_SECRET_MINIMO } = await import("../src/env");
const cripto = await import("../src/cripto");
const auth = await import("../src/auth");
const seg = await import("../src/seguridad");
const esquemas = await import("../src/esquemas");
const reset = await import("../src/reset");

let n = 0;
const ok = (nombre: string, fn: () => void | Promise<void>) =>
  Promise.resolve(fn()).then(() => {
    n++;
    console.log(`  ✔ ${nombre}`);
  });

const base = {
  DATABASE_URL: "postgresql://u:p@h:5432/db",
  JWT_SECRET: "x".repeat(40),
};
const lanza = (fuente: Record<string, string | undefined>, trozo: RegExp | string) =>
  assert.throws(() => leerEntorno(fuente), (e: Error) => (trozo instanceof RegExp ? trozo.test(e.message) : e.message.includes(trozo)));

try {
  console.log("Variables de entorno");
  await ok("falta DATABASE_URL o JWT_SECRET: no arranca", () => {
    lanza({ JWT_SECRET: base.JWT_SECRET }, "DATABASE_URL");
    lanza({ DATABASE_URL: base.DATABASE_URL }, "JWT_SECRET");
  });
  await ok("JWT_SECRET corta o la del ejemplo: no arranca", () => {
    lanza({ ...base, JWT_SECRET: "corta" }, /demasiado débil/);
    lanza({ ...base, JWT_SECRET: "x".repeat(JWT_SECRET_MINIMO - 1) }, /demasiado débil/);
    lanza({ ...base, JWT_SECRET: "cambia-esto-por-una-clave-larga-y-aleatoria" }, /demasiado débil/);
    assert.equal(leerEntorno({ ...base, JWT_SECRET: "x".repeat(JWT_SECRET_MINIMO) }).jwtSecret.length, JWT_SECRET_MINIMO);
  });
  await ok("CORS: en desarrollo permite todo; en producción exige lista y descarta '*'", () => {
    assert.deepEqual(leerEntorno(base).corsOrigins, ["*"]);
    const prod = leerEntorno({ ...base, NODE_ENV: "production" });
    assert.deepEqual(prod.corsOrigins, []);
    const prodComodin = leerEntorno({ ...base, NODE_ENV: "production", CORS_ORIGIN: "*" });
    assert.deepEqual(prodComodin.corsOrigins, []);
    assert.ok(prodComodin.avisos.some((a) => a.includes("CORS_ORIGIN")));
    const lista = leerEntorno({ ...base, NODE_ENV: "production", CORS_ORIGIN: " https://a.com , https://b.com " });
    assert.deepEqual(lista.corsOrigins, ["https://a.com", "https://b.com"]);
  });
  await ok("TRUST_PROXY y RESET_MODO se validan", () => {
    assert.equal(leerEntorno(base).trustProxy, 0);
    assert.equal(leerEntorno({ ...base, TRUST_PROXY: "1" }).trustProxy, 1);
    lanza({ ...base, TRUST_PROXY: "uno" }, "TRUST_PROXY");
    lanza({ ...base, TRUST_PROXY: "9" }, "TRUST_PROXY");
    assert.equal(leerEntorno(base).resetModo, "consola"); // el valor seguro es el predeterminado
    assert.equal(leerEntorno({ ...base, RESET_MODO: "demo" }).resetModo, "demo");
    assert.ok(leerEntorno({ ...base, RESET_MODO: "demo" }).avisos.some((a) => a.includes("demo")));
    lanza({ ...base, RESET_MODO: "correo" }, "RESET_MODO");
  });

  console.log("Criptografía");
  await ok("códigos de 6 dígitos: formato, ceros a la izquierda y variedad", () => {
    const codigos = Array.from({ length: 5000 }, () => cripto.generarCodigo());
    assert.ok(codigos.every((c) => /^\d{6}$/.test(c)));
    assert.ok(codigos.some((c) => c.startsWith("0")), "deben existir códigos con ceros a la izquierda");
    assert.ok(new Set(codigos).size > 4900, "no deben repetirse casi nunca");
  });
  await ok("tokens opacos: 256 bits, únicos y la huella es SHA-256 estable", () => {
    const t = Array.from({ length: 1000 }, () => cripto.nuevoTokenOpaco());
    assert.ok(t.every((x) => x.length === 43 && /^[\w-]+$/.test(x)));
    assert.equal(new Set(t).size, 1000);
    assert.equal(cripto.huella("a"), cripto.huella("a"));
    assert.notEqual(cripto.huella("a"), cripto.huella("b"));
    assert.match(cripto.huella("a"), /^[0-9a-f]{64}$/);
    assert.equal(cripto.huella("abc"), "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"); // vector de prueba oficial
  });
  await ok("HMAC del código depende del código y del usuario; comparación en tiempo constante", () => {
    const h = cripto.hmacCodigo("123456", "u1");
    assert.match(h, /^[0-9a-f]{64}$/);
    assert.equal(h, cripto.hmacCodigo("123456", "u1"));
    assert.notEqual(h, cripto.hmacCodigo("123457", "u1"));
    assert.notEqual(h, cripto.hmacCodigo("123456", "u2"));
    assert.ok(cripto.iguales(h, cripto.hmacCodigo("123456", "u1")));
    assert.ok(!cripto.iguales(h, cripto.hmacCodigo("000000", "u1")));
    assert.ok(!cripto.iguales("abc", "abcd")); // distinta longitud: no lanza error
  });

  console.log("Contraseñas");
  await ok("bcrypt: costo actual, rehash de hashes viejos y hash falso para usuarios inexistentes", async () => {
    const hash = await auth.hashear("secreto1");
    assert.match(hash, /^\$2[aby]\$12\$/);
    assert.ok(await auth.coincide("secreto1", hash));
    assert.ok(!(await auth.coincide("otra", hash)));
    assert.equal(auth.necesitaRehash(hash), false);
    const viejo = await (await import("bcryptjs")).default.hash("secreto1", 4);
    assert.equal(auth.necesitaRehash(viejo), true);
    assert.equal(auth.necesitaRehash("no-es-un-hash"), true);
    // usuario inexistente: false, pero tarda como un usuario real (bcrypt se ejecuta igual)
    const t0 = Date.now();
    assert.equal(await auth.coincide("loquesea", undefined), false);
    assert.equal(await auth.coincide("loquesea", null), false);
    assert.ok(Date.now() - t0 >= 100, "debe ejecutar bcrypt aunque no exista el usuario");
  });
  await ok("contraseña nueva: máximo 72 bytes (bcrypt ignora el resto)", () => {
    const reg = (password: string) => esquemas.registroSchema.safeParse({ email: "a@b.com", username: "ana", password }).success;
    assert.ok(reg("a".repeat(72)));
    assert.ok(!reg("a".repeat(73)));
    assert.ok(reg("ñ".repeat(36))); // 72 bytes en UTF-8
    assert.ok(!reg("ñ".repeat(37))); // 74 bytes: cabe en 100 caracteres pero no en 72 bytes
    assert.ok(!reg("12345")); // mínimo 6
    // al ENTRAR no se aplica el máximo de 72 bytes (quien ya tenía una más larga debe poder entrar)
    assert.ok(esquemas.loginSchema.safeParse({ identifier: "ana", password: "ñ".repeat(37) }).success);
  });

  console.log("Token de acceso (JWT)");
  const secreto = process.env.JWT_SECRET!;
  const verifica = (t: string) => {
    try {
      return auth.verificarAccessToken(t);
    } catch (e) {
      return e as Error;
    }
  };
  await ok("el token válido lleva usuario, emisor, audiencia y dura 15 minutos con HS256", () => {
    const t = auth.firmarAccessToken("usuario-1");
    const dec = jwt.decode(t, { complete: true }) as any;
    assert.equal(dec.header.alg, "HS256");
    assert.equal(dec.payload.sub, "usuario-1");
    assert.equal(dec.payload.iss, "taqi-api");
    assert.equal(dec.payload.aud, "taqi-app");
    assert.equal(dec.payload.exp - dec.payload.iat, 900);
    assert.deepEqual(verifica(t), { sub: "usuario-1" });
  });
  await ok("se rechazan: alg none, otra clave, otro algoritmo, audiencia/emisor distintos, vencido, sin usuario", () => {
    const sub = { subject: "u1", issuer: "taqi-api", audience: "taqi-app", expiresIn: 600 } as const;
    // alg "none": el atacante firma "sin firma"
    const cuerpo = Buffer.from(JSON.stringify({ sub: "u1", iss: "taqi-api", aud: "taqi-app", exp: Math.floor(Date.now() / 1000) + 600 })).toString("base64url");
    const none = `${Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url")}.${cuerpo}.`;
    assert.ok(verifica(none) instanceof Error);
    assert.ok(verifica(jwt.sign({}, "otra-clave-distinta-de-treinta-y-dos-caracteres", { ...sub })) instanceof Error);
    assert.ok(verifica(jwt.sign({}, secreto, { ...sub, algorithm: "HS512" })) instanceof Error); // algoritmo distinto
    assert.ok(verifica(jwt.sign({}, secreto, { ...sub, audience: "otra-app" })) instanceof Error);
    assert.ok(verifica(jwt.sign({}, secreto, { ...sub, issuer: "otro" })) instanceof Error);
    assert.ok(verifica(jwt.sign({}, secreto, { ...sub, expiresIn: -10 })) instanceof jwt.TokenExpiredError);
    assert.ok(verifica(jwt.sign({}, secreto, { issuer: "taqi-api", audience: "taqi-app", expiresIn: 600 })) instanceof Error); // sin "sub"
    assert.ok(verifica("basura") instanceof Error);
    assert.ok(verifica("") instanceof Error);
    // un token de la versión anterior (30 días, sin emisor ni audiencia) ya no sirve
    assert.ok(verifica(jwt.sign({ sub: "u1" }, secreto, { expiresIn: "30d" })) instanceof Error);
  });

  console.log("Registro de eventos y CORS");
  await ok("enmascarar() oculta correos y usuarios", () => {
    assert.equal(seg.enmascarar("ana@correo.com"), "a***@correo.com");
    assert.equal(seg.enmascarar("  Ana_Perez "), "A***");
    assert.equal(seg.enmascarar("a"), "*");
  });
  await ok("registrarEvento() escribe una línea JSON con fecha y sin datos que no se pasen", () => {
    const lineas: string[] = [];
    seg.usarSalidaDeEventos((l) => lineas.push(l));
    seg.registrarEvento("login_fallido", { cuenta: "a***@correo.com", ip: "1.2.3.4" });
    seg.usarSalidaDeEventos((l) => console.warn(l));
    const e = JSON.parse(lineas[0]);
    assert.equal(e.evento, "login_fallido");
    assert.equal(e.cuenta, "a***@correo.com");
    assert.ok(!Number.isNaN(Date.parse(e.t)));
  });
  await ok("CORS: la app (sin Origin) pasa; los navegadores solo si están en la lista", async () => {
    const decide = (permitidos: string[], origen: string | undefined) =>
      new Promise<boolean | undefined>((resolver, rechazar) => {
        const opc = seg.opcionesCors(permitidos);
        (opc.origin as (o: string | undefined, cb: (e: Error | null, permitido?: boolean) => void) => void)(origen, (e, p) =>
          e ? rechazar(e) : resolver(p)
        );
      });
    assert.equal(await decide(["https://taqi.example"], undefined), true);
    assert.equal(await decide(["https://taqi.example"], "https://taqi.example"), true);
    assert.equal(await decide(["https://taqi.example"], "https://malo.example"), false);
    assert.equal(await decide([], "https://taqi.example"), false);
    assert.equal(await decide(["*"], "https://cualquiera.example"), true);
  });

  console.log("Recuperación de contraseña: entrega del código");
  await ok("modo consola no devuelve el código; modo demo sí (también si el correo no existe)", async () => {
    const avisos: string[] = [];
    const original = console.warn;
    console.warn = (...a: unknown[]) => void avisos.push(a.join(" "));
    try {
      const consola = reset.elegirEntrega("consola");
      const demo = reset.elegirEntrega("demo");
      assert.deepEqual(await consola.entregar({ email: "ana@correo.com", codigo: "123456", existe: true }), {});
      assert.deepEqual(await consola.entregar({ email: "nadie@correo.com", codigo: "654321", existe: false }), {});
      assert.deepEqual(await demo.entregar({ email: "ana@correo.com", codigo: "111111", existe: true }), { codigoDemo: "111111" });
      assert.deepEqual(await demo.entregar({ email: "nadie@correo.com", codigo: "222222", existe: false }), { codigoDemo: "222222" });
    } finally {
      console.warn = original;
    }
    // solo se escribió el código de la cuenta que existe, y con el correo enmascarado
    assert.ok(avisos.some((a) => a.includes("a***@correo.com") && a.includes("123456")));
    assert.ok(!avisos.some((a) => a.includes("nadie") || a.includes("654321") || a.includes("222222")));
  });

  console.log(`\n✔ Todas las pruebas de lógica pasaron (${n})`);
} catch (error) {
  console.error("\n✘ Falló una prueba de lógica:", error);
  process.exitCode = 1;
}
process.exit(process.exitCode ?? 0);
