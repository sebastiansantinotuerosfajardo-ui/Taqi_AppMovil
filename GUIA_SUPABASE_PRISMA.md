# Guía: conectar TAQI con Supabase y Prisma (paso a paso)

## 1. Crear el proyecto en Supabase
1. Entra a https://supabase.com → **New project**. Anota la contraseña de la base de datos.
2. En **SQL Editor** ejecuta (cambia la contraseña):

```sql
create user "prisma" with password 'CAMBIA_ESTA_CLAVE' bypassrls createdb;
grant "prisma" to "postgres";
grant usage on schema public to prisma;
grant create on schema public to prisma;
grant all on all tables in schema public to prisma;
grant all on all routines in schema public to prisma;
grant all on all sequences in schema public to prisma;
alter default privileges for role postgres in schema public grant all on tables to prisma;
alter default privileges for role postgres in schema public grant all on routines to prisma;
alter default privileges for role postgres in schema public grant all on sequences to prisma;
```
3. Pulsa **Connect** (arriba) y copia la cadena **Session pooler** (puerto 5432). Reemplaza el usuario por `prisma.<ID_DEL_PROYECTO>` y pon tu clave.

## 2. Preparar el backend
```bash
cd backend
cp .env.example .env      # en Windows: copy .env.example .env
```
Edita `.env`: pega la cadena en `DATABASE_URL` y escribe un `JWT_SECRET` largo y aleatorio.
```bash
npm install
npx prisma migrate dev --name init
npm test
npm run dev
```
Abre http://localhost:3000/salud: debe responder `{"ok":true}`.

## 3. Conectar la app
En la raíz del proyecto: `cp .env.example .env.local` y edita `EXPO_PUBLIC_API_URL`.
- Celular con Expo Go: usa la IP de tu PC (`ipconfig`), ej. `http://192.168.1.15:3000` (mismo Wi‑Fi).
Luego `npx expo start -c`.

## 4. Publicar la API (para que funcione fuera de tu PC)
Render o Railway: carpeta raíz `backend`, build `npm install && npx prisma generate`, start `npm start`.
Variables: `DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGIN`. Luego pon esa URL https en `EXPO_PUBLIC_API_URL`.
En Vercel/serverless usa el pooler 6543 con `?pgbouncer=true` en `DATABASE_URL` y el 5432 en `DIRECT_URL`.

## 5. Nunca subas a Git
`backend/.env` ni claves. Ya están en `.gitignore`.
