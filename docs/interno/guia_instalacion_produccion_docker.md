# Guía de Instalación en Producción con Docker Desktop (Nuevo Cliente)

Esta guía detalla el procedimiento completo, paso a paso, para implementar el sistema **SGA (Sistema de Gestión de Almacenes)** en un entorno de producción sobre una máquina con **Windows y Docker Desktop** en las instalaciones de un nuevo cliente.

---

## 1. Arquitectura del Sistema en Producción

El proyecto está estructurado como un **Monorepo** compuesto por 4 servicios orquestados mediante Docker Compose:

```
                          ┌─────────────────────────────┐
                          │   Servidor Oracle Externo   │
                          │   (Base de Datos Cliente)   │
                          └──────────────▲──────────────┘
                                         │ Puerto 1521
                                         │ (Modo Thick / Instant Client 19c)
                          ┌──────────────┴──────────────┐
                          │         sga_backend         │
                          │      (API Flask / Python)   │
                          │      Puerto Host: 5000      │
                          └───────▲─────────────▲───────┘
                                  │             │
        Proxy Interno /api/       │             │ Proxy Interno /api/
        ┌─────────────────────────┴──┐       ┌──┴─────────────────────────┐
        │          sga_pda           │       │        sga_frontend        │
        │   (PDA React + Nginx)      │       │  (Backoffice React+Nginx)  │
        │    Puerto Host: 5173       │       │     Puerto Host: 5175      │
        └────────────────────────────┘       └────────────────────────────┘
        
        ┌────────────────────────────┐
        │         sga_kubica         │
        │    (Dashboard Next.js)     │
        │     Puerto Host: 3000      │
        └────────────────────────────┘
```

| Contenedor | Componente | Descripción | Puerto Host | Puerto Contenedor |
|---|---|---|---|---|
| `sga_backend` | Backend API | Flask (Python 3.11) + Oracle Instant Client 19c | `5000` | `5000` |
| `sga_pda` | Frontend PDA | App React servida por Nginx (terminales industriales) | `5173` | `80` |
| `sga_frontend` | Backoffice | Cuadro de mando y administración React por Nginx | `5175` | `80` |
| `sga_kubica` | Kubica | Dashboard y analítica (Next.js 16) | `3000` | `3000` |

---

## 2. Requisitos Previos en la Máquina Servidor

### A. Hardware Mínimo Recomendado
* **Procesador**: 4 núcleos (x86_64).
* **Memoria RAM**: 8 GB mínimo (16 GB recomendado para holgura de Docker y sistema operativo).
* **Almacenamiento**: Al menos 30 GB de espacio libre (preferiblemente SSD).

### B. Sistema Operativo
* **Windows 10 / Windows 11 (Pro o Enterprise de 64 bits)**, o **Windows Server 2022 / 2025**.
* La virtualización asistida por hardware (**Intel VT-x** o **AMD-V**) debe estar habilitada en la BIOS/UEFI.

### C. Conectividad de Red
* El servidor debe tener una **IP estática local** en la red del cliente (ej. `192.168.1.50`).
* Debe existir visibilidad y ruta directa hacia el servidor de base de datos Oracle (puerto `1521`).
* Verificar conectividad desde PowerShell:
  ```powershell
  Test-NetConnection -ComputerName <IP_SERVIDOR_ORACLE> -Port 1521
  ```
  *(Debe responder `TcpTestSucceeded : True`)*.

---

## 3. Paso 1: Instalación de WSL 2 y Docker Desktop

### 1.1. Instalar WSL 2 (Windows Subsystem for Linux)
Abre **PowerShell como Administrador** y ejecuta:

```powershell
wsl --install --no-distribution
```

Si WSL ya estaba instalado, asegúrate de actualizar el kernel a la última versión:
```powershell
wsl --update
```
> [!IMPORTANT]
> Si el instalador solicita reiniciar el equipo, reinicia antes de continuar.

### 1.2. Instalar Docker Desktop
1. Descarga el instalador oficial de [Docker Desktop para Windows](https://www.docker.com/products/docker-desktop/).
2. Ejecuta el instalador. Durante la instalación, marca la casilla **"Use WSL 2 instead of Hyper-V (recommended)"**.
3. Al finalizar, reinicia el equipo si el instalador lo solicita.
4. Abre Docker Desktop y acepta los términos de uso.

### 1.3. Ajuste de Recursos para WSL 2 (Recomendado)
Para evitar que WSL consuma el 100% de la memoria física del equipo, crea o edita el archivo `.wslconfig` en la carpeta de tu usuario Windows (`C:\Users\<TuUsuario>\.wslconfig`):

```ini
[wsl2]
memory=6GB
processors=4
swap=2GB
# En Windows 11 23H2+ o Server 2022+ con soporte mirrored:
# networkingMode=mirrored
```

Aplica los cambios ejecutando en PowerShell:
```powershell
wsl --shutdown
```
Y vuelve a abrir Docker Desktop.

### 1.4. Verificar funcionamiento de Docker
En PowerShell:
```powershell
docker --version
docker compose version
```

---

## 4. Paso 2: Despliegue de los Archivos del Proyecto

1. Copia o clona el repositorio del SGA en una carpeta del servidor sin espacios en la ruta, por ejemplo:
   ```
   C:\Proyectos\SGA
   ```
2. Asegúrate de que la estructura incluya los directorios principales:
   ```
   SGA/
   ├── backend/
   ├── frontend/
   ├── pda/
   ├── Kubica/
   ├── docs/
   ├── docker-compose.yml
   ├── .env.example
   └── .env.prod  <-- Crearemos este archivo en el siguiente paso
   ```

---

## 5. Paso 3: Configurar el Archivo de Entorno de Producción (`.env.prod`)

Crea el archivo `.env.prod` en la raíz del proyecto (`C:\Proyectos\SGA\.env.prod`).

> [!CAUTION]
> El archivo `.env.prod` contiene contraseñas reales y credenciales de acceso a la base de datos de producción. Nunca debe subirse al repositorio público de control de versiones.

Copia la siguiente plantilla y sustituye los valores específicos del cliente:

```bash
# ============================================================
# .env.prod — Configuración de Producción para Cliente
# ============================================================

# ── Identificación del Proyecto Compose ──────────────────────
COMPOSE_PROJECT_NAME=sga_prod

# ── Clave Secreta de Flask ───────────────────────────────────
# Generar una clave segura aleatoria para este cliente
SECRET_KEY=clave_generada_aleatoria_super_segura_32_caracteres

# ── Registro de Auditoría ────────────────────────────────────
AUDIT_LOG_ENABLED=True

# ── Puertos del Host Servidor ────────────────────────────────
BACKEND_PORT=5000
PDA_PORT=5173
PDA_CONTAINER_PORT=80
FRONTEND_PORT=5175
FRONTEND_CONTAINER_PORT=80

# ── Conexión a Base de Datos Oracle del Cliente ──────────────
# Ajustar según las credenciales suministradas por el cliente
ORACLE_USER=usuario_oracle_cliente
ORACLE_PASSWORD=password_oracle_cliente
ORACLE_DSN=192.168.1.200:1521/nombre_servicio_o_sid
ORACLE_MIN=2
ORACLE_MAX=10
ORACLE_CLIENT_PATH=/opt/oracle/instantclient_19_19

# ── Impresión de Etiquetas ───────────────────────────────────
PRINT_PDF_FOLDER=/app/print_queue

# ── Control de Sesiones en Terminales (minutos) ──────────────
SESSION_TIMEOUT_MINUTES=30
```

### Generación de `SECRET_KEY` aleatoria
Puedes generar una clave criptográfica de 32 bytes ejecutando en PowerShell:
```powershell
python -c "import secrets; print(secrets.token_hex(32))"
```
O con PowerShell nativo:
```powershell
-join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | ForEach-Object {[char]$_})
```

> [!WARNING]
> **ATENCIÓN CON LA VARIABLE `DEV_DEFAULT_TERMINAL_IP`**:
> Esta variable **NO** debe estar presente en `.env.prod`. En desarrollo sirve para falsear la IP de los terminales desde localhost, pero en producción causaría que todas las PDAs se identifiquen como el mismo terminal, bloqueando el trabajo de los operarios.

---

## 6. Paso 4: Inicialización de la Base de Datos Oracle (si aplica)

Si la base de datos de Oracle del cliente aún no tiene las tablas del módulo de informes configurables, ejecuta con un cliente SQL (SQL*Plus, DBeaver, PL/SQL Developer) conectado al usuario del SGA el script:

* Ruta en el proyecto: `backend/scripts/create_informes_tables.sql`

Este script creará las tablas `SGA_INFORMES_CONFIG`, `SGA_INFORMES_USUARIO` y sus secuencias asociadas.

---

## 7. Paso 5: Compilación y Puesta en Marcha (Build & Up)

Abre **PowerShell** y navega a la carpeta del proyecto:

```powershell
cd C:\Proyectos\SGA
```

Ejecuta el comando oficial de arranque en producción:

```powershell
docker compose -f docker-compose.yml --env-file .env.prod up -d --build
```

### ¿Qué hace este comando?
1. **Compila `sga_backend`**: Descarga e instala en el contenedor Debian las librerías nativas y el **Oracle Instant Client 19c** en modo Thick, e instala las dependencias de Python.
2. **Compila `sga_pda`**: Ejecuta `npm ci` y `npm run build` con Vite y genera la imagen ultraligera con Nginx.
3. **Compila `sga_frontend`**: Construye el Backoffice web para Nginx.
4. **Compila `sga_kubica`**: Compila el bundle de Next.js en modo standalone.
5. Inicia los 4 servicios en segundo plano (`-d`) respetando la dependencia de salud (`condition: service_healthy` del backend).

> [!NOTE]
> La primera construcción puede tardar entre 5 y 10 minutos dependiendo de la velocidad de descarga y CPU del equipo. Las subsiguientes serán instantáneas gracias a la caché de Docker.

---

## 8. Paso 6: Verificación y Pruebas del Sistema

### 8.1. Comprobar estado de los contenedores
```powershell
docker compose -p sga_prod ps
```
Todos los contenedores deben mostrar estado `Up` (y el backend `Up (healthy)`):
```
NAME           IMAGE               COMMAND                  SERVICE      STATUS                    PORTS
sga_backend    sga-backend         "python run.py"          backend      Up (healthy)              0.0.0.0:5000->5000/tcp
sga_pda        sga-pda             "nginx -g 'daemon of…"   pda          Up                        0.0.0.0:5173->80/tcp
sga_frontend   sga-frontend        "nginx -g 'daemon of…"   frontend     Up                        0.0.0.0:5175->80/tcp
sga_kubica     sga-kubica          "node server.js"         kubica       Up                        0.0.0.0:3000->3000/tcp
```

### 8.2. Comprobar los logs del Backend
Verifica que la conexión con el servidor Oracle se haya establecido sin errores:
```powershell
docker compose -p sga_prod logs -n 50 backend
```
Si la conexión es exitosa, no verás errores del tipo `ORA-XXXXX`.

### 8.3. Probar el Endpoint de Salud
Ejecuta desde PowerShell:
```powershell
Invoke-RestMethod http://localhost:5000/health
```
Respuesta esperada:
```json
{
  "service": "sga-backend",
  "status": "ok"
}
```

### 8.4. Comprobar accesos locales en el navegador
Abre el navegador en el servidor:
* **Terminal PDA (Almacén)**: [http://localhost:5173](http://localhost:5173)
* **Backoffice (Administración)**: [http://localhost:5175](http://localhost:5175)
* **Kubica (Dashboard)**: [http://localhost:3000](http://localhost:3000)

---

## 9. Paso 7: Configuración del Firewall y Conexión de Terminales PDA

Para que los ordenadores de oficina y las PDAs industriales de almacén puedan acceder al sistema alojado en el servidor, debes abrir los puertos en el Firewall de Windows.

### 9.1. Reglas de Firewall de Windows
Ejecuta en **PowerShell como Administrador** en el servidor:

```powershell
# Permitir acceso al Frontend PDA (5173)
New-NetFirewallRule -DisplayName "SGA - PDA (Puerto 5173)" -Direction Inbound -LocalPort 5173 -Protocol TCP -Action Allow

# Permitir acceso al Backoffice (5175)
New-NetFirewallRule -DisplayName "SGA - Backoffice (Puerto 5175)" -Direction Inbound -LocalPort 5175 -Protocol TCP -Action Allow

# Permitir acceso a Kubica (3000)
New-NetFirewallRule -DisplayName "SGA - Kubica (Puerto 3000)" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow
```

### 9.2. Identificación de Terminales Físicos (Docker NAT en Windows)
Docker Desktop en Windows NAT-ea las peticiones que provienen de la red local (WiFi de almacén), reemplazando la IP origen de la PDA por la IP de la puerta de enlace interna de Docker.

Para que el backend reconozca inequívocamente a cada terminal físico y sus permisos de almacén:

1. **Configurar los Marcadores o Accesos Directos en las PDAs**:
   En el navegador de cada PDA física (Chrome, Edge o Enterprise Browser del fabricante Zebra/Honeywell/Datalogic), añade como marcador la URL con el parámetro `terminal_ip`:
   ```
   http://<IP_SERVIDOR_SGA>:5173/?terminal_ip=<IP_DE_ESTA_PDA>
   ```
   *Ejemplo real:*
   * **PDA 01 (IP 192.168.1.101)**: `http://192.168.1.50:5173/?terminal_ip=192.168.1.101`
   * **PDA 02 (IP 192.168.1.102)**: `http://192.168.1.50:5173/?terminal_ip=192.168.1.102`

2. **Autorización en Base de Datos**:
   Asegúrate de que las IPs configuradas en las PDAs estén dadas de alta en la tabla de terminales autorizados del SGA en Oracle.

---

## 10. Paso 8: Configuración de Auto-Arranque con el Sistema Operativo

Para que el sistema SGA se levante automáticamente ante un reinicio del servidor:

1. **Ajustes de Docker Desktop**:
   * Abre Docker Desktop.
   * Ve a **Settings (icono de engranaje) -> General**.
   * Marca la casilla **"Start Docker Desktop when you sign in to your computer"**.
2. **Política de reinicio de contenedores**:
   * En `docker-compose.yml`, todos los servicios ya cuentan con `restart: unless-stopped`, por lo que Docker reactivará automáticamente los contenedores en cuanto el servicio de Docker esté arriba.
3. **Inicio de sesión automático del usuario de Windows (Opcional pero recomendado para servidores desatendidos)**:
   * Configura la sesión de Windows del servidor para que inicie sesión automáticamente tras un reinicio (`netplwiz`), o utiliza una tarea programada de Windows.

---

## 11. Guía de Operaciones y Mantenimiento

### Ver el estado de los contenedores
```powershell
docker compose -p sga_prod ps
```

### Ver logs en tiempo real
```powershell
# Todos los contenedores
docker compose -p sga_prod logs -f

# Solo el backend
docker compose -p sga_prod logs -f backend

# Solo la PDA
docker compose -p sga_prod logs -f pda
```

### Reiniciar un contenedor específico
```powershell
# Reiniciar el backend tras un cambio de configuración
docker compose -p sga_prod restart backend
```

### Detener el sistema completo
```powershell
docker compose -f docker-compose.yml --env-file .env.prod down
```

### Actualizar el sistema a una nueva versión
Cuando se suministre una actualización de código:
```powershell
cd C:\Proyectos\SGA

# Si se usa Git:
git pull origin main

# Reconstruir y levantar los contenedores actualizados sin perder estado
docker compose -f docker-compose.yml --env-file .env.prod up -d --build
```

---

## 12. Resolución de Problemas Frecuentes (Troubleshooting)

### 🔴 Error: `ORA-12170: TNS:Connect timeout occurred` o `ORA-12541: TNS:no listener`
* **Causa**: El contenedor backend no puede alcanzar la base de datos Oracle en la IP y puerto especificados.
* **Solución**:
  1. Verifica que la variable `ORACLE_DSN` en `.env.prod` tenga el formato exacto `IP:PUERTO/NOMBRE_SERVICIO`.
  2. Comprueba si el firewall del servidor Oracle bloquea la IP del host Windows.
  3. Ejecuta desde el host: `Test-NetConnection -ComputerName <IP_ORACLE> -Port 1521`.

### 🔴 Error: `ports are not available: bind: address already in use`
* **Causa**: Otro programa en Windows está ocupando uno de los puertos (`5000`, `5173`, `5175` o `3000`).
* **Solución**:
  1. Averigua qué proceso lo usa:
     ```powershell
     Get-Process -Id (Get-NetTCPConnection -LocalPort 5000).OwningProcess
     ```
  2. Si es necesario, cambia el puerto mapeado en `.env.prod` (por ejemplo, `BACKEND_PORT=5050`) y reinicia.

### 🔴 Los contenedores `pda` y `frontend` se quedan esperando `backend` ("unhealthy")
* **Causa**: El backend tarda en arrancar o falla al conectar a Oracle.
* **Solución**:
  1. Inspecciona el log del backend: `docker compose -p sga_prod logs backend`.
  2. Si hay un error de importación o de credenciales de Oracle, corrígelo en `.env.prod` y reconstruye.

### 🔴 El terminal PDA reporta `403 Forbidden` / "Terminal no autorizado"
* **Causa**: El sistema no reconoce la IP del terminal o no está dada de alta en las tablas de terminales del SGA.
* **Solución**:
  1. Revisa si el marcador de la PDA incluye `?terminal_ip=X.X.X.X`.
  2. Revisa el endpoint de monitorización en el servidor:
     `http://localhost:5000/admin/conexiones`
  3. Da de alta la IP correspondiente en la base de datos de Oracle.

---

*Documentación interna SGA — Última actualización: Octubre 2026*
