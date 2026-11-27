# TAQI - Tu Oso de Confianza 🐻💰
**Aplicación móvil para organizar ahorros, gastos y vencimientos, con API propia y base de datos en la nube**

![Expo](https://img.shields.io/badge/Expo-SDK_58-000020?logo=expo&logoColor=white)
![React Native](https://img.shields.io/badge/React_Native-0.88-61DAFB?logo=react&logoColor=black)
![Node](https://img.shields.io/badge/Node.js-22.13+-339933?logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/API-Express_5-000000?logo=express&logoColor=white)
![Prisma](https://img.shields.io/badge/ORM-Prisma_7-2D3748?logo=prisma&logoColor=white)
![Supabase](https://img.shields.io/badge/Base_de_datos-Supabase_PostgreSQL-3ECF8E?logo=supabase&logoColor=white)

---

## 🔗 Enlaces de la entrega

| Entregable | Enlace |
| :--- | :--- |
| 🎬 Video de demostración (3 a 5 min) | PENDIENTE: pegar aquí el enlace del video |
| 📱 APK para Android (generado con EAS Build) | PENDIENTE: pegar aquí el enlace de descarga del APK |
| ☁️ API publicada en Render | PENDIENTE: pegar aquí `https://TU-API.onrender.com/salud` |
| 💻 Código fuente | https://github.com/sebastiansantinotuerosfajardo-ui/Taqi_AppMovil |

> La API está en el plan gratuito de Render: si lleva 15 minutos sin uso se duerme y la primera respuesta tarda cerca de 1 minuto. Para probar la app, abre primero el enlace de `/salud` y espera a que responda `{"ok":true,...}`.

---

## 📌 Datos generales del proyecto
- **Institución:** Universidad Tecnológica del Perú (UTP)
- **Facultad:** Facultad de Ingeniería
- **Carrera:** Ingeniería de Software
- **Curso:** Desarrollo de Aplicaciones Móviles (Código: 32835)
- **Ciclo:** 2026 - Ciclo 2 Agosto
- **Docente:** David William Cota Sencara
- **Integrantes:**
  - **Sebastian Victor Santino Tueros Fajardo** (U22201218)
  - **Pablo Adrian Boza Torres** (U22239512)

---

## 📖 ¿Qué es TAQI?
**TAQI** ayuda a una persona a tener el control de su dinero sin vincular cuentas bancarias: registra su sueldo, sus gastos fijos y variables y sus metas de ahorro, y la app le dice cuánto dinero tiene realmente libre y qué pago vence pronto.

- **Registro manual y privado:** no pide credenciales de ningún banco.
- **Liquidez real:** separa el ingreso de los gastos fijos y variables y muestra el monto libre.
- **Metas de ahorro:** avance en porcentaje, historial de aportes y foto opcional del comprobante.
- **Avisos de vencimiento:** notificaciones locales el día anterior a cada pago, a la hora que elija el usuario.
- **Mapa de bancos y cajeros cercanos** con la ubicación GPS del teléfono.
- **Tipo de cambio** USD/PEN y EUR/PEN en tiempo real.
- **Cuenta en la nube:** los datos se guardan en el teléfono (funciona sin conexión) y se copian a una base de datos PostgreSQL mediante una API propia.

---

## ✨ Funcionalidades

| Módulo | Qué hace | Archivos principales |
| :--- | :--- | :--- |
| **Cuenta** | Registro, ingreso con correo o usuario, recuperación de contraseña con código de 6 dígitos que vence en 10 minutos | `screens/LoginScreen.js`, `RegisterScreen.js`, `ForgotPasswordScreen.js`, `services/authService.js` |
| **Inicio** | Liquidez real, meta destacada, alertas de vencimiento ("vence mañana"), tipo de cambio y acceso al mapa | `screens/HomeScreen.js`, `hooks/useExchangeRate.js` |
| **Metas** | Crear, editar y borrar metas; aportes con foto del comprobante; historial y porcentaje | `screens/MetasScreen.js`, `MetaDetalleScreen.js`, `components/AporteModal.js` |
| **Mi bolsa** | Sueldo base, gastos fijos (con día de vencimiento) y gastos variables | `screens/WalletScreen.js`, `components/GastoFijoModal.js` |
| **Actividad** | Catálogo de actividades de ahorro | `screens/ActivityScreen.js` |
| **Mapa** | Bancos y cajeros cercanos sobre OpenStreetMap, ordenados por distancia, con filtros (todos, bancos, cajeros) y botón para abrir la ruta en la app de mapas del teléfono | `screens/MapaScreen.js`, `components/MapaWeb.js`, `services/places.js` |
| **Avisos** | Recordatorios locales (día anterior al vencimiento y ahorro diario), aviso puntual a la hora exacta y deudas de demostración | `components/AvisosCard.js`, `hooks/useReminders.js`, `services/notifications.js` |
| **Seguridad** | Bloqueo de la app con huella o rostro, tiempo de bloqueo configurable y estado de seguridad del teléfono | `screens/SeguridadScreen.js`, `context/BloqueoContext.js` |
| **Perfil** | Foto de perfil con la cámara, interruptor de notificaciones y cierre de sesión | `screens/ProfileScreen.js` |

---

## 🏗️ Arquitectura

```
┌─────────────────────────┐   HTTPS + JSON    ┌──────────────────────────┐   Prisma    ┌───────────────────────────┐
│  App móvil (Expo)       │ ────────────────► │  API REST (Render)       │ ──────────► │  PostgreSQL (Supabase)    │
│  React Native 0.88      │ ◄──────────────── │  Node + Express + Zod    │ ◄────────── │  7 tablas, RLS activado   │
└────────────┬────────────┘   token de 15 min └──────────────────────────┘             └───────────────────────────┘
             │
             ├─ Sensores y hardware: GPS · cámara · notificaciones · huella/rostro · almacén cifrado
             └─ Servicios públicos: OpenStreetMap (mapa) · Overpass (bancos y cajeros) · open.er-api.com (divisas)
```

**Capas de la app** (cada una solo conoce a la de abajo):
`screens` → `context` (estado global) → `hooks` → `services` (red, almacenamiento, sensores) → `utils` (lógica pura, sin React Native, probada con Node).

| Patrón | Dónde se usa | Para qué |
| :--- | :--- | :--- |
| **Provider / Context** | `context/AuthContext.js`, `AppDataContext.js`, `BloqueoContext.js` | Estado global de sesión, datos y bloqueo |
| **Custom Hooks** | `hooks/` | Lógica reutilizable (cambio de moneda, recordatorios, sincronización en la nube) |
| **Adapter** | `services/secureStore.js` | La app guarda secretos sin saber si hay Keystore (Android), Keychain (iOS) o `localStorage` (web) |
| **Interceptor + single-flight** | `utils/clienteApi.js`, `utils/renovacion.js` | Si la API responde 401, renueva la sesión una sola vez y repite la petición sin que el usuario lo note |
| **Observer** | `services/sesionEventos.js` | La red avisa "la sesión caducó" sin conocer las pantallas |
| **Inyección de dependencias** | `utils/clienteApi.js`, `utils/overpass.js` | La lógica de red recibe `fetch` y el almacén desde fuera; por eso se prueba en Node con servidores falsos |
| **Strategy** | `backend/src/reset.ts` | Cómo se entrega el código de recuperación (`consola` o `demo`; mañana, correo) |
| **Chain of Responsibility** | `backend/src/app.ts` | Middleware en cadena: cabeceras → CORS → límites → sesión → ruta |
| **Offline-first** | `hooks/useCloudSync.js` | La app trabaja con `AsyncStorage` y sube los cambios a la nube 1,5 s después del último; si no hay conexión reintenta cada 30 s |
| **Error Boundary** | `components/ErrorBoundary.js` | Una falla de dibujo muestra "Algo salió mal" con botón Reintentar, no cierra la app |

---

## 📲 Funciones nativas del teléfono

| Función | Librería | Uso en TAQI | Permiso |
| :--- | :--- | :--- | :--- |
| **GPS** | `expo-location` | Encontrar bancos y cajeros cercanos | Ubicación, solo mientras la app está abierta |
| **Cámara** | `expo-image-picker` | Foto del comprobante de un aporte y foto de perfil | Cámara (no pide el micrófono) |
| **Notificaciones locales** | `expo-notifications` | Avisos de vencimiento y recordatorio diario, programados por el propio teléfono (sin servidor) | Notificaciones (Android 13 o superior) y alarmas exactas (Android 14 o superior: se activa en Ajustes → Alarmas y recordatorios) |
| **Huella / rostro** | `expo-local-authentication` | Bloquear la app; TAQI nunca ve ni guarda la huella, el sistema solo responde "sí" o "no" | Biometría |
| **Almacén cifrado** | `expo-secure-store` | Guardar los tokens de sesión (Android Keystore / iOS Keychain) | Ninguno |
| **WebView** | `react-native-webview` | Mostrar el mapa (Leaflet + OpenStreetMap) | Ninguno |

Si el usuario niega un permiso, la app no se rompe: explica para qué lo necesita y, si el sistema ya no deja volver a preguntar, ofrece abrir los Ajustes.

---

## 🗄️ Back-end y base de datos
Carpeta `backend/` (documentación completa en [`backend/README.md`](backend/README.md)).

| Método | Ruta | Descripción |
| :--- | :--- | :--- |
| GET | `/salud` | Comprueba que el servidor vive |
| POST | `/auth/register` · `/auth/login` | Crean la sesión: `token` (15 min) y `refreshToken` (30 días) |
| POST | `/auth/refresh` · `/auth/logout` | Renuevan o cierran la sesión del dispositivo |
| GET | `/auth/me` | Usuario de la sesión |
| POST | `/auth/reset/solicitar` · `/verificar` · `/confirmar` | Recuperación de contraseña en 3 pasos |
| GET / PUT | `/datos` | Leen y guardan metas, gastos fijos, presupuesto y ajustes del usuario |

**Base de datos (Supabase PostgreSQL, gestionada con migraciones de Prisma):** `usuarios`, `sesiones`, `codigos_reset`, `metas`, `aportes`, `gastos_fijos` y `ajustes`.

---

## 🔐 Seguridad

| Capa | Qué se hizo |
| :--- | :--- |
| **Sesión** | Token de acceso de 15 minutos (JWT con emisor, audiencia y algoritmo fijos) + token de renovación de 256 bits que **cambia en cada uso**; en la base solo se guarda su huella SHA-256. Si alguien reutiliza uno viejo, se cierra toda esa sesión |
| **Contraseñas** | bcrypt con costo 12; la app exige 8 caracteres, mayúscula, minúscula, número y símbolo |
| **Recuperación** | Código de 6 dígitos (`crypto.randomInt`) guardado con HMAC, vence en 10 minutos, 5 intentos como máximo y un solo uso |
| **Servidor** | `helmet`, CORS con lista de orígenes, límite de intentos por IP y por cuenta, validación de datos con Zod y registro de eventos con correos enmascarados |
| **Base de datos** | Row Level Security activado en todas las tablas |
| **Teléfono** | Tokens en el almacén cifrado del sistema, bloqueo con huella o rostro, permisos mínimos (micrófono y "dibujar sobre otras apps" bloqueados) |
| **Red** | El APK solo se conecta por `https://` (Android bloquea el tráfico sin cifrar) y la configuración de compilación lo verifica antes de generar el APK |
| **Secretos** | Los archivos `.env` están en `.gitignore`; el servidor no arranca con un `JWT_SECRET` corto o de ejemplo |

---

## 📁 Estructura del repositorio

```plaintext
Taqi_AppMovil/
├── App.js, index.js            # Punto de entrada y proveedores globales
├── app.json                    # Configuración de Expo (nombre, paquete, permisos, plugins)
├── eas.json                    # Perfiles de compilación de EAS (APK de prueba)
├── components/                 # Interfaz reutilizable (modales, tarjetas, mapa, bloqueo, avisos)
├── constants/                  # Colores, datos de la app y respaldo local de divisas
├── context/                    # Estado global: sesión, datos del usuario y bloqueo
├── hooks/                      # Cambio de moneda, recordatorios, sincronización en la nube
├── navigation/                 # Stack + pestañas inferiores
├── screens/                    # Pantallas (Inicio, Metas, Mi bolsa, Actividad, Perfil, Mapa, Seguridad…)
├── services/                   # Red, almacenamiento, sensores (GPS, cámara, notificaciones, biometría)
├── utils/                      # Lógica pura y probada (avisos, bloqueo, geografía, renovación de sesión…)
├── scripts/                    # Pruebas automáticas y revisión previa a la compilación
├── backend/                    # API (Express + Prisma + Supabase) con sus propias pruebas
│   ├── prisma/                 # Esquema y migraciones
│   ├── src/                    # app, auth, sesiones, reset, límites, seguridad, datos…
│   └── test/                   # Pruebas de lógica, API y seguridad
└── GUIA_*.md                   # Informes de los avances y guía de Supabase + Prisma
```

---

## 🛠️ Tecnologías

| Parte | Tecnología | Versión |
| :--- | :--- | :--- |
| App | Expo / React Native / React | `~58.1.0` / `0.88.1` / `19.3.0` |
| Navegación | React Navigation (stack nativo y pestañas) | `^7` |
| Almacenamiento local | `@react-native-async-storage/async-storage` | `2.2.0` |
| HTTP | `fetch` con `AbortController` y `axios` | `axios ^1.20` |
| Sensores | `expo-location`, `expo-image-picker`, `expo-notifications`, `expo-local-authentication`, `expo-secure-store` | `~58` |
| Mapa | `react-native-webview` + Leaflet 1.9.4 + OpenStreetMap + API Overpass | `14.0.1` |
| API | Express, Zod, helmet, express-rate-limit, bcryptjs, jsonwebtoken (TypeScript, `tsx`) | Express `5` |
| Base de datos | Prisma con `@prisma/adapter-pg` sobre PostgreSQL (Supabase) | Prisma `7.10.1` |
| Compilación | EAS Build (APK) | `eas-cli` |

---

## 🚀 Ejecutar el proyecto en tu computadora

**Requisitos:** Node.js **22.13 o superior** (`node -v`), Git, la app **Expo Go** en un celular y una base PostgreSQL (se usó Supabase; la guía está en [`GUIA_SUPABASE_PRISMA.md`](GUIA_SUPABASE_PRISMA.md)).

### 1. API
```bash
git clone https://github.com/sebastiansantinotuerosfajardo-ui/Taqi_AppMovil.git
cd Taqi_AppMovil/backend
cp .env.example .env          # completa DATABASE_URL y JWT_SECRET (instrucciones dentro del archivo)
npm install
npx prisma migrate deploy     # crea las tablas
npm run dev                   # API en http://localhost:3000
```

### 2. App
```bash
cd ..                         # carpeta raíz del proyecto
cp .env.example .env.local    # EXPO_PUBLIC_API_URL=http://IP-DE-TU-PC:3000 (celular y PC en la misma Wi-Fi)
npm install
npx expo start -c
```
Escanea el código QR con **Expo Go** (Android) o con la cámara (iPhone).

---

## 🧪 Pruebas automáticas

```bash
npm test                      # app: mapa, avisos, seguridad, renovación de sesión y preparación del APK
cd backend && npm run test:todo   # API: lógica, endpoints completos y seguridad (usa una base de desarrollo)
```
La lógica importante (renovación de sesión, bloqueo biométrico, avisos de vencimiento, consulta de lugares, revisión del APK) está escrita como funciones puras para poder probarla con Node sin un teléfono. Las pruebas del servidor crean cuentas temporales `…@taqi-test.invalid` y las borran al terminar.

---

## ☁️ Publicar la API en Render

En <https://render.com>: **New → Web Service** y conecta este repositorio (rama `proyecto-final` o `main`).

| Campo | Valor |
| :--- | :--- |
| Root Directory | `backend` |
| Build Command | `npm install --include=dev` |
| Start Command | `npm start` |
| Health Check Path | `/salud` |
| Plan | Free |

**Variables de entorno:**

| Variable | Valor |
| :--- | :--- |
| `DATABASE_URL` | La conexión de Supabase en modo **Session pooler** |
| `JWT_SECRET` | Una clave nueva de 32 caracteres o más (`node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`) |
| `NODE_ENV` | `production` |
| `TRUST_PROXY` | `1` |
| `RESET_MODO` | `demo` (muestra el código de recuperación en pantalla; solo para la exposición) |

Las migraciones se aplican desde tu computadora con `npx prisma migrate deploy`. Comprobación: abrir `https://TU-API.onrender.com/salud`.

---

## 📦 Generar el APK con EAS Build

1. Pon la dirección de tu API en `eas.json` (perfil `preview`, campo `EXPO_PUBLIC_API_URL`). **Es obligatorio que empiece con `https://`**: un APK instalado no puede conectarse a direcciones sin cifrar.
2. Revisa que todo esté listo: `npm run verificar:build`
3. Compila (cuenta gratuita en <https://expo.dev>):
```bash
npx eas-cli login
npm run build:apk             # revisa la configuración y lanza la compilación en la nube
```
4. Al terminar, EAS entrega un enlace para descargar e instalar el APK. En el celular hay que permitir "instalar apps desconocidas" para el navegador.

> El `.env.local` no viaja a EAS (está en `.gitignore`), por eso la dirección de la API del APK vive en `eas.json`.

---

## 🎬 Cómo probar cada función (guion rápido)

1. **Cuenta:** Crear cuenta (contraseña con 8 caracteres, mayúscula, minúscula, número y símbolo) → cerrar sesión → "¿Olvidé mi contraseña?" (el código aparece en pantalla en modo demostración).
2. **Mi bolsa y Metas:** registrar el sueldo, un gasto fijo con día de vencimiento y una meta; agregar un aporte con foto del comprobante (cámara).
3. **Avisos:** Perfil → activar notificaciones → **Cargar deudas de demostración** → **Probar aviso puntual** (llega en 1 minuto; en Android 14 hay que permitir "Alarmas y recordatorios").
4. **Mapa:** Inicio → Mapa → permitir ubicación → lista de bancos y cajeros por distancia → tocar uno → **Cómo llegar**.
5. **Seguridad:** Perfil → Seguridad → activar el bloqueo con huella o rostro → salir de la app y volver.
6. **Nube:** iniciar sesión en otro teléfono con la misma cuenta y comprobar que están las mismas metas.

---

## 🧾 Cumplimiento de la rúbrica

| Criterio | Puntos | Dónde se evidencia |
| :--- | :---: | :--- |
| **Arquitectura** | 20 | Capas separadas, 10 patrones documentados (tabla de arriba), lógica pura probada con Node, estado global con Context |
| **Back-end** | 20 | API REST propia, base PostgreSQL con migraciones y RLS, sesiones con tokens que rotan, recuperación de contraseña verificada, validación y límites de intentos, pruebas automáticas del servidor |
| **Funciones nativas** | 20 | GPS, cámara, notificaciones locales, huella o rostro y almacén cifrado, con manejo de permisos denegados |
| **UI/UX** | 20 | Paleta y componentes consistentes (`constants/colors.js`), estados de carga, lista vacía y error en el mapa, las metas, la bolsa y las divisas, mensajes claros cuando falla el GPS o la red, etiquetas de accesibilidad en el mapa, los avisos, la seguridad y el bloqueo, y una encuesta de mejora a usuarios |
| **Innovación** | 10 | Mapa sin claves ni costo (OpenStreetMap + Overpass con tres servidores de respaldo y caché de 24 h), avisos que se adaptan si activas el recordatorio tarde, trabajo sin conexión con sincronización, renovación de sesión transparente |
| **Documentación** | 10 | Este README, informes de los avances, guía de Supabase + Prisma, video de 3 a 5 minutos, APK con EAS Build y defensa |

### Validación con usuarios
PENDIENTE (opcional): pegar aquí el enlace a los gráficos de la encuesta de mejora (Google Forms) y 2 o 3 conclusiones.

---

## ⚠️ Limitaciones conocidas y trabajo futuro

- **Recuperación de contraseña en modo demostración:** con `RESET_MODO="demo"` el código se muestra en pantalla porque no hay servicio de correo. Para producción hay que agregar el envío por correo (la estrategia ya está separada en `backend/src/reset.ts`).
- **Render gratuito:** el servidor se duerme tras 15 minutos sin uso y tarda cerca de 1 minuto en despertar. Los límites de intentos viven en la memoria del proceso (válidos para una sola instancia).
- **Mapa:** necesita internet (carga Leaflet y los mosaicos de OpenStreetMap) y depende de la API pública Overpass, que a veces está lenta; en ese caso se muestra la última búsqueda guardada. Mejora futura: incluir Leaflet dentro de la app.
- **Fotos:** los comprobantes y la foto de perfil se guardan en el teléfono, no en la nube (futuro: Supabase Storage).
- **Sincronización:** si se edita sin conexión en dos dispositivos, gana el último que sincroniza.
- **Alarmas exactas:** en Android 14 o superior el usuario debe activar "Alarmas y recordatorios" para que los avisos lleguen a la hora exacta; con el ahorro de batería muy agresivo de algunas marcas, el sistema puede retrasarlos.
- **iOS:** la configuración del proyecto está preparada, pero el APK y las pruebas se hicieron en Android.
- **Token de acceso:** sigue siendo válido hasta 15 minutos después de cerrar sesión (los JWT no se pueden anular; por eso duran poco).

---

## 🌿 Gestión de versiones y ramas Git
- `main`: entregas oficiales.
- `proyecto-final`: desarrollo del proyecto final, entregado por parches pequeños (mapa y GPS, notificaciones, seguridad de la app, seguridad del servidor, compilación del APK), cada uno verificado con pruebas antes de guardarse.
- Ramas anteriores de los avances: `feature/api-cambio`, `feature/metas-crud`, `feature/storage-auth`, `feature/navigation`, `feature/loading-and-tabs`, `feature/password-validation`.

---
© 2026 **TAQI Team** - Universidad Tecnológica del Perú. Todos los derechos reservados.
