# Documentación del Servicio de Reubicaciones (SGA)

Esta documentación está dividida en dos secciones: **Documentación Técnica**, dirigida a los desarrolladores del sistema y mantenedores del código; y el **Manual de Usuario**, destinado a los operadores de almacén o clientes finales que usan la aplicación en el día a día.

---

## 💻 Documentación Técnica (Para Desarrolladores)

### Visión General
El archivo `reubicaciones_service.py` expone la clase estática `ReubicacionesService`. Su propósito principal es orquestar la lógica de negocio para los movimientos internos de mercancía dentro del almacén (reubicaciones), actuando como intermediario entre los endpoints de la API (o controladores) y el repositorio de base de datos (`ReubicacionesRepository`).

### Dependencias y Configuración
*   **Repositorio**: Requiere la clase `ReubicacionesRepository` que maneja las consultas directas a las tablas/vistas de la base de datos (como `VMST_UBICACIONES`, `VMST_HUECOS`, `TMST_PALETS`).
*   **Utilidades**: Consume `is_parametro_activo` (de `..utils.parametros`) para comprobar activaciones de configuraciones dinámicas (ej. parámetro `1690` para búsqueda por fabricante).
*   **Logging**: Utiliza el módulo estándar `logging` para el trazado de errores u operaciones (aunque actualmente se reserva para implementaciones futuras de trazado detallado).

### Métodos de `ReubicacionesService`

| Método | Argumentos Clave | Retorno (Diccionario) | Descripción y Reglas de Negocio |
| :--- | :--- | :--- | :--- |
| `validar_ubicacion` | `input_value: str`<br>`posicion: int` | `{ status: 'success'\|'error'\|'necesita_posicion', ... }` | Busca ubicaciones por ID numérico (`CodUbicacion`), luego alfanumérico (`NombreCorto`), y finalmente por `etiqueta`. Si una etiqueta tiene múltiples posiciones y no se pasa `posicion`, retorna `necesita_posicion`. |
| `validar_articulo` | `input_value: str`<br>`tipo_busqueda: str` | `{ status: 'success'\|'error'\|'multiples_resultados', articulo: {...} }` | Resuelve el artículo por `ean`, `codigo`, `fabricante` (si param 1690 activo), o `descripcion`. Soporta un modo `"auto"` que evalúa todos en cascada. |
| `validar_cantidad` | `cod_ubicacion: int`<br>`cod_articulo: int`<br>`cantidad_introducida: float`<br>`unidades_conversion: float`<br>`cod_numero_lote: int` (opcional) | `{ status: 'success'\|'error', cantidad_real: float, stock_disponible: float }` | Valida que `(cantidad_introducida * unidades_conversion) <= stock_disponible`. Si se especifica `cod_numero_lote`, valida contra el stock de ese lote. Retorna error si excede o si es <= 0. |
| `obtener_stock_disponible` | `cod_ubicacion: int`<br>`cod_articulo: int`<br>`cod_numero_lote: int` (opcional) | `{ status: 'success'\|'error', stock: float, lote: str, cod_numero_lote: int, fecha_caducidad: str, ubicacion: str }` | Devuelve el stock disponible del artículo en la ubicación origen junto con la información del lote, fecha de caducidad y nombre de ubicación. |
| `obtener_lotes_disponibles` | `cod_ubicacion: int`<br>`cod_articulo: int` | `{ status: 'success'\|'error', lotes: list }` | Devuelve los lotes físicos existentes en la ubicación origen. |
| `grabar_reubicacion` | `origen: dict`<br>`destino: dict`<br>`articulo: dict`<br>`cantidad: float`<br>`terminal: int`<br>`operador: int`<br>`lote: dict` | `{ status: 'success'\|'error', message: str }` | Graba el movimiento por artículo. **Regla Crítica**: Valida que el propietario de la mercancía origen (`CODTIPODATOMAESTRO`, `CODDATOMAESTRO`) no colisione con el propietario exclusivo de la ubicación destino. |
| `validar_palet` | `sscc: str` | `{ status: 'success'\|'error', palet: dict }` | Parsea el SSCC eliminando prefijos de GS1-128 (como `]C1`, `(00)` o `00` al inicio). Busca el palet exacto en BD. |
| `grabar_reubicacion_palet` | `palet: dict`<br>`destino: dict`<br>`terminal: int`<br>`operador: int` | `{ status: 'success'\|'error', message: str }` | Mueve un palet completo. Aplica las mismas validaciones de colisión de propietario que el método `grabar_reubicacion`. |

### Parámetro de Operario: `PRM_PUEDEREUBICARTODOCONENTER`
*   **Definición en BD**: Columna `PRM_PUEDEREUBICARTODOCONENTER` en la tabla `GSM.TMST_OPERADORES`.
*   **Comportamiento en Terminal PDA**:
    *   Si el operario tiene activo este parámetro, en el paso 3 de **Reubicación Libre** (selección de cantidad), aparece un botón destacado en el recuadro que indica **"Todo"** y muestra el stock total disponible en la ubicación origen, junto con el número de lote y la fecha de caducidad correspondientes.
    *   Al pulsar dicho botón, o al presionar la tecla **Enter** con el campo de cantidad vacío, el sistema asigna automáticamente la totalidad del stock disponible (ajustado por el factor de conversión si el artículo lo requiere) y avanza inmediatamente al paso 4 (Ubicación Destino), sin requerir teclear ningún valor numérico.

### Aspectos Arquitectónicos y de API
1.  **Formato de Retorno**: Todos los métodos devuelven un objeto tipo diccionario estandarizado, usualmente conteniendo una clave `status` (`'success'`, `'error'`, `'necesita_posicion'`, `'multiples_resultados'`) y un `message` o el objeto de base de datos extraído. Los endpoints de FastAPI (o Flask) deben interpretar este `status` para retornar códigos HTTP 200 (OK), 400 (Bad Request) o 409 (Conflict).
2.  **Manejo de Errores**: Se utiliza un bloque `try-except` en la etapa de grabación para capturar excepciones SQL y encapsularlas en respuestas controladas al cliente (evitando exponer caídas completas de la aplicación).

---

## 📖 Manual de Usuario (Para Operadores)

¡Bienvenido al sistema de Reubicaciones! Este módulo te permite mover mercancía o palets completos dentro del almacén asegurando que no haya errores de inventario.

### 1. Reubicar Artículos Sueltos (Reubicación Normal)

Este proceso te permite tomar una cantidad específica de productos de una ubicación y dejarlos en otra.

**Paso a paso:**
1.  **Escanear Ubicación de Origen**: Lee el código de barras del hueco de donde tomarás el producto.
    *   *Nota*: Si la etiqueta representa varios huecos unidos, la pantalla te pedirá que indiques la **Posición** exacta.
2.  **Escanear el Artículo**: Lee el código de barras (EAN), el código interno del producto o el de fabricante. Si el escáner falla, también puedes buscar por nombre/descripción.
    *   *Nota*: Si hay lotes registrados para ese artículo, el sistema te pedirá que selecciones cuál lote vas a mover (o lo seleccionará automáticamente si solo hay uno).
3.  **Indicar Cantidad**: Ingresa cuántas unidades estás moviendo. El sistema te bloqueará si intentas mover más piezas de las que realmente hay registradas.
    *   *Funcionalidad Reubicar Todo*: Si tu usuario tiene habilitado el permiso de reubicar todo con Enter (`PRM_PUEDEREUBICARTODOCONENTER`), verás en el recuadro un botón que indica **"Todo"** con el stock total disponible, lote y fecha de caducidad. Puedes:
        *   Tocar el botón **"Todo"** para seleccionar automáticamente todo el stock disponible y avanzar al siguiente paso sin teclear nada.
        *   Presionar la tecla **Enter** directamente en el campo de cantidad vacío para avanzar con todo el stock.
        *   O bien teclear manualmente la cantidad deseada si solo deseas mover una parte.
4.  **Escanear Ubicación de Destino**: Escanea dónde vas a dejar la mercancía.
5.  **Confirmar Movimiento**: Presiona "Grabar" o "Confirmar".
    *   *Importante*: Si intentas dejar mercancía de un cliente en una ubicación reservada para *otro* cliente, el sistema mostrará un aviso de error y no te dejará continuar.

### 2. Reubicar Palets Completos (Movimiento por SSCC)

Este proceso es más rápido y se usa cuando trasladas un palet cerrado o matrícula completa sin desarmarlo.

**Paso a paso:**
1.  **Escanear Matrícula del Palet**: Lee la etiqueta del palet (código SSCC de 18-20 dígitos). El sistema reconocerá automáticamente el código, incluso si tiene formatos especiales de logística (como el GS1-128 con `(00)`).
2.  **Escanear Ubicación de Destino**: Escanea el código del hueco o estantería donde vas a aparcar el palet.
3.  **Confirmar**: El sistema actualizará todo el contenido de ese palet a la nueva ubicación en un solo paso. Al igual que con los artículos, está prohibido dejar palets de un cliente en la zona exclusiva de otro cliente.

### ⚠️ Mensajes Comunes
*   **"No se encontraron ubicaciones para la etiqueta"**: Asegúrate de haber escaneado el código correcto o de que la etiqueta no esté dañada.
*   **"Stock insuficiente"**: Estás intentando mover más unidades de las registradas en el sistema. Verifica la cantidad en tu pantalla.
*   **"Se encontraron múltiples artículos"**: El código escaneado coincide con más de un producto en el catálogo. Usa la lista en pantalla para elegir el correcto.
