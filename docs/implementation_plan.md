# Plan de Implementación: Cliente SGA para PDA Seypos

Este plan describe la arquitectura base, las herramientas y la estructura de la primera versión de la aplicación cliente para el Sistema de Gestión de Almacenes (SGA), optimizada para terminales PDA industriales Seypos con sistema Android.

## Decisiones Técnicas
- **Framework**: React (como PWA) utilizando Vite para el empaquetado y desarrollo rápido. Es ideal para PDAs con Android, permite despliegues rápidos y actualizaciones OTA (Over-The-Air) si se configura como PWA real.
- **Estilos**: Tailwind CSS. Siguiendo su petición de una UI rápida, de alto contraste y botones grandes sin CSS excesivo.
- **Peticiones HTTP**: Axios con interceptores. Nos permitirá gestionar globalmente la cabecera `Authorization: Bearer <token>` y redirigir al login en caso de recibir un 401.
- **Enrutamiento**: React Router v6 para manejar la navegación entre las 4 pantallas solicitadas.
- **Gestión de Estado y Scanner**: Context API o Custom Hooks (`useScanner`) para el manejo del estado global (token, permisos) y enfocar automáticamente los inputs correspondientes para el escáner "wedge".

## User Review Required

> [!IMPORTANT]  
> Por favor, revisa y aprueba este plan para proceder con la generación de código. Además, revisa las preguntas abiertas a continuación.

## Open Questions

> [!WARNING]  
> 1. Para instalar Tailwind CSS, ¿prefieres usar la última versión (v4) o la versión estable más común en entornos de React/Vite (v3.4)?
> 2. ¿Deseas que configure un mock de la API (por ejemplo, con MSW o un simple delay en las llamadas) para poder probar la aplicación sin tener el backend real levantado en esta fase?
> 3. En la regla global me indicaste "Mantén siempre la documentación actualizada en la ruta docs/interno". ¿Quieres que además de generar el código, genere en este mismo momento la documentación del proyecto dentro de esa ruta?

## Proposed Changes

### 1. Configuración del Proyecto y Dependencias
Crearemos el proyecto con `npx -y create-vite@latest ./ --template react` e instalaremos dependencias: `react-router-dom`, `axios`, `lucide-react` (para iconos), y `tailwindcss`.

### 2. Estructura de Componentes
#### [NEW] `src/App.jsx`
- Configuración de React Router.
- Manejo de rutas protegidas basado en la existencia del JWT en localStorage.

#### [NEW] `src/api/apiService.js`
- Configuración de la instancia de Axios.
- Interceptor de Request: Inyectar `Authorization: Bearer <token>`.
- Interceptor de Response: Capturar `401 Unauthorized` y limpiar estado / redirigir al Login.

#### [NEW] `src/hooks/useScannerFocus.js`
- Hook personalizado que utilizará `useRef` para mantener el foco en un input específico. Si el usuario toca otra parte de la pantalla (fuera de un input válido), el foco regresará automáticamente para asegurar que el escáner "wedge" siempre funcione.

### 3. Vistas (Pantallas)
#### [NEW] `src/views/Login.jsx`
- Formulario grande para Código de Operador y Contraseña.
- Llamada a `POST /api/auth/login`.
- Almacenamiento de token y permisos en `localStorage` (o Session/Context).
- Manejo visual de errores 401 y 404.

#### [NEW] `src/views/MainMenu.jsx`
- Menú condicional según los permisos `PRM_...` obtenidos en el login.
- Botón grande "Consulta de Stock por EAN".

#### [NEW] `src/views/StockQuery.jsx`
- Input de texto invisible o muy grande y centrado, siempre enfocado vía el hook `useScannerFocus`.
- Al detectar "Enter" (simulado por el escáner), ejecuta `GET /api/stock/ean/<ean>`.
- Redirección a la vista de resultados o muestra de error "EAN NO ENCONTRADO o SIN STOCK" en rojo.

#### [NEW] `src/views/StockResults.jsx`
- Tarjeta resumen con `articulo_comercial` y `nombre`.
- Lista de tarjetas para las `ubicaciones`, resaltando en grande la cantidad y la ubicación.
- Botón "Nueva Consulta" (grande y anclado abajo) para regresar a `StockQuery`.

### 4. Documentación Interna
#### [NEW] `docs/interno/arquitectura.md`
- Documentación de la estructura del proyecto y decisiones tomadas.

## Verification Plan

### Manual Verification
- Validar que al escanear un código (simulando "Enter"), la búsqueda se lance automáticamente sin necesidad de tocar un botón "Buscar".
- Validar la legibilidad (Alto contraste, tipografías legibles).
- Validar el flujo de autenticación y caducidad de sesión.
