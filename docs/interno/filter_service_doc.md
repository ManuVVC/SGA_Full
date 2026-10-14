# Documentación del Servicio de Filtros Dinámicos

## 1. Documentación Técnica

### Resumen Arquitectónico
El `FilterService` es una pieza fundamental para la construcción dinámica de cláusulas `WHERE` en las consultas a la base de datos Oracle. Permite a los usuarios crear, guardar y aplicar filtros personalizados sobre listas de trabajo (ej. recepciones, expediciones, stock). 

### Estructura de Métodos

#### `get_filtros_por_tipo(cod_def_filtro, cod_operador)`
- **Propósito:** Devuelve los filtros guardados en la tabla `TMST_FILTROS` asociados a un módulo de la app (`cod_def_filtro`).

#### `build_filter_condition(codfiltro, bind_param_prefix, table_alias)`
- **Propósito:** Lee un filtro de base de datos y genera el SQL fragmentado.
- **Funcionamiento:** Recupera las definiciones de campos y compara `CODTIPOCOMPARACIONFILTRO` (1 = `IN`, 2 = `NOT IN`). Soporta consultas anidadas (subselects) para campos complejos. Devuelve un string SQL y un diccionario de variables bind.

#### `build_custom_filter_condition(cod_def_filtro, custom_values, ...)`
- **Propósito:** Similar a `build_filter_condition`, pero en lugar de leer de base de datos, construye la condición SQL directamente desde un payload JSON enviado por el frontend (filtros temporales).

#### `crear_filtro(cod_def_filtro, descripcion, cod_operador, custom_values)`
- **Propósito:** Persiste un filtro creado por el usuario en BD (`TMST_FILTROS` y `TMST_CAMPOSFILTRO`) usando una transacción. Auto-incrementa `CODFILTRO`.

---

## 2. Manual de Usuario (Para Operadores Avanzados / Supervisores)

### Uso de Filtros en Pantallas de Listados

El motor de filtros le permite acotar las grandes listas de información (como listas de pedidos, recepciones o stock) para encontrar exactamente lo que necesita.

### ¿Cómo aplicar y guardar un filtro?

1. **Abrir el Panel de Filtros:**
   En cualquier listado que soporte filtrado avanzado, presione el ícono de filtro.

2. **Filtros Temporales:**
   - Seleccione qué campo desea filtrar (ej: "Código de Proveedor" o "Estado del Documento").
   - Elija si la condición es "Incluir" o "Excluir".
   - Ingrese los valores separados por coma (ej: para buscar tres estados, escriba: `PENDIENTE, EN PROCESO, FINALIZADO`).
   - Pulse "Aplicar". El listado se actualizará, pero este filtro se perderá al cerrar la aplicación.

3. **Guardar Filtros Personalizados:**
   Si usted hace una misma búsqueda con frecuencia (ej: "Mis recepciones urgentes"):
   - Complete las condiciones como en el paso 2.
   - Presione el botón **Guardar Filtro**.
   - Asigne un nombre reconocible (ej. "Urgentes de Hoy").
   - La próxima vez que ingrese a la pantalla, su filtro aparecerá en la lista rápida de filtros guardados. 
