# Ejecución Simultánea de Entornos (Producción y Desarrollo)

Este documento detalla el procedimiento para mantener los entornos de **Producción** (Real) y **Desarrollo** levantados de forma simultánea en la misma máquina física, asegurando que cada uno de ellos apunte a una base de datos Oracle independiente.

---

## 1. Desafíos Técnicos y Estrategia de Aislamiento

Para ejecutar ambas instancias en paralelo sin interferencias ni errores, debemos aislar cuatro recursos clave:

| Recurso | Conflicto Potencial | Solución Implementada |
|---|---|---|
| **Nombre del Proyecto Compose** | Por defecto, Docker Compose agrupa los contenedores bajo el nombre de la carpeta raíz (`sga`). Levantar el segundo entorno sobrescribiría los contenedores del primero. | Utilizar el parámetro `-p` (o la variable `COMPOSE_PROJECT_NAME`) para definir namespaces distintos: `sga_prod` y `sga_dev`. |
| **Nombres de Contenedores** | Docker no permite dos contenedores con el mismo nombre en el mismo host. | Se han diferenciado los nombres en los ficheros YAML: producción usa `sga_backend` y `sga_pda`, mientras que desarrollo usa `sga_backend_dev` y `sga_pda_dev`. |
| **Puertos del Host** | Dos servicios no pueden escuchar en el mismo puerto del host (por ejemplo, el puerto `5000` o `8080` de Windows/Linux). | Mapear puertos del host diferentes usando variables de entorno interpoladas en `docker-compose.yml`. |
| **Configuración de Base de Datos** | Cada entorno necesita credenciales y DSN de Oracle distintos. | Utilizar archivos `.env` independientes: `.env.prod` para producción y `.env.dev` para desarrollo. |
| **Resolución de Nombres en Red** | Tanto el proxy Nginx (producción) como el proxy de Vite (desarrollo) enrutan las peticiones `/api/*` al hostname `backend:5000`. | Docker Compose crea una red virtual aislada por cada proyecto. Por lo tanto, el hostname `backend` dentro de la red `sga_prod` resolverá al contenedor de producción, y en `sga_dev` al de desarrollo. No se requiere cambiar el código del frontend. |

---

## 2. Configuración de Archivos de Entorno

Debemos crear dos archivos de variables de entorno en la raíz del proyecto: `g:\Proyectos\SGA\.env.prod` y `g:\Proyectos\SGA\.env.dev`.

### Archivo de Producción: `.env.prod`
Este archivo configurará el entorno real conectado a la base de datos de producción y utilizando los puertos estándar.

```bash
# ── Identificación del Proyecto ──────────────────────────────
COMPOSE_PROJECT_NAME=sga_prod

# ── Backend Flask ────────────────────────────────────────────
SECRET_KEY=cambiar-esto-por-una-clave-segura-en-produccion
AUDIT_LOG_ENABLED=True

# ── Puertos para Producción ──────────────────────────────────
BACKEND_PORT=5000
PDA_PORT=5173
PDA_CONTAINER_PORT=80

# ── Base de Datos Oracle de PRODUCCIÓN ────────────────────────
ORACLE_USER=usuario_produccion
ORACLE_PASSWORD=password_produccion
ORACLE_DSN=ip_servidor_prod:1521/prod_service_name
ORACLE_MIN=2
ORACLE_MAX=10
ORACLE_CLIENT_PATH=/opt/oracle/instantclient_19_19

# ── Sesiones y PDA ───────────────────────────────────────────
SESSION_TIMEOUT_MINUTES=30
```

### Archivo de Desarrollo: `.env.dev`
Este archivo configurará el entorno de desarrollo conectado a la base de datos de pruebas/desarrollo y utilizando puertos alternativos para evitar conflictos.

```bash
# ── Identificación del Proyecto ──────────────────────────────
COMPOSE_PROJECT_NAME=sga_dev

# ── Backend Flask ────────────────────────────────────────────
SECRET_KEY=clave-desarrollo-super-secreta
AUDIT_LOG_ENABLED=True

# ── Puertos para Desarrollo ──────────────────────────────────
# Mapea puertos libres diferentes para no chocar con producción
BACKEND_PORT=5001
PDA_PORT=5174
PDA_CONTAINER_PORT=5173

# ── Base de Datos Oracle de DESARROLLO / PRUEBAS ──────────────
ORACLE_USER=usuario_desarrollo
ORACLE_PASSWORD=password_desarrollo
ORACLE_DSN=ip_servidor_dev:1521/dev_service_name
ORACLE_MIN=1
ORACLE_MAX=5
ORACLE_CLIENT_PATH=/opt/oracle/instantclient_19_19

# ── Bypass NAT Docker para identificar Terminales en Dev ─────
DEV_DEFAULT_TERMINAL_IP=192.168.5.178

# ── Sesiones y PDA ───────────────────────────────────────────
SESSION_TIMEOUT_MINUTES=120
```

---

## 3. Comandos para Levantar los Entornos

Una vez creados los archivos `.env.prod` y `.env.dev`, se pueden levantar ambos entornos en paralelo mediante los siguientes comandos ejecutados desde la raíz del monorepo:

### A. Levantar Entorno de Producción (Real)
Utiliza la configuración base y carga las variables de producción:

```bash
docker compose -f docker-compose.yml --env-file .env.prod up -d --build
```
*   **Contenedores creados**: `sga_backend` y `sga_pda`.
*   **Red interna**: `sga_prod_default`.
*   **Acceso**:
    *   **Frontend (PDA Nginx)**: `http://localhost:5173`
    *   **Backend (API Flask)**: `http://localhost:5000`

### B. Levantar Entorno de Desarrollo
Utiliza la sobreescritura de desarrollo (para hot-reload de código) y carga las variables de desarrollo:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml --env-file .env.dev up -d --build
```
*   **Contenedores creados**: `sga_backend_dev` y `sga_pda_dev`.
*   **Red interna**: `sga_dev_default`.
*   **Acceso**:
    *   **Frontend (Vite Dev)**: `http://localhost:5174`
    *   **Backend (API Debug)**: `http://localhost:5001`

---

## 4. Comandos de Mantenimiento Individual

Es vital especificar siempre el archivo `--env-file` y el proyecto `-p` en los comandos de mantenimiento para evitar interactuar con el entorno equivocado.

### Ver Estado de los Contenedores
```bash
# Estado del entorno de producción
docker compose -p sga_prod ps

# Estado del entorno de desarrollo
docker compose -p sga_dev ps
```

### Ver Logs en Tiempo Real
```bash
# Logs del backend de desarrollo
docker compose -p sga_dev logs -f backend

# Logs del backend de producción
docker compose -p sga_prod logs -f backend
```

### Apagar un Entorno Específico
```bash
# Detener y limpiar el entorno de desarrollo sin tocar producción
docker compose -f docker-compose.yml -f docker-compose.dev.yml --env-file .env.dev down

# Detener producción
docker compose -f docker-compose.yml --env-file .env.prod down
```

---

## 5. Resumen de Direcciones de Acceso

Cuando ambos entornos estén activos simultáneamente en la máquina:

*   **Entorno Real (Producción)**:
    *   URL de la aplicación: [http://localhost:5173](http://localhost:5173)
    *   URL del Backend API: [http://localhost:5000/api](http://localhost:5000/api)
    *   Base de datos: Producción (`192.168.5.212`)
*   **Entorno de Desarrollo**:
    *   URL de la aplicación (con hot-reload): [http://localhost:5174](http://localhost:5174)
    *   URL del Backend API (con debug): [http://localhost:5001/api](http://localhost:5001/api)
    *   Base de datos: Pruebas (`192.168.5.180`)

> [!NOTE]
> Para conocer cómo aplicar cambios de código, probarlos en el entorno de desarrollo y posteriormente publicarlos en el entorno real (producción), consulta la guía [flujo-desarrollo.md](file:///g:/Proyectos/SGA/docs/interno/flujo-desarrollo.md).

---

## 6. Identificación de Terminales Físicos (Docker NAT en Windows)

Docker Desktop en Windows NAT-ea las conexiones entrantes, ocultando la IP real de cada terminal PDA.
El sistema utiliza una **cadena de 4 métodos** para resolver la IP, en orden de prioridad:

| Prioridad | Método | Velocidad | Descripción |
|---|---|---|---|
| **1** | `?terminal_ip=X.X.X.X` en URL | Síncrono | El bookmark de la PDA incluye su propia IP. Más fiable. |
| **2** | `window.__NGINX_IP__` | Síncrono | Nginx inyecta `$remote_addr` en el HTML via `sub_filter`. Funciona si Docker Desktop preserva la IP real (modo WSL2 mirrored). |
| **3** | `sessionStorage` | Síncrono | Reutiliza la IP detectada en la misma sesión de navegador. |
| **4** | WebRTC | Async (≤3s) | Fallback. Puede estar bloqueado en navegadores modernos o PDAs industriales. |

### Configuración recomendada de marcadores PDA

Configura el acceso directo de cada terminal físico con su IP en la URL.
De este modo la identificación es **síncrona, sin WebRTC y 100% fiable**:

```
Terminal 100 (192.168.5.178):  http://IP_SERVIDOR:5173/?terminal_ip=192.168.5.178
Terminal 110 (192.168.5.179):  http://IP_SERVIDOR:5173/?terminal_ip=192.168.5.179
```

### Variable `DEV_DEFAULT_TERMINAL_IP`

| Entorno | `.env.prod` | `.env.dev` |
|---|---|---|
| `DEV_DEFAULT_TERMINAL_IP` | ❌ **No definir** | ✅ `192.168.5.178` |

En producción esta variable **no debe existir**. Si está definida, todos los terminales sin IP identificada son tratados como el mismo terminal, impidiendo distinguirlos.
En desarrollo actúa como fallback cuando se trabaja desde localhost.

---

*Última actualización: 2026-07-20*
