# GUÍA MAESTRA PARA EL INFORME Y DEFENSA DEL APF3: PROYECTO TAQI
**Curso:** Desarrollo de Aplicaciones Móviles (32835) - UTP  
**Docente:** David William Cota Sencara  
**Alumnos:** Sebastian Victor Santino Tueros Fajardo y Pablo Adrian Boza Torres

---

## 1. Qué se agrega en el APF3 y cómo se cubre

> [!NOTE]
> Esta tabla es la **autoevaluación interna del equipo**. Se basa en la Unidad de Aprendizaje 3 del sílabo (sensores, notificaciones locales y manejo de errores) y en los criterios de la rúbrica del APF2. **Antes de entregar, contrastarla con la rúbrica oficial del APF3 publicada en Canvas**, porque no se incluyeron puntajes inventados.

| Criterio | Qué se pide | Cómo lo cubre TAQI en el APF3 | Dónde verlo |
| :--- | :--- | :--- | :--- |
| **Sensor del dispositivo** | Usar al menos un sensor (cámara, GPS, etc.) | Foto del comprobante con la **cámara** (`expo-image-picker`), con manejo de permiso negado, cancelación y error | `services/camera.js`, `components/AporteModal.js` |
| **Notificaciones locales** | Incorporar notificaciones locales | Permiso del usuario, canal de Android, aviso en fecha exacta (vencimientos) y aviso diario de ahorro (`expo-notifications`) | `services/notifications.js`, `hooks/useReminders.js` |
| **Manejo de errores y estados** | Errores controlados, estados de carga y de error | `logger` con niveles, `ErrorBoundary` que evita el cierre de la app, `try/catch` con mensajes claros | `services/logger.js`, `components/ErrorBoundary.js`, `App.js` |
| **Navegación (Stack / Tab / Drawer)** | Navegación combinada y sin errores | Se mantiene el Stack + Bottom Tabs del APF2 (no se usa Drawer) | `navigation/AppNavigator.js` |
| **Hooks y eventos** | `useState`, `useEffect` y eventos | Se suman el hook `useReminders` y el uso de `useCallback` en pantallas; se mantienen `useExchangeRate` y `usePersistentState` | `hooks/` |
| **API o mock local** | Datos externos con manejo de errores | Sin cambios respecto al APF2: `fetch` + `axios` con respaldo en JSON local | `services/api.js` |
| **Persistencia (AsyncStorage)** | Guardar datos en el dispositivo | Se agrega el ajuste de recordatorios y el día de vencimiento por gasto, guardados por usuario | `context/AppDataContext.js` |
| **Interfaz y componentes reutilizables** | UI coherente y componentes reutilizables | `MetaCard` y `GastoRow` como componentes memoizados; `FlatList` en las listas | `components/`, `screens/` |
| **Documentación (README)** | Propósito, dependencias y ejecución | Sección del APF3 en el `README.md` | `README.md` |

---

## 2. Resumen técnico de cambios implementados

### A. Servicios, datos y lógica
1. **Registro de eventos (`services/logger.js`):** niveles `info`, `warn` y `error` con etiqueta del módulo (por ejemplo `[storage]`), guardando los últimos 50 mensajes en memoria. Reemplaza los errores silenciosos en `api.js` y `storage.js`.
2. **Notificaciones locales (`services/notifications.js`):** pide permiso, crea el canal de Android y programa avisos en una fecha exacta, diarios o de prueba (5 segundos). En la versión web se desactivan.
3. **Recordatorios automáticos (`hooks/useReminders.js`):** aviso a las 9:00 del día anterior al vencimiento de cada gasto fijo (próximos 3 meses) y aviso diario a las 20:00 si hay una actividad de ahorro activa. Cancela y vuelve a programar todo cuando cambian los datos, para no dejar avisos repetidos.
4. **Día de vencimiento (`utils/vencimientos.js`):** calcula la próxima fecha de pago de cada gasto fijo y los días que faltan (si el mes no tiene ese día, usa el último día del mes).
5. **Cámara (`services/camera.js`):** abre la cámara y devuelve un resultado claro: foto tomada, permiso negado, cancelado o error.
6. **Persistencia ampliada (`context/AppDataContext.js`):** nuevo ajuste `recordatorios`, campo `diaVencimiento` en cada gasto fijo y foto opcional en cada aporte.

### B. Presentación e interfaz
1. **Perfil (`screens/ProfileScreen.js`):** interruptor "Notificaciones" y opción "Probar notificación". Las filas "Métodos de ahorro preferidos" y "Seguridad" avisan "Próximamente".
2. **Gastos fijos (`components/GastoFijoModal.js`, `components/GastoRow.js`):** campo "Día de vencimiento (1–31)" con validación; cada gasto muestra "· día N".
3. **Pantalla principal (`screens/HomeScreen.js`):** la alerta ahora usa datos reales: "Tu [gasto] vence hoy / mañana / en N días".
4. **Aportes (`components/AporteModal.js`, `screens/MetaDetalleScreen.js`):** botón "Adjuntar foto del comprobante", vista previa y miniatura en el detalle de la meta.
5. **Componentes memoizados (`components/MetaCard.js`, `components/GastoRow.js`):** `React.memo` evita redibujar elementos que no cambiaron. `MetasScreen` y `WalletScreen` quedaron más cortas.
6. **Seguridad de acceso (`screens/LoginScreen.js`, `screens/ForgotPasswordScreen.js`):** el bloqueo por 3 intentos fallidos se mantiene aunque se cierre la app; el código de recuperación es de 6 dígitos al azar (simulado en pantalla), con mensaje "Código incorrecto", cuenta regresiva y reenvío.
7. **Limpieza visual:** se retiraron imágenes sin uso (`assets/app-icon-dark.png` y `assets/splash-icon.png`). Los botones "Continuar con Google / Apple" avisan "Próximamente".

---

## 3. Catálogo verificado para la sección "Desarrollo" del informe escrito

Las líneas corresponden a la rama `apf3` del repositorio. Si el código se modifica después, hay que volver a comprobarlas.

### 3.1. Notificaciones locales con permisos
- **Archivo a capturar (código):** `services/notifications.js`
  - Líneas 37 a 54 (función `pedirPermiso`).
  - Líneas 56 a 70 (funciones `programarEnFecha` y `programarDiaria`).
- **Archivo de salida (frontend):** captura de **Perfil** con el interruptor "Notificaciones" activado y de la notificación de prueba recibida en el celular.
- **Descripción para el informe:**
  > *"Para recordar al usuario los vencimientos de sus gastos y su hábito de ahorro se implementaron notificaciones locales con la librería `expo-notifications`. El módulo `services/notifications.js` solicita explícitamente el permiso al usuario, prepara el canal requerido por Android y expone funciones para programar un aviso en una fecha exacta o un aviso que se repite todos los días a la misma hora. Al ser notificaciones locales, las programa el propio dispositivo sin necesidad de un servidor, y en la versión web se desactivan de forma controlada."*

### 3.2. Recordatorios automáticos con un Hook personalizado
- **Archivo a capturar (código):** `hooks/useReminders.js`
  - Líneas 19 a 61 (hook completo con `useEffect`, cancelación y reprogramación).
- **Archivo de salida (frontend):** captura de **Perfil** y de la notificación "[gasto] vence mañana" o "Hora de ahorrar".
- **Descripción para el informe:**
  > *"La programación de recordatorios se encapsuló en el Custom Hook `useReminders`, que se ejecuta mediante `useEffect` cada vez que cambian los gastos fijos, las actividades de ahorro o el ajuste del usuario. En cada ejecución se cancelan los avisos previos y se programan nuevamente los de los próximos tres meses, evitando duplicados y asegurando que los avisos sigan llegando aunque la aplicación no se abra durante varias semanas."*

### 3.3. Cámara como sensor del dispositivo
- **Archivo a capturar (código):** `services/camera.js`
  - Líneas 8 a 25 (función `tomarFoto`).
- **Archivo a capturar (código):** `components/AporteModal.js`
  - Líneas 42 a 51 (función `handleFoto` con manejo de permiso negado y error).
- **Archivo de salida (frontend):** captura del formulario "Agregar aporte" con el botón "Adjuntar foto del comprobante", la vista previa de la foto y la miniatura en el detalle de la meta.
- **Descripción para el informe:**
  > *"Como sensor del dispositivo se integró la cámara mediante `expo-image-picker`. La función `tomarFoto` solicita el permiso, abre la cámara con edición y calidad media para limitar el tamaño del archivo, y devuelve un resultado explícito (foto tomada, permiso negado, cancelado o error). La interfaz reacciona a cada caso: muestra la vista previa si hubo foto, orienta al usuario a los ajustes del teléfono si negó el permiso y registra cualquier fallo con el logger."*

### 3.4. Día de vencimiento y alerta preventiva
- **Archivo a capturar (código):** `utils/vencimientos.js`
  - Líneas 9 a 34 (`proximoVencimiento`, `diasParaVencer` y `textoVencimiento`).
- **Archivo a capturar (código):** `screens/HomeScreen.js`
  - Líneas 23 a 29 (selección del gasto que vence primero con `useMemo`).
- **Archivo de salida (frontend):** captura del modal "Agregar gasto" con el campo "Día de vencimiento" y de la alerta en la pantalla principal.
- **Descripción para el informe:**
  > *"Cada gasto fijo almacena el día del mes en que vence. Las funciones de `utils/vencimientos.js` calculan la próxima fecha de pago, considerando los meses con menos días, y los días restantes. La pantalla principal utiliza `useMemo` para identificar el gasto que vence primero y muestra una alerta preventiva con datos reales, por ejemplo 'Tu internet vence mañana'."*

### 3.5. Manejo de errores: logger y ErrorBoundary
- **Archivo a capturar (código):** `services/logger.js`
  - Líneas 24 a 41 (objeto `logger` con niveles `info`, `warn` y `error`).
- **Archivo a capturar (código):** `components/ErrorBoundary.js`
  - Líneas 10 a 29 (captura del error con `getDerivedStateFromError` y `componentDidCatch`).
- **Archivo a capturar (código):** `App.js`
  - Líneas 12 a 22 (la aplicación completa envuelta en `ErrorBoundary`).
- **Archivo de salida (frontend):** captura de la pantalla "Algo salió mal" con el botón "Reintentar" (se obtiene forzando un error en una copia de prueba) y de los mensajes `[error] [...]` en la consola.
- **Descripción para el informe:**
  > *"Para mejorar la robustez de la aplicación se centralizó el registro de eventos en el módulo `logger`, que clasifica los mensajes por nivel y por módulo de origen. Además se incorporó un `ErrorBoundary`, componente de clase que captura los errores ocurridos al dibujar las pantallas, los registra con el logger y muestra un aviso con la opción de reintentar en lugar de cerrar la aplicación. Los errores de lectura y escritura en `AsyncStorage` y de red dejaron de ser silenciosos."*

### 3.6. Componentes reutilizables y memoizados
- **Archivo a capturar (código):** `components/MetaCard.js`
  - Líneas 9 a 14 y línea 42 (componente y `export default React.memo(MetaCard)`).
- **Archivo a capturar (código):** `screens/MetasScreen.js`
  - Líneas 60 a 78 (`useCallback` y `FlatList` que usa `MetaCard`).
- **Archivo de salida (frontend):** captura de **Metas** y de **Mi bolsa** con sus listas.
- **Descripción para el informe:**
  > *"Se extrajeron las tarjetas de metas y las filas de gastos a los componentes reutilizables `MetaCard` y `GastoRow`, envueltos en `React.memo`. Junto con `useCallback` en las funciones que reciben, evitan que React vuelva a dibujar elementos cuyos datos no cambiaron. Las pantallas `MetasScreen` y `WalletScreen` conservan `FlatList` y quedaron más cortas y fáciles de mantener."*

### 3.7. Seguridad de acceso: bloqueo persistente y código de recuperación
- **Archivo a capturar (código):** `screens/LoginScreen.js`
  - Líneas 31 a 44 (retoma el bloqueo al abrir la pantalla).
  - Líneas 65 a 74 (función `registerFailure`, guarda la hora en que termina el bloqueo).
- **Archivo a capturar (código):** `screens/ForgotPasswordScreen.js`
  - Líneas 45 a 49 (generación del código de 6 dígitos) y 61 a 68 (verificación).
- **Archivo de salida (frontend):** captura del banner de bloqueo, de la verificación con el mensaje "Código incorrecto" y de las 6 casillas del código.
- **Descripción para el informe:**
  > *"El bloqueo temporal por intentos fallidos ahora es persistente: al alcanzar el máximo de intentos se guarda en `AsyncStorage` la hora en que termina el bloqueo, y al abrir la pantalla se retoma con el tiempo restante, de modo que cerrar y abrir la aplicación no lo reinicia. En la recuperación de contraseña el código de verificación de seis dígitos se genera al azar y se valida contra lo ingresado por el usuario. Como no existe un servidor de correo, el código se muestra en pantalla como simulación."*

### 3.8. Elementos del APF2 que se mantienen (líneas actualizadas)
| Tema | Archivo | Líneas |
| :--- | :--- | :--- |
| Navegación híbrida | `navigation/AppNavigator.js` | 22 a 41 (`MainTabs`) y 82 a 97 (`AppNavigator`) |
| API con `fetch` y `AbortController` | `services/api.js` | 19 a 38 |
| API con `axios` | `services/api.js` | 40 a 59 |
| Hook de consumo asíncrono | `hooks/useExchangeRate.js` | 4 a 53 |
| Persistencia con AsyncStorage | `context/AppDataContext.js` | 53 a 91 |
| `FlatList` de gastos | `screens/WalletScreen.js` | 221 a 240 |
| Formulario modal con validación | `components/GastoFijoModal.js` | 27 a 66 |

---

## 4. Guión recomendado para la demostración en vivo del APF3

Conviene que participen **los dos integrantes**, repartiéndose las secciones.

1. **Introducción (30 seg):** integrantes (Sebastian Tueros y Pablo Boza), carrera (Ingeniería de Software) y objetivos de la Unidad 3 (sensores, notificaciones locales y manejo de errores).
2. **Acceso y seguridad (45 seg):** iniciar sesión; mostrar el bloqueo tras 3 intentos fallidos y la recuperación de contraseña con el código de 6 dígitos y el mensaje "Código incorrecto".
3. **Pantalla principal (30 seg):** mostrar la alerta real "Tu [gasto] vence ..." y el tipo de cambio con `fetch` y `axios`.
4. **Gastos con día de vencimiento (45 seg):** en **Mi bolsa**, agregar un gasto con su día de vencimiento y ver "· día N" y cómo se actualiza el monto libre.
5. **Cámara (45 seg):** en **Metas**, abrir una meta, **Agregar aporte**, tocar **Adjuntar foto del comprobante**, tomar la foto y guardar; mostrar la miniatura en el detalle.
6. **Notificaciones (45 seg):** en **Perfil**, activar el interruptor "Notificaciones", aceptar el permiso, tocar **Probar notificación**, minimizar la app y mostrar que llega en unos 5 segundos.
7. **Persistencia (20 seg):** reiniciar la app y comprobar que los datos siguen.
8. **Arquitectura y manejo de errores (45 seg):** mostrar en el código `logger.js`, `ErrorBoundary.js` y `useReminders.js`, y explicar por qué la app no se cierra ante un error.
9. **Cierre (15 seg):** conclusiones y repositorio.

---

## 5. Pruebas en el celular y limitaciones declaradas

### 5.1. Datos de la prueba
| Dato | Valor                           |
| :--- |:--------------------------------|
| Dispositivo y sistema | nubia Focus Pro 5G, Android 13 (MyOS 13.0.1) |
| Versión de Expo Go / SDK | Expo Go 58.0.5; el proyecto del repositorio usa SDK 57               |
| Fecha de la prueba | 16/11/2026                      |
| Responsable | Sebastian Tueros                |

### 5.2. Resultados de las pruebas en el celular

| N.º | Prueba | Resultado esperado | Resultado |
| :---: | :--- | :--- | :---: |
| 1 | Activar el interruptor "Notificaciones" en Perfil | La app pide el permiso y el interruptor queda activado | ✅ Aprobado (en Expo Go se registra un aviso porque no puede crear el canal de Android) |
| 2 | Tocar "Probar notificación" y minimizar la app | La notificación llega | ✅ Aprobado (en Expo Go llegó con unos 2 minutos de retraso) |
| 3 | Programar un gasto fijo con vencimiento próximo | El aviso "[gasto] vence mañana" llega a la hora programada (9:00) | ⏳ Pendiente de verificar |
| 4 | Aporte a una meta con "Adjuntar foto del comprobante" | Se abre la cámara y la foto aparece en la vista previa y en el detalle de la meta | ✅ Aprobado |
| 5 | Negar el permiso de cámara | Aparece el aviso que lleva a los ajustes del teléfono | ✅ Aprobado |
| 6 | Dejar de usar la app y volver a abrirla durante un bloqueo de login | El bloqueo continúa con el tiempo restante | ✅ Aprobado |
| 7 | Cerrar y reabrir la app | Metas, gastos y aportes siguen guardados | ✅ Aprobado |

> Si alguna prueba no sale bien, cambiar su resultado a ❌ y explicar el motivo antes de entregar. **No entregar esta tabla sin haber realizado las pruebas.**

### 5.3. Limitaciones del aplicativo
- En **Expo Go para Android** las notificaciones locales funcionan con limitaciones: no se puede crear el canal de Android y la entrega puede retrasarse unos minutos. Una *development build* de la app resuelve esas limitaciones.
- Las notificaciones son **locales**; las notificaciones push remotas requieren un servidor y no se implementaron.
- En la versión web las notificaciones se desactivan y el interruptor lo indica.
- El código de recuperación de contraseña es una **simulación**: se muestra en pantalla porque no hay servidor de correo.
- Los accesos con Google y Apple, "Métodos de ahorro preferidos" y "Seguridad" muestran "Próximamente".
- El modo oscuro del diseño de Figma no está implementado.