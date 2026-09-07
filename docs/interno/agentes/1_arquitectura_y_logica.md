# Arquitectura y Lógica del Sistema (SGA)

El proyecto SGA (Sistema de Gestión de Almacén) es un monorepo dividido en tres aplicaciones principales.

## 🐳 Infraestructura (Docker)
El entorno está completamente dockerizado. Existen dos grupos de contenedores (Producción y Desarrollo):
- **Desarrollo**: `sga_frontend_dev`, `sga_backend_dev`, `sga_pda_dev`
- **Producción**: `sga_frontend`, `sga_backend`, `sga_pda`

**REGLA CRÍTICA PARA AGENTES**: Nunca instalar dependencias (`npm install`, `pip install`) directamente sobre el sistema host Windows. Si se añade una dependencia nueva al código, se debe ejecutar la instalación internamente en el contenedor afectado (ej. `docker exec sga_frontend_dev npm install...`) y reiniciarlo (`docker restart sga_frontend_dev`).

## 1. Backend (API Flask / Python)
Ubicación: `backend/app/`
El backend actúa como servidor central de datos e intermediario seguro con la base de datos Oracle. Sigue el patrón **Capas de Dominio (Clean Architecture)**:

- **`routes/` (Controladores)**: Su única responsabilidad es recibir peticiones HTTP, parsear cabeceras, extraer tokens/IPs (`flask.request`) y devolver JSON. No deben contener lógica de negocio.
- **`services/` (Reglas de Negocio)**: El cerebro de la aplicación. Aquí se aplican las reglas logísticas, validaciones, cálculos, etc. **Regla de Oro**: Ningún servicio debe importar o conocer el objeto `flask.request`. Deben recibir variables primitivas de las rutas.
- **`repositories/` (Capa de Acceso a Datos - DAL)**: Única capa autorizada para ejecutar SQL (DML/DDL) y hablar con Oracle. 

## 2. Frontend (Supervisión Web)
Ubicación: `frontend/`
Aplicación web en **React 19 + Vite** para jefes de almacén y oficinas.

- **Estructura Modular**: Basada en un componente `Layout.jsx` central y vistas independientes (`views/Dashboard.jsx`, `views/Entradas.jsx`, etc.).
- **Estado**: Las vistas gestionan su propio estado de carga y renderizado, evitando que la navegación superior congele la pantalla completa.
- **Red**: Todas las peticiones deben pasar por `src/api/adminApi.js`, que intercepta errores y centraliza la configuración de Axios.

## 3. PDA (Terminales Móviles de Almacén)
Ubicación: `pda/`
SPA en **React 18 + Vite + Tailwind** diseñada para pantallas pequeñas táctiles, operadas con guantes o escáneres físicos.

- **UX/Accesibilidad**: Los botones y listas deben ser grandes (`p-4` mínimo).
- **Red y Offline**: Conexión a redes Wi-Fi inestables. Utiliza hooks como `useOnlineStatus` y reintentos (Axios Retry) para no interrumpir el flujo.
- **Modularidad**: Componentes genéricos (`ConfirmDialog`) deben usarse siempre. Evitar modales bloqueantes nativos del navegador.
