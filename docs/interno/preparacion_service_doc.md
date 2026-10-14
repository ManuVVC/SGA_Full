# Documentación: Servicio de Preparación (`preparacion_service.py`)

Este documento contiene la documentación técnica orientada a desarrolladores y un manual de usuario (operadores) del módulo de preparación de pedidos (picking) en el SGA.

---

## 🛠 Parte 1: Documentación Técnica (Para Desarrolladores)

### 1.1. Arquitectura y Patrones de Diseño
El archivo `preparacion_service.py` implementa el patrón **Service Layer**. Centraliza la lógica de negocio para la preparación (picking) de mercancía, sirviendo como intermediario entre los Controladores (o resolutores de API) y la capa de acceso a datos (`PreparacionRepository`).

- **Métodos Estáticos**: Todo el servicio está compuesto por métodos estáticos. Esto facilita la invocación sin necesidad de instanciar la clase y mantiene el servicio sin estado (stateless), apoyándose en un objeto `operador_context` (un diccionario, generalmente proveniente del token o sesión) para mantener información del terminal y del operador.
- **Delegación de Responsabilidades**: El servicio delega el acceso directo a la base de datos (Stored Procedures y queries) al repositorio `PreparacionRepository`.
- **Integración con otros dominios**: Para la validación de ubicaciones, en lugar de replicar código, se importa bajo demanda y se delega al `ReubicacionesService.validar_ubicacion()`, lo cual es una decisión técnica acertada para evitar referencias circulares e inconsistencias.

### 1.2. Principales Flujos y Métodos (Inputs/Outputs)

#### Gestión de Documento y Cabecera
- `obtener_documento(operador_context: dict) -> dict`
  - **Input**: Diccionario de contexto con la clave `terminal`.
  - **Output**: `{"cod_documento": int, "hay_documento": bool}`
  - **Lógica**: Retorna el documento activo asignado al terminal del operario. Lanza excepción si el terminal no existe.
- `get_cabecera(cod_documento: int) -> dict`: Devuelve los datos cabecera del documento.

#### Recorrido y Líneas de Preparación
- `get_primera_linea(cod_documento) -> dict` / `siguiente_linea(...) -> dict`
  - **Input**: Identificadores de documento, ubicación actual, orden, tipo de avance (0 = siguiente, 1 = anterior), etc.
  - **Output**: `{"linea": dict}` (Información de la línea enriquecida).
  - **Lógica**: Llama al backend (SP) para obtener la línea a preparar. Luego ejecuta `_enriquecer_linea()` para traer información detallada del artículo (trazabilidad, caducidad, etc.).
- `get_lineas_pendientes(...)` y `get_num_lineas_pendientes(...)`: Útiles para interfaces de usuario que muestran listados o el progreso total.

#### Validación y Confirmación de Mercancía
- `validar_ubicacion(cod_hueco: str, cod_ubicacion_esperada: int, posicion: int) -> dict`
  - **Decisión técnica**: Comprueba no solo que la ubicación escaneada sea válida en el almacén (vía `ReubicacionesService`), sino también que el ID corresponda a lo que el sistema esperaba (`cod_ubicacion_esperada`), emitiendo un estado `"error"` si el operario se encuentra en el pasillo o hueco incorrecto.
- `cargar_mercancia(...) -> dict`
  - **Input**: Contexto, documento, ubicación, artículo, línea, unidades, lote/caducidad, etc.
  - **Output**: `{"success": True}`
  - **Lógica**: Confirma el picking y actualiza el stock en la base de datos registrando el terminal que realizó la acción.
- `descargar_mercancia(...)`: Permite revertir una preparación parcial o total en una línea específica, liberando o retornando el stock.

#### Pedidos Directos
Permite registrar salidas sin documento previo generado desde el ERP. Se agrupan bajo los métodos `get_pedido_directo_en_curso`, `crear_cabecera_pedido_directo`, `grabar_linea_pedido_directo` y `get_lineas_pedido_directo`.

---

## 📖 Parte 2: Manual de Usuario (Para Operadores)

Bienvenido a la guía de preparación de pedidos (Picking). Esta sección explica paso a paso cómo se realiza la recogida de productos en el almacén usando el terminal móvil.

### ¿Cómo funciona el proceso de Preparación?

El sistema le guía de forma secuencial y ordenada por los pasillos del almacén para recoger los productos solicitados de forma eficiente.

#### Paso 1: Iniciar la preparación
1. Al acceder a la opción de **Preparación**, el sistema detecta automáticamente su dispositivo (Terminal) e identifica si tiene un "Documento" (o pedido) asignado.
2. Usted podrá ver la **Cabecera del Pedido**, que incluye detalles generales de lo que se va a preparar.

#### Paso 2: Dirigirse a la Ubicación
1. El sistema le mostrará en pantalla cuál es la **Primera Línea** o artículo que debe recoger y hacia dónde debe ir.
2. Al llegar al lugar, debe escanear el código de barras de la ubicación (hueco).
3. **Validación Automática:** El sistema comprobará si usted está en el lugar correcto. Si por error ha ido a otro pasillo, se mostrará un mensaje de advertencia indicando *"Ubicación incorrecta"*.

#### Paso 3: Escanear el Artículo y Confirmar Cantidad
1. Una vez en la ubicación correcta, el sistema le indica qué producto y qué cantidad exacta debe tomar.
2. Para artículos que controlen lote o fecha de caducidad, el sistema le pedirá escanear o seleccionar de la lista disponible en esa ubicación.
3. Confirme las unidades extraídas (este proceso se conoce como *Cargar Mercancía*). 

#### Paso 4: Siguiente Producto
1. Tras confirmar un artículo, puede avanzar al siguiente usando el botón de continuar (Avance Siguiente). El sistema trazará la ruta óptima.
2. Si comete un error, puede retroceder a la línea anterior o incluso **Descargar (Revertir) la mercancía** que acaba de preparar.
3. Puede consultar en cualquier momento la lista completa de líneas pendientes para saber cuánto le falta por terminar.

### Preparación de Pedidos Directos
En ocasiones, necesitará sacar mercancía de forma urgente o imprevista sin un documento previo.
- **Nuevo Pedido Directo:** Seleccione esta opción para crear una cabecera en el momento.
- Usted podrá ir escaneando ubicaciones y artículos, indicando cuántas unidades toma (grabar línea), y el sistema lo registrará directamente bajo su usuario y terminal en curso.
