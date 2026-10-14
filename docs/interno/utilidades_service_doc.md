# Documentación: Utilidades Service (EAN)

## 1. Documentación Técnica (Devs)

### Arquitectura y Diseño
El `UtilidadesService` encapsula lógicas transversales y de soporte, enfocándose principalmente en la gestión de códigos de barras EAN (European Article Number) y su relación con los artículos del inventario.

- **Capa de Abstracción de Datos:** Utiliza `UtilidadesRepo` para ejecutar operaciones CRUD directas en la base de datos sobre los códigos EAN.
- **Estructura de Respuesta:** A diferencia de lanzar excepciones ante validaciones de negocio (como EAN duplicado), el servicio utiliza un patrón de retorno basado en diccionarios con el formato `{"status": "...", "message": "..."}`, lo cual es útil para enviar respuestas JSON directas en la capa de Controladores/API.
- **Relaciones:** Gestiona la relación entre el código de barras (`ean`), el identificador interno del producto (`cod_articulo`) y su factor de conversión (`factor`), que habitualmente representa la cantidad de unidades en un empaquetado.

### API Interna (Métodos Principales)
| Método | Descripción | Retorno |
|--------|-------------|---------|
| `get_ean_info(ean)` | Consulta si el EAN existe y trae su data asociada. | `Dict` (status, exists, data) |
| `crear_ean(ean, cod_articulo, factor)` | Asocia un nuevo EAN a un artículo (valida unicidad). | `Dict` (status, message) |
| `actualizar_ean(ean, cod_articulo, factor)`| Actualiza los datos de un EAN existente. | `Dict` (status, message) |

*\[Insertar diagrama E-R del EAN y Artículo aquí\]*

---

## 2. Manual de Usuario (Operadores)

### Gestión de Códigos de Barras (EAN)
El sistema permite vincular códigos de barras EAN a los artículos de su almacén. Esto es vital para el escaneo mediante PDAs.

**Consultar un Código de Barras:**
1. Escanee el código o escríbalo en el buscador de EAN.
2. El sistema le mostrará a qué artículo pertenece y cuál es su **Factor** (ej. si el EAN corresponde a una caja de 12 unidades, el factor será 12).

**Asignar un Nuevo Código:**
1. Ingrese el nuevo EAN escaneándolo.
2. Seleccione el **Artículo** al que corresponde.
3. Ingrese el **Factor de conversión** (cuántas unidades individuales representa ese código).
4. Guarde los cambios. Si el código ya existe en el sistema, aparecerá un mensaje de error.

**Modificar un Código Existente:**
- Si un código de barras fue asignado por error a otro artículo o su factor cambió, puede buscar el EAN, editar la información correcta y pulsar **Actualizar**.

*\[Insertar captura de pantalla de la pantalla de vinculación de EAN aquí\]*
