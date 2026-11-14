# TAQI - Tu Oso de Confianza 🐻💰
**Aplicativo Móvil para la Gestión Integral de Ahorros y Control de Gastos Personales**

![React Native](https://img.shields.io/badge/React_Native-0.86.3-61DAFB?logo=react&logoColor=black)
![Expo SDK](https://img.shields.io/badge/Expo-57.0.0-000020?logo=expo&logoColor=white)
![React Navigation](https://img.shields.io/badge/React_Navigation-v7-6b52ae)
![AsyncStorage](https://img.shields.io/badge/Storage-AsyncStorage-blue)
![Axios](https://img.shields.io/badge/HTTP-Axios_%26_Fetch-5A29E4)

---

## 📌 Datos Generales del Proyecto
- **Institución:** Universidad Tecnológica del Perú (UTP)
- **Facultad:** Facultad de Ingeniería
- **Carrera:** Ingeniería de Software
- **Curso:** Desarrollo de Aplicaciones Móviles (Código: 32835)
- **Ciclo:** 2026 - Ciclo 2 Agosto
- **Docente:** David William Cota Sencara
- **Integrantes:**
  - **Sebastian Víctor Santino Tueros Fajardo** (U22201218)
  - **Pablo Adrian Boza Torres** (U22239512)

---

## 📖 Descripción del Proyecto
**TAQI** es una solución móvil multiplataforma desarrollada en **React Native** con el entorno de **Expo**, diseñada para devolver a las personas el control estricto y autónomo de sus finanzas personales. 

A diferencia de las alternativas del mercado que exigen vincular credenciales bancarias o presentan interfaces complejas y sobrecargadas, **TAQI** apuesta por:
1. **Registro manual y confidencial:** Los datos nunca salen sin el consentimiento del usuario ni dependen de entidades bancarias.
2. **Cálculo de liquidez real en tiempo real:** Separa de forma visual los ingresos totales de las obligaciones recurrentes (**gastos fijos y gastos variables**), aislando el monto libre disponible sin riesgo de sobreendeudamiento.
3. **Metas de ahorro estructuradas:** Planificación por objetivos con seguimiento visual del porcentaje de avance, historial de aportes y retroalimentación motivacional.
4. **Monitoreo macroeconómico:** Integración en vivo con APIs financieras para cotizaciones en soles peruanos (PEN) de divisas clave (Dólar estadounidense y Euro).

---

## 🎯 Objetivos del Avance de Proyecto Final 02 (APF2)
El presente entregable consolida los logros de aprendizaje de la **Unidad 2: Diseño y gestión de datos en aplicaciones móviles** (Semanas 6 a 10 del sílabo):

1. **Gestión de Ciclo de Vida y Estados con Hooks:**
   - Uso intensivo de Hooks fundamentales (`useState`, `useEffect`) y de optimización de rendimiento (`useCallback`, `useMemo`).
   - Desarrollo de Custom Hooks especializados: `usePersistentState` (sincronización reactiva con almacenamiento local) y `useExchangeRate` (gestión de asincronía, reintentos y estados de carga de APIs).
2. **Consumo de APIs REST (fetch y axios):**
   - Implementación dual para análisis comparativo: consumo de la API pública *ExchangeRate-API* (`open.er-api.com`) mediante `fetch` con control de timeout (`AbortController`) para USD/PEN y cliente `axios` para EUR/PEN.
   - Manejo robusto de errores (`try/catch`), estados visuales condicionales (`loading`, `error`, `success`) y fallback a un Mock local JSON (`constants/exchangeRatesMock.json`) ante contingencias offline.
3. **Persistencia Local con AsyncStorage:**
   - Almacenamiento desacoplado y multiusuario de sesiones activas, cuentas de usuario locales, historial de metas con aportes, configuración de actividades y catálogo dinámico de gastos fijos/variables.
4. **Navegación Híbrida Avanzada:**
   - Integración fluida de **React Navigation v7**, combinando **Native Stack Navigator** (Splash, Loading, Login, Registro, Recuperación de contraseña, Detalle de meta) con **Bottom Tab Navigator** personalizado con 5 pestañas activas.
5. **Optimización de Interfaz y Experiencia de Usuario (UI/UX):**
   - Adopción de componentes reutilizables de alto rendimiento como `FlatList` (con optimización de renderizado, `ListHeaderComponent`, `ListEmptyComponent`), `TouchableOpacity`, `TextInput`, `Modal`, `ActivityIndicator` y sistemas de diseño responsivos basados en Flexbox.

---

## 🎯 Objetivos del Avance de Proyecto Final 03 (APF3)
Entrega de la **Unidad 3** (semana 15): sensores del dispositivo, manejo de errores y rendimiento.

| Tema | Qué se implementó | Archivos |
| :--- | :--- | :--- |
| **Notificaciones locales (sensor)** | Recordatorio el día anterior al vencimiento de cada gasto fijo (9:00) y recordatorio diario de ahorro (20:00). Se activan desde Perfil con un interruptor, y hay un botón "Probar notificación" que llega a los 5 segundos. | `services/notifications.js`, `hooks/useReminders.js`, `utils/vencimientos.js`, `screens/ProfileScreen.js` |
| **Cámara (sensor)** | Foto del comprobante al registrar un aporte, con vista previa y miniatura en el historial. | `services/camera.js`, `components/AporteModal.js`, `screens/MetaDetalleScreen.js` |
| **Permisos** | Se piden en el momento de uso. Si se niegan, la app no se rompe: muestra un aviso y, si el sistema ya no deja preguntar, un botón para abrir los ajustes. | `services/notifications.js`, `services/camera.js` |
| **Manejo de errores** | `logger` con niveles (info, warn, error) y `ErrorBoundary` que muestra "Algo salió mal" con botón "Reintentar" en lugar de cerrar la app. | `services/logger.js`, `components/ErrorBoundary.js`, `App.js` |
| **Rendimiento** | `MetaCard` y `GastoRow` con `React.memo`; `renderItem` y handlers con `useCallback`. | `components/MetaCard.js`, `components/GastoRow.js` |
| **Datos y seguridad** | Día de vencimiento en los gastos fijos, bloqueo de login que persiste al cerrar la app, código de recuperación generado al azar y verificado (simulado en pantalla). | `components/GastoFijoModal.js`, `screens/LoginScreen.js`, `screens/ForgotPasswordScreen.js` |

**Cómo probar los sensores (en un celular con Expo Go, SDK 57):**
1. Perfil → activar el interruptor "Notificaciones" y aceptar el permiso → "Probar notificación" → minimizar la app: el aviso llega a los 5 segundos.
2. Metas → una meta → "Agregar aporte" → "Adjuntar foto del comprobante" → aceptar la cámara → guardar: la miniatura aparece en el historial.
3. Mi bolsa → editar un gasto y poner como vencimiento el día de mañana → Inicio muestra "vence mañana".

**Permisos que pide la app:** notificaciones (Android 13 o superior e iOS) y cámara. Las notificaciones son **locales** (las programa el propio teléfono, sin servidor); las notificaciones push remotas no funcionan en Expo Go en Android y quedan como mejora futura.

**Limitaciones conocidas:** las notificaciones y la cámara no están disponibles en la versión web; el simulador de iOS no tiene cámara; la ruta de la foto es temporal del sistema y podría perderse si se limpia la caché.

---

## 📁 Arquitectura del Repositorio
El proyecto sigue una estructura limpia, modular y orientada a la separación de responsabilidades (SoC):

```plaintext
Taqi_AppMovil/
├── assets/                    # Recursos visuales, logotipos e iconos de la app
├── components/                # Componentes de interfaz de usuario reutilizables
│   ├── AporteModal.js         # Modal para registrar abonos económicos a una meta
│   ├── AuthInput.js           # Campo de texto estilizado con iconos interactivos
│   ├── BottomTabBar.js        # Barra de navegación inferior con diseño personalizado
│   ├── ErrorBoundary.js       # Pantalla de respaldo "Algo salió mal" ante errores de dibujo
│   ├── ExchangeRateCard.js    # Componente visual para visualización de APIs financieras
│   ├── GastoFijoModal.js      # Modal para crear/editar obligaciones fijas con selección de iconos
│   ├── GastoRow.js            # Fila memoizada de un gasto fijo (editar y eliminar)
│   ├── GastoVariableModal.js  # Modal para presupuestar sueldo base y gastos variables
│   ├── MetaCard.js            # Tarjeta memoizada de una meta en la lista
│   ├── MetaFormModal.js       # Modal para creación y edición de metas de ahorro
│   ├── PasswordChecklist.js   # Validador visual dinámico de seguridad de credenciales
│   └── ProgressBar.js         # Barra de progreso porcentual configurable
├── constants/                 # Paleta de colores globales y datos mock
│   ├── colors.js              # Tokenización de colores corporativos TAQI
│   └── exchangeRatesMock.json # Mock local para contingencia y modo offline
├── context/                   # Context API para estado global reactivo
│   ├── AppDataContext.js      # Estado de metas, aportes, gastos y liquidez en tiempo real
│   └── AuthContext.js         # Estado de sesión de usuario y autenticación
├── hooks/                     # Custom Hooks para lógica desacoplada
│   ├── useExchangeRate.js     # Consumo asíncrono con control de carga, error y reintentos
│   ├── useReminders.js        # Programa los recordatorios locales según los datos del usuario
│   └── usePersistentState.js  # Estado persistente sincronizado con AsyncStorage
├── navigation/                # Configuración de rutas y flujo de pantallas
│   ├── AppNavigator.js        # Orquestador principal (Stack + Bottom Tabs)
│   └── rootNavigation.js      # Navegación imperativa desacoplada mediante refs
├── screens/                   # Pantallas principales del aplicativo
│   ├── ActivityScreen.js      # Sugerencias y catálogo de actividades de ahorro con FlatList
│   ├── ForgotPasswordScreen.js# Flujo de recuperación de contraseñas en 3 pasos
│   ├── HomeScreen.js          # Tablero principal: liquidez, consejos, alertas y divisas
│   ├── LoadingScreen.js       # Pantalla de carga con animación progresiva de 4 frames
│   ├── LoginScreen.js         # Autenticación, validación y bloqueo temporal por intentos
│   ├── MetaDetalleScreen.js   # Detalle de meta, historial de aportes y eliminación
│   ├── MetasScreen.js         # Listado dinámico de metas con FlatList y barra de progreso
│   ├── ProfileScreen.js       # Información del usuario autenticado y cierre de sesión
│   ├── SplashScreen.js        # Splash Screen inicial con branding TAQI
│   └── WalletScreen.js        # Gestión de liquidez, CRUD de gastos fijos y variables con FlatList
├── services/                  # Capa de comunicación de datos y almacenamiento
│   ├── api.js                 # Clientes fetch y axios con timeouts y fallback a mock
│   ├── authService.js         # Lógica de registro, autenticación local y restablecimiento
│   ├── camera.js              # Cámara para fotografiar comprobantes (con permisos)
│   ├── logger.js              # Registro de mensajes con niveles info, warn y error
│   ├── notifications.js       # Notificaciones locales, canal de Android y permisos
│   └── storage.js             # Módulo de operaciones seguras con AsyncStorage
├── utils/                     # Funciones auxiliares y de cálculo
│   ├── format.js              # Formateadores de moneda (PEN) y fechas localizadas
│   ├── metas.js               # Algoritmos de porcentaje y saldo acumulado
│   ├── passwordValidation.js  # Reglas de complejidad de contraseñas
│   └── vencimientos.js        # Próximo vencimiento y días restantes de un gasto fijo
├── App.js                     # Punto de entrada raíz de la aplicación con Providers
├── app.json                   # Manifiesto de configuración de Expo
└── package.json               # Dependencias del proyecto y scripts
```

---

## 🛠️ Tecnologías y Dependencias

| Dependencia | Versión | Propósito |
| :--- | :--- | :--- |
| **Expo** | `~57.0.21` | Plataforma de desarrollo y compilación ágil |
| **React Native** | `0.86.3` | Framework móvil multiplataforma |
| **React** | `19.2.3` | Librería base con soporte para Hooks modernos |
| **@react-navigation/native** | `^7.5.0` | Contenedor principal de rutas y navegación |
| **@react-navigation/native-stack** | `^7.20.0` | Navegación basada en pilas nativas |
| **@react-navigation/bottom-tabs** | `^7.20.0` | Navegación inferior por pestañas |
| **@react-native-async-storage/async-storage** | `2.2.0` | Persistencia de datos local sin conexión |
| **axios** | `^1.20.0` | Cliente HTTP basado en promesas para APIs REST |
| **@expo/vector-icons** | `^15.0.2` | Iconografía vectorial (Ionicons) |
| **react-native-safe-area-context** | `~5.7.0` | Manejo seguro de áreas de notch y márgenes de pantalla |
| **expo-notifications** | `~57.0.17` | Notificaciones locales y permisos |
| **expo-image-picker** | `~57.0.16` | Cámara para fotografiar comprobantes |

---

## 🚀 Guía de Instalación y Ejecución

### 1. Prerrequisitos
- Tener instalado **Node.js** (versión LTS 18 o superior recomendada).
- Tener instalado un emulador de Android (Android Studio) o un dispositivo físico con la app **Expo Go** instalada.

### 2. Clonar el repositorio
```bash
git clone https://github.com/sebastiansantinotuerosfajardo-ui/Taqi_AppMovil.git
cd Taqi_AppMovil
```

### 3. Instalar dependencias
```bash
npm install
# O mediante el CLI de expo:
npx expo install
```

### 4. Iniciar el servidor de desarrollo Expo
```bash
npx expo start
```

### 5. Ejecución en dispositivos
- **Dispositivo Físico:** Escanear el código QR que aparece en la terminal utilizando la aplicación **Expo Go** (Android) o la Cámara nativa (iOS).
- **Emulador Android:** Presionar la tecla `a` en la terminal tras iniciar el comando.
- **Simulador iOS:** Presionar la tecla `i` en la terminal.
- **Navegador Web (Pruebas de diseño):** Presionar la tecla `w`.

---

## 🔐 Registro e Inicio de Sesión
El sistema cuenta con persistencia local de cuentas mediante `AsyncStorage`. Para comenzar:
1. Dirígete a la opción **Crear cuenta** desde la pantalla de Login.
2. Ingresa tus datos de usuario (por ejemplo: correo `camila.rojas@gmail.com`, nombre de usuario `camila.rojas` y una contraseña segura como `Clave123!` que cumpla con los requisitos del checklist: mínimo 8 caracteres, 1 mayúscula, 1 número y 1 carácter especial).
3. Una vez creada la cuenta, quedará persistida en el dispositivo mediante `AsyncStorage` para futuros inicios de sesión automáticos.

---

## 🌿 Gestión de Versiones y Ramas Git
El proyecto aplica la estrategia de integración ágil mediante ramas de características (*Feature Branches*):
- `main`: Rama de producción y entregas oficiales.
- `feature/api-cambio`: Integración del consumo de API con `fetch` y `axios`, tarjeta de cambio de divisas y fallback a mock local.
- `feature/metas-crud`: Implementación del CRUD completo de metas de ahorro, detalle y aportes.
- `feature/storage-auth`: Implementación de persistencia de usuarios, sesiones y bloqueo de intentos con `AsyncStorage`.
- `feature/navigation`: Configuración y unificación de React Navigation Stack y Tab.
- `feature/loading-and-tabs`: Pantalla de carga animada y barra de pestañas personalizada.
- `feature/password-validation`: Validador dinámico de requisitos de contraseñas.

---
© 2026 **TAQI Team** - Universidad Tecnológica del Perú. Todos los derechos reservados.
