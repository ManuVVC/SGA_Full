# Selección Libre de Líneas de Preparación

## Descripción de la Funcionalidad
Se ha implementado la funcionalidad para que el operario pueda saltarse el orden guiado normal de preparación y seleccione directamente el artículo que desea preparar desde la vista de "Líneas pendientes".

Esto se logra realizando un *Click Corto* (toque normal) en la línea deseada dentro de la lista de líneas pendientes. Al hacerlo, el sistema recuperará la ubicación óptima para ese artículo y pasará automáticamente al asistente de preparación de esa línea. (El *Long Press* o mantener presionado sigue desplegando las utilidades y ubicaciones adicionales).

## Detalles de Implementación

### 1. Interfaz de Usuario (Frontend PDA)
- Se ha desacoplado la lógica del *longpress* del *click* nativo en el componente `LineaPendienteRow` (archivo `PreparaPedido.jsx`), utilizando una variable de control con `useRef` para evitar que un mantener-presionado dispare también el click simple al soltar.
- La función `seleccionarLinea` se encarga de interceptar el click corto. Ya no llama al servicio SP de Oracle (`SPPRP_ARTICULOSPARAPREPARAR`) —el cual generaría el siguiente artículo en la ruta a partir del provisto—, sino que inyecta directamente la línea en la función `aplicarLinea()`, forzando el salto manual.
- Se ha incluido un mecanismo de memoria (`faseAnterior`) para el botón "Volver" del listado de líneas. Esto asegura que si el operario consulta la lista pero decide cancelar (pulsando Volver), retorne exactamente a la pantalla (Ubicación, Artículo, Lote o Cantidad) donde se había quedado en la línea actual, sin resetear el estado ni adelantar pasos erróneamente.

### 2. Capa de Acceso a Datos (Backend Oracle)
- Se ha modificado el repositorio de preparación (`preparacion_repo.py`) en la consulta `get_lineas_pendientes`.
- Anteriormente las líneas no bajaban con los detalles exactos de ubicación (`CODUBICACION`, `CODHUECO`, etc.). Ahora se determina la ubicación óptima para cada línea y se envía al Frontend, permitiendo la selección libre.
- La ubicación óptima se calcula con la siguiente prioridad para cada artículo:
  1. Que exista en una ubicación con stock (`VU.STOCK > 0`).
  2. Que la ubicación forme parte de la ruta asignada al terminal actual (`TMST_DETALLEORDENUBICACIONES` enlazado con `TMST_TERMINALES`).
  3. De las anteriores, la que tenga la fecha de caducidad más temprana.
  4. De tener misma caducidad, la que tenga más stock en la ubicación.
- Para lograr esto, se han convertido las validaciones de ruta a `LEFT JOIN` (evitando descartar localizaciones cuando se hace preparación libre no ruteada) y se ordena dinámicamente (`CASE WHEN TT.CODTERMINAL IS NOT NULL THEN 0 ELSE 1 END`).
- Se introdujo un `LEFT JOIN` con `TMST_TIPOSUNIDADARTICULO` (con código de tipo de unidad 3) para dotar de `FACTORCONVERSIONTIPOUNIDAD` a la línea (fallback a 1), ya que dicho campo no pertenece de base a `TMST_ARTICULOS` sino a los tipos de unidad de ese artículo.
