# Guía de Trabajo con Docker - SGA_BACKEND

Esta guía detalla la estructura del proyecto y los pasos necesarios para trabajar, desarrollar y desplegar la aplicación utilizando contenedores Docker de manera eficiente.

---

## 1. Estructura del Proyecto

A continuación se detalla la arquitectura de archivos del backend de SGA:

```text
SGA_BACKEND/
│
├── app/                          # Directorio principal del código de la aplicación
│   ├── routes/                   # Definición de rutas y endpoints de la API (Controladores)
│   │   ├── __init__.py
│   │   └── auth_routes.py        # Endpoints para la autenticación
│   │
│   ├── services/                 # Lógica de negocio e interacción directa con la base de datos
│   │   ├── __init__.py
│   │   └── auth_service.py       # Lógica de autenticación y consultas SQL
│   │
│   ├── utils/                    # Funciones y módulos auxiliares reutilizables
│   │   └── __init__.py
│   │
│   ├── __init__.py               # Inicialización de la app de Flask y registro de blueprints
│   ├── config.py                 # Carga, tipado y validación estricta de variables de entorno
│   └── database.py               # Gestión del pool de conexiones con Oracle Database
│
├── docs/                         # Documentación del proyecto (Excluido en .gitignore)
│   └── guia_docker.md            # Esta guía de referencia
│
├── .dockerignore                 # Exclusiones para optimizar el tamaño de la imagen Docker
├── .env.example                  # Plantilla de variables de entorno necesarias para arrancar
├── .gitignore                    # Exclusiones de archivos para el control de versiones Git
├── Dockerfile                    # Instrucciones de compilación del contenedor de la aplicación
├── docker-compose.yml            # Configuración de Docker Compose para el entorno de desarrollo
├── requirements.txt              # Dependencias de Python requeridas para la aplicación
└── run.py                        # Punto de entrada de ejecución del servidor Flask
```

---

## 2. Requisitos Previos

Antes de comenzar, asegúrate de tener instalado en tu máquina:
- **Docker Desktop** (o Docker Engine en entornos Linux).
- **Docker Compose** (generalmente incluido con Docker Desktop).

---

## 3. Pasos para Trabajar con Docker

### Paso 1: Configurar las Variables de Entorno
La aplicación valida estrictamente la existencia de credenciales de base de datos al arrancar. Crea tu archivo de configuración `.env` a partir de la plantilla:

```bash
# Copia la plantilla
cp .env.example .env
```

Abre el archivo `.env` creado y edita los valores con las credenciales de tu base de datos Oracle:
```env
SECRET_KEY=clave_secreta_para_sesiones
ORACLE_USER=usuario_sga
ORACLE_PASSWORD=clave_sga
ORACLE_DSN=host_de_tu_bd:1521/nombre_servicio
ORACLE_MIN=1
ORACLE_MAX=5
```

### Paso 2: Construir la Imagen de Docker
Para compilar la imagen local por primera vez o tras haber modificado el archivo `requirements.txt`:

```bash
docker compose build
```

### Paso 3: Levantar la Aplicación
Para iniciar el contenedor en segundo plano (modo "detached"):

```bash
docker compose up -d
```
Esto iniciará la aplicación en el puerto **5000** de tu máquina local (`http://localhost:5000`).

### Paso 4: Consultar los Logs en Tiempo Real
Para verificar que la aplicación Flask y el pool de Oracle se hayan iniciado correctamente:

```bash
docker compose logs -f web
```

### Paso 5: Apagar y Detener los Contenedores
Para apagar los contenedores sin borrar las imágenes construidas:

```bash
docker compose down
```

---

## 4. Conceptos Clave del Entorno Docker

### Modo Thick de Oracle (`oracledb`) e Integración con Oracle 10g
Debido a que la base de datos del sistema está bajo **Oracle 10g**, es mandatorio utilizar el **Modo Thick** (modo grueso) de la librería `python-oracledb`. El modo Thin moderno solo es compatible con bases de datos Oracle 12.1 o superiores y carece del soporte para los antiguos protocolos de encriptación y verificado de contraseñas de Oracle 10g.
- **Instant Client 19c:** Se instala automáticamente dentro del contenedor en la ruta `/opt/oracle/instantclient_19_19`. Aunque es de la versión 19c, es compatible hacia atrás con servidores de bases de datos 10g a nivel de red (capa SQL*Net).
- **Registro global con ldconfig:** Para asegurar que el contenedor localice la librería `libclntsh.so` de manera nativa e infalible, la ruta se registra globalmente en `/etc/ld.so.conf.d/oracle-instantclient.conf` y se ejecuta `ldconfig` en el proceso de compilación.
- **Compatibilidad con libaio (Debian):** Las distros de prueba modernas de Debian (como Trixie en `python:3.11-slim`) reemplazan el paquete clásico `libaio1` por `libaio1t64`. El Dockerfile crea automáticamente un enlace simbólico de compatibilidad para evitar el error de enlace dinámico del cliente Oracle que busca estrictamente `libaio.so.1`.
- **Desarrollo en local (Windows):** Si deseas correr la aplicación directamente en tu máquina host sin Docker con `python run.py`, deberás descargar el Instant Client de Oracle para Windows y configurar su ruta física en la variable `ORACLE_CLIENT_PATH` de tu archivo `.env` personal.

### Desarrollo en Caliente con Volúmenes
En el archivo `docker-compose.yml` se ha configurado el mapeo de volumen:
```yaml
volumes:
  - .:/app
```
Esto significa que cualquier cambio que realices en el código local de tu editor (en la carpeta `app/` o `run.py`) se reflejará inmediatamente en el contenedor en tiempo real, gracias a que Flask está corriendo en modo debug. **No necesitas reconstruir ni reiniciar el contenedor para ver tus cambios de código.**

### Optimización de Python en Docker
En el `Dockerfile` se configuran dos variables de entorno clave:
- `PYTHONDONTWRITEBYTECODE=1`: Evita que Python escriba archivos `.pyc` de caché en el disco del contenedor.
- `PYTHONUNBUFFERED=1`: Evita que Python almacene en caché los flujos de salida de texto (stdout/stderr). Esto hace que los logs de Flask se muestren en la consola de Docker de manera inmediata sin retrasos.

---

## 5. Glosario de Comandos Útiles

| Objetivo | Comando |
| :--- | :--- |
| **Construir la imagen de cero sin caché** | `docker compose build --no-cache` |
| **Levantar y reconstruir en un solo comando** | `docker compose up -d --build` |
| **Ingresar a la terminal interna del contenedor** | `docker compose exec web bash` |
| **Ver el estado y recursos de los contenedores** | `docker stats` |
| **Eliminar contenedores y volúmenes huérfanos** | `docker compose down -v` |
