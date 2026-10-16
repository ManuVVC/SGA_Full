# Documentación del Servicio de Ajustes de Stock

## 1. Documentación Técnica

### Resumen Arquitectónico
El `StockAjustesService` actúa como un intermediario entre la capa de controladores (API) y el repositorio de base de datos (`StockAjustesRepository`). Se encarga del formateo y preparación de los datos antes de ejecutar consultas y procedimientos almacenados relacionados con el ajuste manual del inventario.

### Estructura de Métodos

#### `get_conceptos()`
- **Propósito:** Recupera la lista de conceptos o motivos por los que se puede realizar un ajuste de stock.
- **Retorno:** Lista de diccionarios con los conceptos obtenidos desde el repositorio.

#### `get_lotes(cod_ubicacion: int, cod_articulo: int)`
- **Propósito:** Obtiene la lista de lotes disponibles para un artículo en una ubicación específica.
- **Transformación de Datos:** 
  - Genera un nuevo campo `FECHACADUCIDAD_STR` a partir de `FECHACADUCIDAD` (formato YYYY-MM-DD) para facilitar la manipulación de fechas en el frontend.

#### `ejecutar_ajuste(payload: dict, cod_operador: int, cod_terminal: int)`
- **Propósito:** Ejecuta el ajuste de inventario en la base de datos armando el conjunto de parámetros requeridos por el procedimiento almacenado subyacente.
- **Parámetros Esperados en Payload:**
  - `codArticulo` (int)
  - `codConcepto` (int)
  - `cantidad` (int/float)
  - `cantSegundaUnidad` (int/float, opcional, por defecto 0)
  - `fechaCaducidad` (string 'YYYY-MM-DD', opcional)
  - `lote` (string, opcional)
  - `codUbicacion` (int)
- **Retorno:** Un diccionario de estado: `{"status": "success", "result_code": resultado}`.

---

## 2. Manual de Usuario (Para Operadores)

### ¿Qué son los Ajustes de Stock?
El módulo de ajustes permite realizar modificaciones manuales sobre las cantidades de los productos almacenados para reflejar mermas, pérdidas, roturas o ingresos inesperados, garantizando la cuadratura física contra la del sistema.

### ¿Cómo realizar un ajuste de inventario?

1. **Seleccione la Ubicación y Artículo:** 
   Debe indicar en qué ubicación física (pasillo/estantería) se encuentra el producto que desea ajustar y especificar el código de artículo.

2. **Verifique los Lotes Disponibles:**
   Si el artículo maneja lotes o caducidades, el sistema mostrará la lista de los lotes actualmente almacenados en dicha ubicación.
   
3. **Indique el Concepto de Ajuste:**
   Escoja el motivo del ajuste desde el menú desplegable (por ejemplo, "Rotura", "Merma", "Diferencia de Inventario").

4. **Complete las Cantidades:**
   - Ingrese la **Cantidad** que se sumará o restará del inventario.
   - Si el sistema lo pide, introduzca el lote y la fecha de caducidad.

5. **Confirme la Operación:**
   Al presionar confirmar, el sistema registrará el movimiento usando sus credenciales de usuario para mantener un registro de auditoría. 

### Acceso Rápido desde "Info Artículo"
- **Artículos con Stock**: Mantener pulsada (long press) cualquier fila de ubicación abre el menú de acciones permitiendo saltar a *Ajustes de Stock* o *Info Ubicación*.
- **Artículos Sin Stock en Almacén**: Cuando un artículo no tiene existencias, mantener pulsada la tarjeta con el aviso rojo *"Sin stock en almacén"* abre el menú de acciones para iniciar directamente un *Ajuste de Stock* (alta de stock). Al abrir la pantalla de ajustes con el artículo ya seleccionado, el operario únicamente debe escanear la ubicación donde desea ubicar el nuevo stock.

