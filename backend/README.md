# TAQI – API (Node + Express + Prisma + Supabase)

La app Expo no puede usar Prisma directamente (Prisma necesita Node). Por eso esta carpeta es un
servidor pequeño: la app le habla por HTTP, y el servidor usa Prisma para guardar en Supabase (PostgreSQL).

    App Expo  ──HTTP──►  API Express  ──Prisma──►  Supabase PostgreSQL

## Puesta en marcha

1. Crear el proyecto en https://supabase.com y el usuario `prisma` (ver `GUIA_SUPABASE_PRISMA.md`).
2. `cd backend`
3. `cp .env.example .env` y completar `DATABASE_URL`, `DIRECT_URL` (opcional) y `JWT_SECRET`
   (genera una clave de verdad: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`).
4. `npm install` (también ejecuta `prisma generate`)
5. `npx prisma migrate deploy` (aplica las migraciones que ya están en `prisma/migrations`, incluida la de seguridad)
6. `npm run test:todo` (pruebas de lógica, de la API y de seguridad; **crean y borran** usuarios de prueba, usar una base de desarrollo)
7. `npm run dev` (API en http://localhost:3000)

Si en el paso 5 Prisma responde P3005 ("la base no está vacía"), es porque las tablas se crearon sin registrar la
migración inicial. Se arregla marcándola como aplicada y repitiendo el paso:
`npx prisma migrate resolve --applied 20261120144932_init` y luego `npx prisma migrate deploy`.
No uses `migrate reset`: borra todos los datos.

## Rutas

| Método | Ruta | Descripción |
|---|---|---|
| GET | /salud | Comprueba que el servidor vive |
| POST | /auth/register | Crea cuenta (correo, usuario, contraseña). Devuelve `token` (15 min) y `refreshToken` (30 días) |
| POST | /auth/login | Entra con correo o usuario. Devuelve `token` y `refreshToken` |
| POST | /auth/refresh | Cambia un `refreshToken` por un par nuevo (el anterior deja de servir) |
| POST | /auth/logout | Cierra la sesión del dispositivo en el servidor |
| GET | /auth/me | Usuario de la sesión (requiere `Authorization: Bearer <token>`) |
| POST | /auth/reset/solicitar | `{ email }`: genera un código de 6 dígitos (responde igual exista o no la cuenta) |
| POST | /auth/reset/verificar | `{ email, codigo }`: si es correcto devuelve un `permiso` de un solo uso |
| POST | /auth/reset/confirmar | `{ permiso, newPassword }`: cambia la contraseña y cierra todas las sesiones |
| GET / PUT | /datos | Lee / reemplaza metas, gastos fijos, presupuesto y ajustes del usuario |

## Seguridad (qué se hizo y por qué)

| Capa | Qué hace | Dónde |
|---|---|---|
| Cabeceras HTTP | `helmet`: sin `X-Powered-By`, `nosniff`, HSTS, etc.; las respuestas de `/auth` y `/datos` llevan `Cache-Control: no-store` | `src/seguridad.ts` |
| CORS | Lista de orígenes permitidos (`CORS_ORIGIN`). La app del celular no manda `Origin`, así que no se ve afectada | `src/seguridad.ts` |
| Límite de intentos | Por IP y por cuenta: 5 fallos de acceso cada 15 min por cuenta e IP, 100 por IP, 20 registros por hora, recuperación de contraseña limitada | `src/limites.ts` |
| Contraseñas | bcrypt costo 12; las cuentas con costo menor se actualizan solas al entrar; si la cuenta no existe se hace igual el cálculo (no se nota por el tiempo de respuesta); máximo 72 bytes al crearlas | `src/cripto.ts`, `src/auth.ts` |
| Token de acceso | JWT HS256 de **15 minutos**, con emisor y audiencia fijos, y algoritmo fijado (rechaza `alg: none`) | `src/auth.ts` |
| Sesión larga | Refresh token opaco de 256 bits que se **rota** en cada uso; en la base solo se guarda su huella SHA-256. Si alguien reutiliza uno viejo se cierra toda la cadena de esa sesión | `src/sesiones.ts` |
| Recuperar contraseña | Código de 6 dígitos (`crypto.randomInt`), guardado con HMAC, vence en 10 min, 5 intentos como máximo (se descuentan **antes** de comparar), permiso de un solo uso para confirmar, y al cambiar la contraseña se cierran todas las sesiones | `src/reset.ts` |
| Datos | Row Level Security activado en todas las tablas: si alguien usara la clave pública de Supabase no vería nada. Prisma (rol dueño) no se ve afectado | `prisma/migrations/…_seguridad_servidor` |
| Registro de eventos | Líneas JSON con fecha, evento e IP; los correos salen enmascarados (`a***@correo.com`) y nunca se escriben contraseñas ni tokens | `src/seguridad.ts` |
| Configuración | Si falta `JWT_SECRET`, es corta (< 32) o es la del ejemplo, el servidor **no arranca** | `src/env.ts` |

Patrones y técnicas: *Strategy* (cómo se entrega el código de recuperación: `consola` o `demo`; mañana puede
ser correo), *Middleware / Chain of Responsibility* (helmet → CORS → límites → sesión → ruta) y *rotación de
tokens* con detección de reutilización (la técnica que recomiendan las guías actuales de OAuth para clientes móviles).

## Variables de entorno

| Variable | Obligatoria | Para qué |
|---|---|---|
| `DATABASE_URL` | Sí | Conexión a PostgreSQL (Supabase) |
| `DIRECT_URL` | No | Solo si usas pooler de transacciones (Vercel) |
| `JWT_SECRET` | Sí | Firma los tokens; mínimo 32 caracteres. **Si la cambias, todos deben iniciar sesión otra vez** |
| `PORT` | No | Puerto (3000 por defecto) |
| `RESET_MODO` | No | `consola` (por defecto) o `demo` (devuelve el código en la respuesta, **solo para la exposición**) |
| `CORS_ORIGIN` | No | Navegadores permitidos, separados por coma (en producción `*` se ignora) |
| `TRUST_PROXY` | No | Cuántos proxys hay delante (1 en Render/Railway/Fly). Mal puesto, el límite de intentos bloquea a todos a la vez |
| `NODE_ENV` | No | `production` en el servidor publicado |

## Limitaciones conocidas (dichas con honestidad)
- **Modo demo:** con `RESET_MODO="demo"` cualquiera que conozca un correo registrado puede ver su código y cambiar su contraseña. Es aceptable solo para la exposición. Para producción hay que agregar una estrategia que envíe el código por correo (o usar Supabase Auth).
- El token de acceso sigue siendo válido hasta 15 minutos después de cerrar sesión (los JWT no se pueden "anular"; por eso duran poco).
- Los límites de intentos viven en la memoria del proceso: sirven con **una sola instancia** del servidor. Con varias instancias hay que moverlos a Redis o a la base de datos.
- Si la respuesta de `/auth/refresh` se pierde por la red, el celular reintenta con el token viejo y el servidor lo toma por reutilizado: cierra esa sesión y la persona vuelve a iniciar sesión.
- Las fotos de comprobantes siguen guardadas en el celular (futuro: Supabase Storage).
- Si se edita sin conexión y en dos dispositivos, gana el último que sincroniza.

## Cómo revertir la seguridad por filas (solo si algo se rompe)
Si después de la migración la API no puede leer la base (poco probable: Prisma usa el rol dueño), en el editor SQL de Supabase:

    ALTER TABLE "usuarios" DISABLE ROW LEVEL SECURITY;  -- repetir con ajustes, metas, aportes, gastos_fijos, sesiones, codigos_reset
