# Documentación de Servicio: Stock (`stock_service.py`)

## Parte 1: Documentación Técnica (Para Desarrolladores)

### Visión General
El servicio `StockService` centraliza toda la lógica relacionada con la consulta de inventarios, gestión de ubicaciones y búsqueda de artículos. Se apoya en `StockRepository` para el acceso a datos.

### Dependencias
- `app.repositories.stock_repo.StockRepository`: Consultas a la BD relacionadas con artículos, stock y ubicaciones.
- `app.utils.exceptions`: Define errores de dominio como `ArticuloNotFoundError` y `EanNoEncontrado`.

### Métodos y Especificación

#### `consultar_stock_articulo(cod_articulo: str) -> dict`
- **Descripción:** Verifica la existencia de un artículo y retorna su stock total junto con un desglose por ubicaciones.
- **Flujo:**
  1. Valida que `cod_articulo` no sea nulo.
  2. Consulta al repositorio maestro para asegurar que el artículo exista; de lo contrario, levanta `ArticuloNotFoundError`.
  3. Obtiene el listado de ubicaciones con stock y calcula el `stock_total`.
- **Retorno:** Diccionario con datos del artículo (`cod_articulo`, `nombre`, etc.), bandera `tiene_stock`, `stock_total` y lista de `ubicaciones`.

#### `actualizar_configuracion_ubicacion(cod_ubicacion: int, bloqueo_entrada: int, bloqueo_salida: int, ubicar_docs: int) -> dict`
- **Descripción:** Permite modificar los parámetros de comportamiento de una ubicación en el almacén (ej. bloquear para que no se puedan guardar más cosas).
- **Parámetros:** Banderas de entero (0 o 1) para `bloqueo_entrada`, `bloqueo_salida` y `ubicar_docs`.
- **Excepciones:** Levanta `ValueError` si falta el código de ubicación o si la actualización en BD falla.

#### `consultar_stock_ubicacion(cod_ubicacion: int) -> dict`
- **Descripción:** Dado el ID de una ubicación (ej. estantería o pasillo), devuelve todo el inventario contenido allí.
- **Retorno:** Código de ubicación, booleano `tiene_stock`, total de unidades y lista de artículos almacenados.

#### `consultar_stock_ean(ean_leido: str) -> dict`
- **Descripción:** Variante de consulta de stock que utiliza el código de barras (EAN) del producto.
- **Flujo:** Busca el artículo asociado al EAN. Si no existe, levanta `EanNoEncontrado`. Si existe, reutiliza internamente el flujo de consulta por ID de artículo para devolver las ubicaciones.

#### `search_articulos(search_type: str, query: str) -> list`
- **Descripción:** Buscador genérico de artículos para el frontend.
- **Lógica:** Pasa el tipo de búsqueda y la cadena al repositorio. Luego, itera sobre los resultados para homogeneizar el formato de salida, mapeando campos como `FACTORCONVERSION`, `PRM_TRAZABILIDAD`, caducidad, etc.

#### `consultar_eans_articulo(cod_articulo: int) -> list`
- **Descripción:** Devuelve todos los códigos EAN (códigos de barras) asociados a un artículo específico.

---

## Parte 2: Manual de Usuario (Para Operadores)

### Gestión de Stock y Ubicaciones

Esta guía te ayudará a localizar mercancía y consultar el inventario desde tu terminal.

#### 1. Consultar Stock de un Artículo
Si necesitas saber cuántas unidades quedan de un producto y en qué pasillo o estantería se encuentran:
- Dirígete a la pantalla de **Consulta de Artículo**.
- Introduce el código del artículo.
- La pantalla te mostrará el nombre del producto, la cantidad total disponible en el almacén y una lista detallada indicando exactamente dónde (en qué ubicaciones) está cada unidad.
- Si el código introducido no existe, el sistema te mostrará una alerta indicándolo.

#### 2. Consultar por Código de Barras (EAN)
Puedes usar tu lector de códigos de barras para buscar mercancía de forma rápida.
- Sitúate en la pantalla de **Búsqueda por EAN**.
- Escanea el código de barras del producto.
- Al igual que en el caso anterior, verás en qué ubicaciones del almacén se encuentra dicho producto.

#### 3. Consultar el Contenido de una Ubicación
Si te encuentras frente a una estantería o palé y quieres comprobar qué debería haber ahí:
- Ve a **Consulta de Ubicación**.
- Introduce o escanea el código de la ubicación.
- El sistema listará todos los artículos y cantidades que constan informáticamente en ese espacio, junto con el total de unidades.

#### 4. Búsqueda de Artículos
Si no sabes el código exacto de un artículo, puedes usar el buscador general:
- Ingresa una palabra clave o parte del nombre en el buscador.
- Selecciona el tipo de búsqueda que estás realizando.
- La lista de resultados te mostrará los artículos que coincidan, incluyendo información importante como si el producto requiere control de caducidad o trazabilidad especial.

#### 5. Configurar una Ubicación (Solo Operadores Avanzados)
En ocasiones especiales, puede que necesites "bloquear" temporalmente una ubicación:
- En la pantalla de **Configuración de Ubicación**, introduce el código del hueco.
- Podrás activar o desactivar opciones como:
  - **Bloqueo de entrada:** Nadie podrá guardar mercancía nueva ahí.
  - **Bloqueo de salida:** Nadie podrá retirar mercancía de ahí (ideal si se detecta mercancía dañada).
- Guarda los cambios y el sistema confirmará la actualización.
