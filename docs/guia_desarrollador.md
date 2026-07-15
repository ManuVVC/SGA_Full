# Guía Técnica del Desarrollador - SGA Backend

Esta guía está diseñada para los desarrolladores y mantenedores de la aplicación backend del **SGA (Sistema de Gestión de Almacenes)**. Detalla la arquitectura de software, la configuración del entorno, las particularidades técnicas de la base de datos Oracle y proporciona directrices claras para extender el sistema.

---

## 1. Arquitectura y Patrón de Diseño

La aplicación sigue una arquitectura limpia en capas basada en el patrón **Controller-Service-Repository (Controlador-Servicio-Repositorio)** sobre el framework de Flask. Esto promueve una separación de responsabilidades estricta y facilita el mantenimiento y escalabilidad del backend.

```text
  [ Petición HTTP ]
         │
         ▼
 ┌───────────────┐
 │  Controllers  │  --> Define los endpoints, procesa solicitudes HTTP,
 │   (Routes)    │      maneja excepciones y retorna respuestas JSON.
 └───────┬───────┘
         │ (Llama a)
         ▼
 ┌───────────────┐
 │   Services    │  --> Contiene la lógica de negocio, cálculos, validaciones,
 │  (Negocio)    │      y la generación de tokens JWT.
 └───────┬───────┘
         │ (Llama a)
         ▼
 ┌───────────────┐
 │ Repositories  │  --> Encapsula el acceso directo a la base de datos Oracle.
 │   (Acceso BD) │      Ejecuta queries y procesa los cursores.
 └───────┬───────┘
         │ (Consulta)
         ▼
 ┌───────────────┐
 │  Base de Dat. │  --> Oracle Database (10g / GSM Schema).
 └───────────────┘
```

### 1.1. Capas del Proyecto

* **Rutas / Controladores (`app/routes/`)**: Los blueprints de Flask se encargan de enrutar las peticiones web. No contienen lógica de base de datos ni lógica compleja de negocio; su rol es invocar al servicio correspondiente y estructurar las respuestas HTTP.
* **Servicios (`app/services/`)**: Centraliza las reglas de negocio de la aplicación. Es la capa intermedia que coordina llamadas a repositorios, realiza validaciones complejas de entrada y genera respuestas lógicas listas para ser consumidas por los controladores.
* **Repositorios (`app/repositories/`)**: Gestiona la interacción con la base de datos de Oracle. Son clases estáticas que adquieren conexiones del pool, ejecutan sentencias SQL parametrizadas, procesan filas devueltas y liberan las conexiones inmediatamente de vuelta al pool.
* **Modelos / Utilidades (`app/utils/` y `app/database.py`)**: Incluyen clases de excepciones personalizadas y la inicialización del motor de base de datos.

---

## 2. Base de Datos Oracle y Modo Thick

Una de las particularidades más críticas de este backend es su integración con una base de datos **Oracle 10g** (esquema heredado del SGA clásico).

### 2.1. El por qué del "Modo Thick" (Modo Grueso)

Por defecto, la librería moderna `python-oracledb` se ejecuta en modo **Thin** (no requiere librerías cliente nativas). Sin embargo, el modo Thin **no es compatible con Oracle Database 10g/11g** ni soporta sus antiguos algoritmos de encriptación de red y autenticación.

Por lo tanto, la aplicación activa el **Modo Thick** de manera mandatoria llamando a `oracledb.init_oracle_client()`.
* **Instant Client 19c:** Se integra en la imagen Docker en la ruta `/opt/oracle/instantclient_19_19`. Es compatible hacia atrás a nivel de red con servidores 10g.
* **Libaio y Debian:** Para garantizar la compatibilidad con Debian moderno (`python:3.11-slim`), el `Dockerfile` instala `libaio1t64` y crea un enlace dinámico hacia `libaio.so.1`, resolviendo los errores de enlace dinámico de Oracle Instant Client.
* **Enlazador Dinámico:** La ruta del Instant Client se añade globalmente al sistema mediante `/etc/ld.so.conf.d/oracle-instantclient.conf` ejecutando `ldconfig` durante la construcción.

> [!WARNING]
> **En Desarrollo Local (Windows):** Si deseas ejecutar la app fuera de Docker en Windows, debes instalar Oracle Instant Client para Windows en tu PC local y definir su ruta exacta en la variable `ORACLE_CLIENT_PATH` de tu archivo `.env`.

### 2.2. Gestión de Conexiones (`app/database.py`)

La clase `OracleDatabase` está diseñada bajo un patrón de instancia compartida única (Singleton) para asegurar que solo exista un pool de conexiones físico en toda la aplicación.

```python
class OracleDatabase:
    _instance = None

    def __new__(cls, *args, **kwargs):
        if not cls._instance:
            cls._instance = super(OracleDatabase, cls).__new__(cls, *args, **kwargs)
        return cls._instance

    def init_app(self, app):
        # Configuración e inicio del pool
        ...
```

#### Regla de Oro: Liberación de Conexiones
Para evitar bloqueos y el agotamiento prematuro del pool de conexiones, las conexiones de base de datos **deben** ser devueltas al pool de manera obligatoria y segura usando bloques `try...finally` en los repositorios:

```python
connection = None
cursor = None
try:
    connection = OracleDatabase.get_connection()
    cursor = connection.cursor()
    # Ejecutar consulta...
finally:
    if cursor:
        cursor.close()
    if connection:
        connection.close()  # Devuelve la conexión al pool
```

---

## 3. Mapeo Dinámico de Permisos en Repositorios

El repositorio `AuthRepository` demuestra cómo el backend mapea dinámicamente columnas de la base de datos Oracle a diccionarios limpios de Python.

Las columnas de permisos de la tabla `GSM.TMST_OPERADORES` que comienzan por el prefijo `PRM_` se recuperan de manera dinámica:
1. Obtenemos los nombres de las columnas descriptivas desde el cursor: `columns = [col[0].upper() for col in cursor.description]`.
2. Asociamos dinámicamente las columnas con la fila devuelta en un diccionario `row_dict = dict(zip(columns, row))`.
3. Mapeamos cada columna con prefijo `PRM_` a un valor booleano (`True` o `False`), ya que en Oracle suelen guardarse como campos de tipo `NUMBER` (donde 1 representa `True`, y 0 o `NULL` representa `False`).

```python
permisos = {}
for col_name, value in row_dict.items():
    if col_name.startswith("PRM_"):
        permisos[col_name] = bool(value) if value is not None else False
```

---

## 4. Guía Práctica: Cómo Añadir una Nueva Funcionalidad

A continuación, se presenta un paso a paso detallado para añadir un nuevo módulo a la API (por ejemplo, gestión de **Ubicaciones**).

### Paso 1: Crear el Repositorio (`app/repositories/ubicacion_repo.py`)
Encapsula las sentencias SQL para consultar información de ubicaciones.

```python
import logging
from ..database import OracleDatabase

logger = logging.getLogger(__name__)

class UbicacionRepository:
    @staticmethod
    def obtener_por_codigo(cod_ubicacion: str) -> dict or None:
        connection = None
        cursor = None
        try:
            connection = OracleDatabase.get_connection()
            cursor = connection.cursor()
            
            query = "SELECT CODUBICACION, DESCRIPCION, ESTADO FROM GSM.TMST_UBICACIONES WHERE CODUBICACION = :cod"
            cursor.execute(query, cod=cod_ubicacion)
            row = cursor.fetchone()
            
            if not row:
                return None
                
            return {
                "CODUBICACION": row[0],
                "DESCRIPCION": row[1],
                "ESTADO": row[2]
            }
        except Exception as e:
            logger.error(f"Error al obtener ubicación {cod_ubicacion}: {e}", exc_info=True)
            raise e
        finally:
            if cursor: cursor.close()
            if connection: connection.close()
```

### Paso 2: Crear el Servicio (`app/services/ubicacion_service.py`)
Añade reglas de negocio. Por ejemplo, validar que el código de ubicación no esté vacío.

```python
from ..repositories.ubicacion_repo import UbicacionRepository

class UbicacionService:
    @staticmethod
    def consultar_ubicacion(cod_ubicacion: str) -> dict:
        if not cod_ubicacion:
            raise ValueError("El código de ubicación es obligatorio.")
            
        ubicacion = UbicacionRepository.obtener_por_codigo(cod_ubicacion)
        if not ubicacion:
            raise Exception(f"La ubicación '{cod_ubicacion}' no existe.")
            
        return ubicacion
```

### Paso 3: Crear las Rutas / Controlador (`app/routes/ubicacion_routes.py`)
Define los endpoints e implementa el manejo de excepciones local de la petición HTTP.

```python
from flask import Blueprint, jsonify, request
from ..services.ubicacion_service import UbicacionService

ubicacion_bp = Blueprint("ubicacion", __name__)

@ubicacion_bp.route("/<string:codigo>", methods=["GET"])
def obtener_ubicacion(codigo):
    try:
        resultado = UbicacionService.consultar_ubicacion(codigo)
        return jsonify({
            "status": "success",
            "data": resultado
        }), 200
    except ValueError as e:
        return jsonify({"status": "error", "message": str(e)}), 400
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 404
```

### Paso 4: Registrar el Blueprint (`app/routes/__init__.py`)
Asegura que Flask reconozca las nuevas rutas al arrancar.

```diff
  from .auth_routes import auth_bp
+ from .ubicacion_routes import ubicacion_bp
  
  def register_routes(app):
      app.register_blueprint(auth_bp, url_prefix="/api/auth")
+     app.register_blueprint(ubicacion_bp, url_prefix="/api/ubicaciones")
```

---

## 5. Pruebas y Validación Técnica

Para validar que los cambios y las conexiones sigan siendo estables:
1. **Validación de Código:** Ejecuta herramientas de análisis estático como `pylint` o `flake8` sobre el directorio `app/`.
2. **Pruebas de Conexión:** Inicia el contenedor localmente y realiza llamadas de prueba mediante herramientas como Insomnia, Postman o `curl`:
   ```bash
   curl -X POST http://localhost:5000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"username":"ADMIN","password":"123"}'
   ```
3. **Control de Logs:** En caso de errores, consulta los detalles a través de los logs estructurados del contenedor en tiempo real con:
   ```bash
   docker compose logs -f web
   ```
   Los errores en la base de datos se reportarán con trazas completas gracias a la configuración de `logger.error(..., exc_info=True)`.
