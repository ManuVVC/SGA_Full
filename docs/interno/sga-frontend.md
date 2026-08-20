# SGA Frontend Backoffice — Panel de Gestión Logística v2.5

> **Estado**: Implementado (v2.5 — Navegación Omnidireccional & Login Web)  
> **Contenedor Docker**: `sga_frontend` / `sga_frontend_dev`  
> **Puerto Desarrollo (Host)**: `5176` (mapeado al 5175 interno de Vite)  
> **Puerto Producción (Host)**: `5175` (mapeado al 80 interno del contenedor Nginx)  
> **Tecnología**: Vite + React 19 + Vanilla CSS (Glassmorphism & Cyber-Nebula Dark Mode)

---

## 1. Propósito y Visión Arquitectónica

Dentro del ecosistema SGA, existen dos clientes web diferenciados para cubrir las necesidades físicas y operativas del almacén de alimentación:

| Contenedor | Aplicación | Público Objetivo | Hardware / Entorno |
|---|---|---|---|
| `sga_pda` | **Cliente Operativo PDA** | Operarios de almacén | Terminales de escaneo portátiles, pantallas pequeñas (RF), teclado numérico, validación por código numérico y PIN (`TerminalNoAutorizado`). |
| `sga_frontend` | **SGA Backoffice** | Jefes de almacén, supervisores, administración y atención al cliente | Monitores de PC en oficina, pantallas grandes, tablets de supervisión. Interfaz rica, omnidireccional, visual y analítica conectada en tiempo real. |

---

## 2. Nueva Arquitectura Omnidireccional (v2.5)

Para superar la lentitud del tradicional menú lateral monodireccional, la versión 2.5 introduce una arquitectura de navegación dinámica e instantánea:

### ⚡ 1. Buscador Universal Command Palette (`Ctrl + K`)
- Barra de búsqueda global accesible en todo momento mediante teclado (`Ctrl + K`) o clic.
- Filtra albaranes de entrada (`ALB-`), pedidos de salida (`PED-`), lotes de trazabilidad, códigos EAN y **Código Real de Fabricante (Parámetro 1690)** de forma transversal sin cambiar de contexto.

### 🏛️ 2. Los 4 Centros de Mando Logísticos (*Omni-Dock Pillars*)
El sistema se organiza en 4 pilares operativos visuales que permiten conmutar flujos logísticos en 1 clic:
1. 🟢 **ENTRADAS (Inbound)**: Gestión de compras a proveedores (albaranes) y devoluciones de clientes (logística inversa), con indicadores visuales de caducidad agroalimentaria.
2. 🟣 **SALIDAS (Outbound)**: Cola de picking, rutas de transporte, devoluciones a proveedor (merma) y pedidos directos *"Pedido de cliente al vuelo"* (Movimiento 10 / Cross-Docking para perecederos).
3. 🔵 **LOGÍSTICA & STOCK**: Catálogo maestro en Oracle DB con soporte nativo para Parámetro 1690 (Código Real de Fabricante) y mapa térmico 2D de cámaras frigoríficas (Seco, Frío y Congelado -20°C).
4. 🟡 **SGA ESTADÍSTICAS**: Auditoría en vivo de sesiones RF conectada al singleton `SessionManager`, monitorización de terminales PDA y estado de colas de impresión PDF (`PRINT_PDF_FOLDER`).

### 📑 3. Paneles Deslizantes Contextuales (*Slide-Over Drawers*)
- Al hacer clic en cualquier registro en las tablas de datos, se despliega un panel lateral derecho flotante.
- Muestra el detalle operativo del lote, ubicación en muelle o pasillo y fecha de caducidad.
- Ofrece botones de acción rápida: **Lanzar Traspaso de Lote**, **Imprimir Etiqueta Palet (PDF)** y **Reportar Incidencia/Merma de Lote**.

---

## 3. Autenticación Web Alfanumérica en Oracle DB (`/api/auth/login-web`)

A diferencia de las PDAs físicas que requieren estar registradas en `GSM.TMST_TERMINALES` y validan por `CODOPERADOR` numérico, el backoffice web dispone de un mecanismo de login propio e independiente:

- **Endpoint**: `POST /api/auth/login-web`
- **Parámetros**: `nombre` (o `username`) y `password`.
- **Lógica de Repositorio (`AuthRepository.get_operador_por_nombre`)**: Consulta en tiempo real la tabla `GSM.TMST_OPERADORES` buscando por nombre (insensible a mayúsculas/minúsculas usando `UPPER(TRIM(NOMBRE))`).
- **Terminal Genérico Web**: Al acceder desde navegadores en PC de oficina, el servicio (`AuthService.login_web`) asigna automáticamente el terminal virtual `WEB-CONSOLE`, previniendo errores por IP no registrada y garantizando un acceso corporativo fluido.

---

## 4. Arquitectura Docker & Proxy Nginx

El servicio utiliza un **build multi-stage** en Docker (`Dockerfile`):

```
Navegador PC/Tablet (http://localhost:5175 prod / 5176 dev)
        │
        ▼
┌───────────────────────────────┐     /api/* o /admin/*     ┌──────────────────────┐
│  Nginx (Prod) / Vite (Dev)    │ ────────────────────────► │  Flask :5000 / 5001  │
│  Contenedor: sga_frontend     │                           │  Contenedor: backend │
│  (Host Port: 5175 / 5176)     │ ◄──────────────────────── │                      │
└───────────────────────────────┘                           └──────────────────────┘
```

- En **Desarrollo** (`docker-compose.dev.yml`): Se levanta el servidor de Vite en el puerto `5175` interno (mapeado al **`5176`** del host en `.env.dev`).
- En **Producción** (`docker-compose.yml`): Nginx sirve el bundle optimizado en `/usr/share/nginx/html` en el puerto **`5175`** del host y proxia automáticamente `/api/` y `/admin/` hacia el backend Flask.

---

## 5. Comandos de Ejecución

### Arrancar en modo Desarrollo (con Hot-Reload y BD Oracle dev)
```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml --env-file .env.dev up -d sga_frontend_dev
# URL en Docker Dev: http://localhost:5176
```

### Construir y desplegar en Producción
```bash
docker compose up --build -d frontend
# URL en Producción: http://localhost:5175
```
