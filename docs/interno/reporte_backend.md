# Reporte de Análisis del Backend SGA (Flask/Python)

Se ha realizado una revisión exhaustiva de la base de código del backend (`G:\Proyectos\SGA\backend\app`), abarcando archivos principales como `database.py`, `config.py`, `__init__.py` y las capas de rutas, servicios y repositorios. A continuación, se detallan los hallazgos y áreas de mejora.

## 1. Seguridad y SQL
**Hallazgos:**
- **Uso de Bind Variables (Riesgo bajo de SQL Injection):** El código está bien protegido contra inyecciones SQL. A lo largo de los repositorios analizados (`auth_repo.py`, `preparacion_repo.py`, `entradas_repo.py`), se utilizan correctamente las variables de enlace (Bind Variables) de Oracle. Ejemplos: `WHERE UPPER(CODOPERADOR) = UPPER(:cod_operador)` y paso de diccionarios en los métodos `execute`.
- **Contraseñas en texto plano (Riesgo Crítico):** En `auth_service.py` (`login`), la validación de la contraseña se hace comparando directamente en texto plano contra el valor devuelto por la base de datos (`stored_password != password`). Además, soporta que la contraseña sea nula en base de datos. Aunque esto parezca un requerimiento del sistema legado (`SPTOL_VALIDARUSUARIO`), constituye una falla de seguridad importante.

**Propuesta de mejora:**
- Implementar un proceso de migración de hashes (ej. `bcrypt` o `Argon2`) para las contraseñas en la base de datos `TMST_OPERADORES`.

## 2. Manejo de Base de Datos
**Hallazgos:**
- **Uso del Pool:** Se instancia correctamente un pool de Oracle mediante `oracledb.create_pool` con parámetros mínimos y máximos en `database.py`.
- **Inconsistencia en la gestión de conexiones:** En `database.py` se ofrece un excelente *context manager* (`get_cursor`) y métodos de utilidad como `execute_query` y `execute_non_query`. Sin embargo, los repositorios no lo están usando consistentemente. 
- **Código frágil en Repositorios:** En `entradas_repo.py` y `auth_repo.py`, las conexiones y cursores se abren y cierran de forma manual, y las transacciones (`commit()` y `rollback()`) se invocan explícitamente en bloques `try...except...finally` excesivamente largos y repetitivos.

*Ejemplo problemático en `entradas_repo.py`:*
```python
conn = db.get_connection()
cursor = conn.cursor()
try:
    # lógica y múltiples inserts
    conn.commit()
except Exception as e:
    conn.rollback()
    raise e
finally:
    if 'cursor' in locals():
        try: cursor.close()
        except: pass
    if 'conn' in locals():
        try: conn.close()
        except: pass
```

**Propuesta de mejora:**
- ~~Refactorizar todos los repositorios para utilizar el *context manager* provisto en `database.py`:~~ **[COMPLETADO]**: Se refactorizaron los repositorios (`utilidades_repo.py`, `reubicaciones_repo.py`, `entradas_repo.py`, etc.) para usar el patrón:
```python
with OracleDatabase.get_cursor(commit=True) as cursor:
    cursor.execute(...)
```
Esto maneja de forma automática el *commit*, el *rollback* (en caso de excepción) y la liberación de recursos (devolución al pool), reduciendo el código boilerplate y previniendo fugas de memoria y bloqueos de conexión.

## 3. Arquitectura y Limpieza
**Hallazgos:**
- **Separación de capas adecuada pero con fugas de responsabilidades:** La división en Rutas (controlador), Servicios (negocio) y Repositorios (datos) está presente y estructurada. Sin embargo, en los servicios hay código que pertenece al controlador. Por ejemplo, en `auth_service.py` el método `login` accede directamente a `request.headers` y `request.remote_addr` para obtener la IP. Esto acopla la lógica de negocio al contexto HTTP de Flask.
- **Funciones gigantes y Código Duplicado:**
  - El código manual para obtener, cerrar y manejar las excepciones de base de datos se copia de manera idéntica a lo largo de docenas de métodos en `entradas_repo.py`.
  - Existen funciones con excesiva responsabilidad, como `cargar_mercancia` en `preparacion_repo.py` (aproximadamente 140 líneas) y la extracción repetida de cabeceras IP en `auth_service.py`.

**Propuesta de mejora:**
- Extraer la lógica relacionada con HTTP (IP, cabeceras) hacia la capa de `routes`, y pasar las variables resultantes como parámetros a los `services`.
- Centralizar la lógica repetitiva de los repositorios usando la abstracción de `database.py` para reducir a la mitad el volumen de líneas por método de persistencia. Dividir los métodos gigantes en submétodos privados más descriptivos.

## 4. Manejo de Errores
**Hallazgos:**
- **Uso adecuado en Rutas:** Se utilizan correctamente excepciones personalizadas (`UserNotFoundError`, `InvalidPasswordError`, `TerminalNoAutorizado`) con la captura en `auth_routes.py` y el mapeo a los correspondientes *Status Codes* (404, 401, 403).
- **Anti-patrones en Repositorios:** En repositorios como `entradas_repo.py`, los bloques `except` finalizan con:
```python
except Exception as e:
    raise e
```
Este patrón no aporta valor e interrumpe/sobreescribe ligeramente el stack trace original.

**Propuesta de mejora:**
- Eliminar los bloques `try...except Exception as e: raise e` que no hagan rollback, y dejar que las excepciones burbujeen de manera natural, o utilizar simplemente `raise`.
- Crear una capa de mapeo de errores de base de datos de `oracledb` para transformar los errores genéricos de Oracle (como violaciones de *constraints*) en excepciones de dominio antes de llegar a la capa de rutas.
