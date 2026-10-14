# GUÍA MAESTRA PARA EL INFORME Y DEFENSA DEL APF2: PROYECTO TAQI
**Curso:** Desarrollo de Aplicaciones Móviles (32835) - UTP  
**Docente:** David William Cota Sencara  
**Alumnos:** Sebastián Víctor Santino Tueros Fajardo y Pablo Adrian Boza Torres  

---

## 1. Autoevaluación de Cumplimiento vs. Rúbrica de Evaluación UTP

> [!NOTE]
> Esta tabla representa la **autoevaluación interna del equipo**, verificando que cada requisito técnico del docente David Cota en la rúbrica oficial se encuentre cubierto en el código antes de la entrega final.

| Criterio de Evaluación | Peso | Estado Previo | Estado Actual (Con Mejoras) | Nivel Proyectado |
| :--- | :---: | :---: | :---: | :---: |
| **1. Estructura del Repositorio en GitHub** | 15% | Bueno (4 pts): Faltaba el archivo `README.md` formal en la raíz. | **Excelente (5 pts):** Estructura modular y limpia (`components`, `screens`, `hooks`, `context`, `services`, `constants`), `app.json` configurado, `README.md` exhaustivo y ramas activas (`feature/api-cambio`, `feature/metas-crud`, etc.). | **18 - 20 (Excelente)** |
| **2. Navegación (Stack / Tab / Drawer)** | 20% | Bueno (4 pts): Faltaba la ruta de recuperación de contraseña que estaba en mockups. | **Excelente (5 pts):** Navegación fluida y profesional combinando **Native Stack Navigator** (Splash, Loading, Login, Register, ForgotPassword, MetaDetalle) con **Bottom Tab Navigator** de 5 pestañas personalizadas sin errores de rutas. | **18 - 20 (Excelente)** |
| **3. Manejo de Estados y Eventos (Hooks)** | 25% | Bueno (4 pts): Presupuesto y gastos fijos estaban en un arreglo estático en Wallet. | **Excelente (5 pts):** Uso riguroso de `useState`, `useEffect`, `useCallback`, `useMemo`, y Custom Hooks (`usePersistentState`, `useExchangeRate`). Manejo de eventos `onPress`, `onChangeText`, validaciones en vivo, temporizadores y modales dinámicos. | **18 - 20 (Excelente)** |
| **4. Consumo de API Externa o Mock Local (fetch / axios)** | 25% | Bueno (4.5 pts): Tenía API pero faltaba fallback explícito a Mock local JSON. | **Excelente (5 pts):** Implementación dual comparativa: `fetch` con `AbortController` (USD) y `axios` con timeout (EUR) consumiendo la API de divisas *ExchangeRate-API* (`open.er-api.com`). Manejo completo de `try/catch`, estados condicionales (`loading`, `error`, `reload`) y fallback resiliente a mock local JSON (`constants/exchangeRatesMock.json`) para soporte offline. | **18 - 20 (Excelente)** |
| **5. Interfaz y Experiencia de Usuario (UI/UX)** | 10% | Regular (3 pts): **No se utilizaba `FlatList` en ninguna pantalla** (usaban ScrollView con map). | **Excelente (5 pts):** Interfaz coherente, diseño responsive con Flexbox, paleta de colores corporativa y uso obligatorio de componentes optimizados: **`FlatList`** en `MetasScreen`, `WalletScreen` y `ActivityScreen`, `TouchableOpacity`, `TextInput`, `Modal` y `ActivityIndicator`. | **18 - 20 (Excelente)** |
| **6. Documentación Inicial (README.md)** | 5% | Insuficiente (1 pt): **No existía `README.md`** en el proyecto. | **Excelente (5 pts):** `README.md` profesional con badges, propósito, stack tecnológico, estructura de carpetas, dependencias, guía de ejecución (`npx expo start`), cuenta de demostración precargada en almacenamiento local y objetivos del APF2. | **18 - 20 (Excelente)** |

---

## 2. Resumen Técnico de Cambios Implementados

### A. Capa de Datos y Persistencia (Backend Local en el Dispositivo)
1. **Creación de `README.md` Oficial:** Documentación técnica completa que satisface al 100% los criterios 1 y 6 de la rúbrica.
2. **Soporte de Mock Local JSON y Modo Offline (`constants/exchangeRatesMock.json` y `services/api.js`):**
   - Consume en vivo el servicio *ExchangeRate-API* (`open.er-api.com`). Si no hay conexión o el servidor falla, el bloque `try/catch` conmuta al archivo JSON local mostrando el indicador `(offline)`.
3. **Usuario de Prueba Sembrado en `services/authService.js`:**
   - La cuenta `camila.rojas@gmail.com` / `Clave123!` se inicializa automáticamente en `AsyncStorage` si el dispositivo no tiene usuarios registrados, garantizando que el docente o los evaluadores puedan iniciar sesión de inmediato.
4. **Módulo Completo de Gastos Fijos y Variables en `context/AppDataContext.js`:**
   - Persistencia reactiva en `AsyncStorage` (`@taqi:gastos_fijos:${uid}` y `@taqi:presupuesto:${uid}`).
   - Funciones CRUD completas: `addGastoFijo`, `updateGastoFijo`, `deleteGastoFijo`, `updatePresupuesto`.
   - Separación estricta de cálculos de liquidez:
     - **Vivienda fija:** $\text{Monto libre} = \text{Ingreso base} - \text{Total gastos fijos}$ (ej. $1,350 - 834 = \text{S/ } 516.00$).
     - **Vivienda variable:** $\text{Monto libre estimado} = \text{Ingreso base} - \text{Gasto variable}$ (ej. $1,350 - 800 = \text{S/ } 550.00$).
5. **Restablecimiento Funcional de Contraseñas:**
   - Función `resetPassword(email, newPassword)` en `services/authService.js` que actualiza la clave en `AsyncStorage` al completar el flujo de 3 pasos de `ForgotPasswordScreen`.

### B. Capa de Presentación e Interfaz (Frontend)
1. **Adopción de `FlatList` en 3 pantallas clave:**
   - `screens/WalletScreen.js`: Renderizado virtualizado con `FlatList` para los gastos fijos del mes, encabezado con la tarjeta dorada y pie con el cálculo de liquidez.
   - `screens/MetasScreen.js`: Renderizado con `FlatList` de metas de ahorro, barra de progreso y manejo de estados vacíos (`ListEmptyComponent`).
   - `screens/ActivityScreen.js`: Catálogo de sugerencias y actividades de ahorro con `FlatList`.
2. **Nuevos Modales Interactivos de Gestión:**
   - `components/GastoFijoModal.js`: Formulario con selector horizontal de iconos de Ionicons (Vivienda, Luz, Agua, Internet, Gas, etc.) y validaciones preventivas.
   - `components/GastoVariableModal.js`: Ajuste del sueldo mensual base y proyección de gastos variables.
3. **Pestañas Segmentadas en Mi Bolsa (`WalletScreen`):**
   - Alternancia entre "Vivienda fija" y "Vivienda variable" con recálculo dinámico de la liquidez.
4. **Limpieza Visual en `ExchangeRateCard.js`:**
   - Se removieron las etiquetas técnicas internas (`fetch` / `axios`), mostrando únicamente los datos limpios al usuario final (Dólar y Euro en PEN).
5. **Pantalla de Recuperación de Cuenta (`screens/ForgotPasswordScreen.js`):**
   - Flujo de 3 pasos (Ingreso de correo, código PIN de 4 dígitos con cuenta regresiva, y creación de nueva contraseña con checklist de seguridad).

---

## 3. Catálogo Verificado para la Sección "Desarrollo" del Informe Escrito

A continuación se detallan las **líneas exactas verificadas en el repositorio**, el código a capturar y el texto académico listo para colocar en el informe:

### 3.1. Navegación Híbrida (Stack Navigator y Bottom Tab Navigator)
- **Archivo a capturar (Código):** `navigation/AppNavigator.js`  
  - *Bloque 1 (Bottom Tabs):* Líneas 22 a 40 (Función `MainTabs`).  
  - *Bloque 2 (Native Stack):* Líneas 82 a 97 (Función `AppNavigator`).
- **Archivo de salida (Frontend):** Captura de pantalla de la barra inferior de navegación en la app y el cambio de pantalla.
- **Descripción para el informe:**
  > *"En cumplimiento del criterio de navegación de la Unidad 2, se estructuró un sistema de navegación híbrido mediante `@react-navigation/native-stack` y `@react-navigation/bottom-tabs`. La arquitectura combina un Stack principal que orquesta el ciclo de autenticación (`Login`, `Register`, `ForgotPassword`), la pantalla de carga progresiva (`Loading`) y la vista profunda de metas (`MetaDetalle`), anidando en su interior un `BottomTabNavigator` con una barra personalizada (`BottomTabBar`). Este desacoplamiento por rutas declarativas optimiza la memoria del dispositivo y ofrece transiciones fluidas sin colisiones de historial."*

### 3.2. Gestión del Ciclo de Vida y Estados con Hooks (`useState`, `useEffect`)
- **Archivo a capturar (Código):** `screens/LoginScreen.js`  
  - Líneas 28 a 60 (Declaración de estados con `useState`, temporizador regresivo con `useEffect` y lógica de intentos fallidos).
- **Archivo de salida (Frontend):** Captura del banner de bloqueo temporal con el temporizador activo tras 3 intentos erróneos.
- **Descripción para el informe:**
  > *"Se implementaron Hooks funcionales de React para administrar el estado local y los ciclos de vida de los componentes. Con `useState` se gestionan los campos de formulario, errores de validación y contadores de intentos fallidos. A través de `useEffect`, se implementó un temporizador de bloqueo de seguridad que decrece segundo a segundo cuando el usuario excede los intentos permitidos, sincronizando la liberación del componente al cumplirse el plazo e implementando una función de limpieza (`clearInterval`) para prevenir fugas de memoria al desmontar la vista."*

### 3.3. Consumo de API REST Externa con `fetch` y `axios`
- **Archivo a capturar (Código):** `services/api.js`  
  - Líneas 19 a 37 (Función `getRateWithFetch` con `AbortController`).  
  - Líneas 40 a 58 (Función `getRateWithAxios` con timeout).
- **Archivo de salida (Frontend):** Captura de la tarjeta `ExchangeRateCard` en `HomeScreen` mostrando el tipo de cambio del Dólar (USD) y del Euro (EUR) en soles peruanos.
- **Descripción para el informe:**
  > *"Para la integración de servicios web externos se implementó el módulo `services/api.js`, consumiendo datos en tiempo real de la API pública 'ExchangeRate-API' (`open.er-api.com`). Se aplicó un enfoque comparativo: el consumo de la divisa USD mediante la función nativa `fetch` con `AbortController` (timeout preventivo de 8 segundos), y el consumo de la divisa EUR mediante el cliente `axios`. Ambas rutinas encapsulan bloques `try/catch` para capturar errores de red y derivar automáticamente la respuesta hacia un mock local estructurado en formato JSON (`exchangeRatesMock.json`), garantizando la resiliencia del aplicativo en escenarios offline."*

### 3.4. Hook Personalizado de Consumo Asíncrono (`useExchangeRate`)
- **Archivo a capturar (Código):** `hooks/useExchangeRate.js`  
  - Líneas 4 a 45 (Hook `useExchangeRate` completo con manejo de estados y función `reload`).
- **Archivo de salida (Frontend):** Captura de la tarjeta de divisas durante el estado de carga (`ActivityIndicator`) o tras presionar el botón de recarga.
- **Descripción para el informe:**
  > *"Con el objetivo de desacoplar la lógica de red de la capa visual, se diseñó el Custom Hook `useExchangeRate`. Este hook gestiona integralmente la asincronía mediante tres estados condicionales: carga (`loading`), error (`error`) y datos procesados (`rate`). La implementación utiliza `useCallback` para exponer una función `reload` que permite al usuario actualizar las tasas bajo demanda, controlando la suscripción mediante un flag booleano que cancela actualizaciones sobre componentes ya desmontados."*

### 3.5. Persistencia Local con `AsyncStorage` y Context API
- **Archivo a capturar (Código):** `context/AppDataContext.js`  
  - Líneas 56 a 75 (Declaración de estados persistidos con `usePersistentState`).  
  - Líneas 120 a 170 (Operaciones CRUD de gastos fijos y cálculo dinámico de liquidez).
- **Archivo de salida (Frontend):** Captura de la lista de metas o gastos fijos persistidos tras cerrar y reabrir la aplicación.
- **Descripción para el informe:**
  > *"La persistencia de información se implementó mediante `@react-native-async-storage/async-storage`, integrada al contexto global de la aplicación (`AppDataContext`). Cada entidad (metas, aportes, gastos fijos y presupuesto) se serializa en formato JSON y se almacena bajo claves compuestas que incluyen el identificador del usuario (`uid`). Esta arquitectura provee un funcionamiento completamente offline y privado, permitiendo que la liquidez real mensual (`montoLibre`) se recalcule instantáneamente a partir de los datos locales sin dependencias de servidores remotos."*

### 3.6. Renderizado Eficiente de Listas con `FlatList`
- **Archivo a capturar (Código):** `screens/WalletScreen.js`  
  - Líneas 248 a 267 (Definición del componente `FlatList` con `renderItem`, `ListHeaderComponent`, `ListFooterComponent` y `ListEmptyComponent`).
- **Archivo de salida (Frontend):** Captura de la sección **Mi Bolsa** (`WalletScreen`) mostrando las pestañas segmentadas, la lista de cuentas fijas (Alquiler, Luz, Agua, etc.) y los totales calculados al pie.
- **Descripción para el informe:**
  > *"En sustitución de contenedores estáticos, se implementó el componente nativo `FlatList` para renderizar el listado de gastos fijos del usuario. `FlatList` optimiza el rendimiento y consumo de memoria del dispositivo mediante la virtualización de celdas. La estructura integra `ListHeaderComponent` para la tarjeta de la cartera y pestañas segmentadas, `ListFooterComponent` para el balance de liquidez en soles, y `ListEmptyComponent` para la retroalimentación amigable en caso de no registrarse gastos aún."*

### 3.7. Formularios Modales y Componentes Reutilizables (`GastoFijoModal`)
- **Archivo a capturar (Código):** `components/GastoFijoModal.js`  
  - Líneas 27 a 60 (Lógica de validación y guardado).  
  - Líneas 90 a 125 (Selector horizontal interactivo de iconos).
- **Archivo de salida (Frontend):** Captura del modal emergente "Agregar gasto" con los iconos interactivos y campos de texto.
- **Descripción para el informe:**
  > *"Siguiendo los principios de modularidad y usabilidad (UI/UX), se construyó el componente `GastoFijoModal`. El componente incorpora `KeyboardAvoidingView` para garantizar la visibilidad de los campos en dispositivos con teclado táctil desplegado. Además, cuenta con validaciones preventivas de tipos de datos antes del envío (bloqueo de montos negativos o campos vacíos) y una barra horizontal deslizable para la asignación categórica de iconos vectoriales de Ionicons."*

---

## 4. Guión Recomendado para el Video Demostrativo (Canvas UTP)

1. **Introducción (30 seg):**
   - Presentación de los integrantes (Sebastián Tueros y Pablo Boza), carrera (Ingeniería de Software) y mención de los objetivos de la Unidad 2 (Hooks, Fetching fetch/axios, AsyncStorage y FlatList).
2. **Splash y Animación de Carga (30 seg):**
   - Mostrar el Splash inicial y la animación progresiva de 4 frames (25%, 50%, 75%, 100%) con la mascota Taqi.
3. **Autenticación y Seguridad (45 seg):**
   - Mostrar el Login e iniciar sesión con la cuenta de demostración precargada (`camila.rojas@gmail.com` / `Clave123!`).
   - Demostrar el bloqueo temporal por intentos erróneos y la pantalla de recuperación de contraseña.
4. **Consumo de API en Vivo (HomeScreen) (45 seg):**
   - Mostrar la tarjeta "Tipo de cambio hoy" con las cotizaciones reales del Dólar y del Euro.
   - Explicar brevemente que en `api.js` el Dólar se consulta mediante `fetch` nativo y el Euro mediante la librería `axios`, contando con un mock local JSON de respaldo para contingencias sin conexión.
   - Presionar el botón de recarga (icono refresh) para ver el indicador `ActivityIndicator` actualizando en tiempo real.
5. **Gestión de Metas y Gastos con FlatList y AsyncStorage (1 min):**
   - Entrar a **Metas**: Crear una meta nueva con el modal, registrar un aporte económico y observar el avance de la barra de progreso.
   - Entrar a **Mi Bolsa**: Mostrar el listado con `FlatList`, alternar entre "Vivienda fija" y "Vivienda variable", agregar un gasto nuevo con el modal de iconos y observar cómo el monto libre se actualiza en tiempo real.
6. **Persistencia (30 seg):**
   - Recargar o reiniciar la app en Expo para demostrar que todos los datos se conservan gracias a `AsyncStorage`.
7. **Cierre (15 seg):**
   - Conclusión sobre la arquitectura modular del aplicativo y cumplimiento del avance.
