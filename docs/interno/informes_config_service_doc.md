# Documentación: Informes Config Service

## 1. Documentación Técnica (Devs)

### Arquitectura y Diseño
El servicio `InformesConfigService` gestiona el ciclo de vida y la ejecución de informes configurables dentro del SGA. Está diseñado para interactuar con `OracleDatabase` y `InformesConfigRepo`.

- **Parseo de JSON:** Los campos CLOB o JSON (como `COLUMNAS_CONFIG` y `COLUMNAS_VISIBLES`) se parsean automáticamente a diccionarios de Python para facilitar su consumo por la API.
- **Seguridad en Consultas (SQL):** El método `ejecutar_informe` incluye validaciones estrictas de seguridad:
  - Sólo se permiten sentencias `SELECT` o `WITH`.
  - Se bloquean palabras clave de mutación (`INSERT`, `UPDATE`, `DELETE`, `DROP`, etc.).
  - Para evitar sobrecarga en la base de datos, se inyecta automáticamente un límite de 1000 registros si no se especifica explícitamente (`FETCH FIRST`).
- **Inyección de Filtros Dinámicos:** Utiliza el token `{FILTROS_DINAMICOS}` en la consulta SQL base para inyectar condiciones `WHERE` construidas dinámicamente mediante `FilterService`.

### API Interna (Métodos Principales)
| Método | Descripción | Retorno |
|--------|-------------|---------|
| `get_all(solo_visibles)` | Lista informes parseando JSON. | `List[Dict]` |
| `ejecutar_informe(id_informe, filtros)` | Ejecuta SQL inyectando filtros y limitando filas. | `Dict` con `columns`, `data` y `total` |
| `save_preferencias_usuario(...)` | Guarda preferencias de columnas de un operador. | `bool` |

*\[Insertar diagrama de secuencia de ejecución de informes aquí\]*

---

## 2. Manual de Usuario (Operadores)

### Generación de Informes Configurables
Esta funcionalidad le permite extraer datos del sistema a través de informes pre-configurados.

**Pasos para visualizar un informe:**
1. Diríjase a la sección de **Informes**.
2. Seleccione el informe que desea ejecutar de la lista disponible.
3. (Opcional) Aplique **filtros** específicos (ej. por fecha, artículo o estado) para reducir los resultados.
4. Haga clic en **Ejecutar**. Se mostrarán los datos en una tabla (máximo 1000 registros para mantener la velocidad del sistema).

**Personalizar la Vista de Columnas:**
- Puede ocultar, mostrar o cambiar el orden de las columnas según su preferencia.
- El sistema recordará su configuración (*Preferencias de usuario*) la próxima vez que inicie sesión y abra el mismo informe.

*\[Insertar captura de pantalla de la tabla de informes y el menú de columnas aquí\]*
