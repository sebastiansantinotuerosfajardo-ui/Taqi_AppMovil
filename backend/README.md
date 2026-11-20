# TAQI – API (Node + Express + Prisma + Supabase)

La app Expo no puede usar Prisma directamente (Prisma necesita Node). Por eso esta carpeta es un
servidor pequeño: la app le habla por HTTP, y el servidor usa Prisma para guardar en Supabase (PostgreSQL).

    App Expo  ──HTTP──►  API Express  ──Prisma──►  Supabase PostgreSQL

## Puesta en marcha

1. Crear el proyecto en https://supabase.com y el usuario `prisma` (ver `GUIA_SUPABASE_PRISMA.md`).
2. `cd backend`
3. `cp .env.example .env` y completar `DATABASE_URL`, `DIRECT_URL` (opcional) y `JWT_SECRET`.
4. `npm install`
5. `npx prisma migrate dev --name init` (crea las tablas en Supabase)
6. `npm test` (prueba de humo; **borra** los datos de prueba que crea, usar una base de desarrollo)
7. `npm run dev` (API en http://localhost:3000)

## Rutas

| Método | Ruta | Descripción |
|---|---|---|
| GET | /salud | Comprueba que el servidor vive |
| POST | /auth/register | Crea cuenta (correo, usuario, contraseña) |
| POST | /auth/login | Entra con correo o usuario; devuelve token |
| GET | /auth/me | Usuario de la sesión |
| POST | /auth/reset-password | Cambia contraseña (ver limitación) |
| GET / PUT | /datos | Lee / reemplaza metas, gastos fijos, presupuesto y ajustes del usuario |

## Limitaciones conocidas
- `/auth/reset-password` no verifica que el correo sea del usuario (el código se simula en pantalla). Para producción real usar Supabase Auth con correo.
- Las fotos de comprobantes siguen guardadas en el celular (futuro: Supabase Storage).
- Si se edita sin conexión y en dos dispositivos, gana el último que sincroniza.
