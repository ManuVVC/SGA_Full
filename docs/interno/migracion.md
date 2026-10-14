# Estrategia de Migración de Base de Datos (Oracle a PostgreSQL)

## 1. Contexto y Decisión Arquitectónica
Este documento detalla la estrategia para migrar el entorno del SGA de una base de datos Oracle externa a una base de datos propia e independiente.

* **Base de datos destino elegida:** **PostgreSQL**.
* **Justificación técnica:** 
  * Los procesos del SGA implican almacenamiento de stock y múltiples tablas actualizándose a la vez en procesos cascada. Esto hace **obligatorio** el uso de una base de datos relacional (Transacciones ACID).
  * El volumen de datos estimado (media de 30GB) y la concurrencia (~50 conexiones simultáneas entre operarios, administración y demonios ERP) son cargas de trabajo que PostgreSQL maneja con extrema soltura mediante bloqueos a nivel de fila (MVCC).
  * PostgreSQL evita el pago de costosas licencias, ofreciendo robustez de nivel empresarial (Open Source).
  * Su lenguaje procedural (PL/pgSQL) es prácticamente idéntico al PL/SQL de Oracle, lo que facilita enormemente la migración de procedimientos almacenados.

---

## 2. Análisis del Entorno Actual (SGA)
Tras inspeccionar el código del proyecto, se ha determinado que la arquitectura actual está preparada para una transición limpia gracias al uso de buenas prácticas:

* **Backend:** Python (Flask). Actualmente utiliza el driver `oracledb`.
* **Frontend y PDA:** Aplicaciones en JavaScript/Node.js (Vite). **No requerirán ninguna modificación** ya que se comunican vía API REST.
* **Patrón de Diseño:** El backend utiliza un estricto **Patrón Repositorio** (`app/repositories/`), lo que aísla completamente la lógica de base de datos de la lógica de negocio y los endpoints.
* **Gestor de Conexión:** Existe una clase envoltorio en `app/database.py` (`OracleDatabase`) que estandariza las llamadas (`execute_query`, `execute_non_query`, `call_procedure`).

---

## 3. Hoja de Ruta para la Migración

### Fase 1: Capa de Conexión (Adaptador)
1. **Nuevo Driver:** Instalar la dependencia de PostgreSQL en el backend (`pip install psycopg2-binary`).
2. **Nueva Clase de Base de Datos:** Crear una clase `PostgresDatabase` (en `app/database.py` o en un archivo hermano) que implemente **exactamente los mismos métodos** que `OracleDatabase`:
   * `get_connection()`
   * `get_cursor()`
   * `execute_query(sql, params, as_dict, fetch_all)`
   * `execute_non_query(sql, params, commit)`
   * `call_procedure(proc_name, parameters, commit)`
3. **Variables de Entorno:** Actualizar `.env`, `docker-compose.yml` y `app/config.py` para admitir las cadenas de conexión de Postgres (`POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, etc.).

### Fase 2: Refactorización de Repositorios (Dialecto SQL)
Debido a que el ORM no es utilizado y se emplea Raw SQL, se deben modificar los archivos dentro de `app/repositories/` (ej. `entradas_repo.py`, `preparacion_repo.py`).
Los cambios de sintaxis más frecuentes serán:

| Concepto | Sintaxis en Oracle | Sintaxis en PostgreSQL |
| :--- | :--- | :--- |
| **Variables (Bind)** | `:parametro` | `%s` o `%(parametro)s` |
| **Nulos** | `NVL(columna, 0)` | `COALESCE(columna, 0)` |
| **Fecha Actual** | `SYSDATE` | `CURRENT_TIMESTAMP` |
| **Paginación / Límites** | `WHERE ROWNUM <= 10` | `LIMIT 10` |
| **Cadenas de Texto** | Operador `\|\|` o `CONCAT` | Operador `\|\|` (Mantiene compatibilidad) |

### Fase 3: Migración de Procedimientos Almacenados
Para las lógicas que actualmente se ejecutan mediante el método `call_procedure`:
* Exportar los *Stored Procedures* y *Triggers* del servidor Oracle externo.
* Traducir el código de **PL/SQL (Oracle)** a **PL/pgSQL (PostgreSQL)**. 
* *Nota:* La sintaxis es tan similar que en muchos casos solo requiere cambiar la cabecera de definición y ajustes menores en los cursores.

### Fase 4: Pruebas y Despliegue
* Desplegar un contenedor PostgreSQL local mediante `docker-compose.yml`.
* Aplicar el esquema (DDL) y hacer un volcado de datos inicial de prueba.
* Ejecutar los tests (ubicados en `tests/` y los múltiples scripts `check_*.py` de la raíz) apuntando a la nueva clase `PostgresDatabase` para asegurar la paridad de funcionamiento.
