# Plan de Implementación: Montar y Desmontar Kits en PDA

## 1. Introducción y Objetivos
Este documento define la arquitectura y el plan de implementación detallado para incorporar en los terminales de almacén (PDA) las operativas de **Montar Kits** (ensamblado de artículos compuestos) y **Desmontar Kits** (desensamblado de artículos compuestos), integrando el paquete PL/SQL `GSM_LOTES` existente en la base de datos Oracle del SGA.

De acuerdo a las directrices de arquitectura:
- Se utilizarán **estrictamente los procedimientos y funciones internas del paquete `GSM_LOTES`**.
- Se **reutilizarán al 100% las funciones y componentes ya implementados** en el sistema para la búsqueda y validación de artículos, ubicaciones y lotes, evitando crear funciones duplicadas.
- Se respetará el patrón de capas desacopladas (Clean Architecture) en el backend y el patrón estándar de pantallas de la PDA (asistente guiado por pasos, inputs táctiles grandes, gestión de escáner y teclado virtual).

---

## 2. Reutilización de Funciones Existentes

Para cumplir con la directriz de evitar crear nuevas funciones de búsqueda o validación, se reutilizarán los siguientes elementos ya existentes en el ecosistema SGA:

### 2.1. Búsqueda y Validación de Ubicaciones
- **Backend**:
  - `ReubicacionesService.validar_ubicacion(input_value, posicion)`: Resuelve y valida la ubicación tanto por código interno numérico (`CODUBICACION`), nombre corto (`NOMBRECORTO`), o código de etiqueta de hueco (`CODETIQUETA`). Maneja automáticamente casos de etiquetas con múltiples posiciones (`necesita_posicion`).
  - Repositorio subyacente: `ReubicacionesRepository.get_ubicacion_by_codigo`, `get_ubicacion_by_nombre_corto` y `get_ubicaciones_by_etiqueta`.
- **Frontend PDA**:
  - `validarUbicacion(ubicacion, posicion)` de `src/api/reubicacionesService.js` (comunicación con endpoint `POST /reubicaciones/validar-ubicacion`).
  - Modal estándar de selección de posición cuando una etiqueta agrupa múltiples huecos físicos.

### 2.2. Búsqueda y Validación de Artículos
- **Backend**:
  - `StockService.search_articles(query, search_type)` / `StockRepository.search_articles`: Búsqueda flexible por EAN (`codfacturacion`), código interno (`codigo`), fabricante (`fabricante`, con soporte del parámetro dinámico 1690) y descripción (`descripcion`).
  - `StockRepository.get_articulo_por_codigo`: Búsqueda directa por código interno numérico o alfanumérico.
  - `ReubicacionesService.validar_articulo`: Validación y resolución unificada en cascada.
- **Frontend PDA**:
  - Componente `ArticleSearchInput` (`src/components/ArticleSearchInput.jsx`): Componente visual estándar que incluye selector de tipo de búsqueda, integración con el parámetro 1690, soporte para escaneo GS1-128 con extracción de EAN, lote y caducidad, y selector modal en caso de coincidencias múltiples.

### 2.3. Consulta y Selección de Lotes en Ubicación
- **Backend**:
  - `ReubicacionesService.obtener_lotes_disponibles(cod_ubicacion, cod_articulo)`: Retorna los lotes físicos existentes (`TMST_UBICACIONESARTICULO` con `Stock > 0`).
- **Frontend PDA**:
  - `obtenerLotesDisponibles` de `src/api/reubicacionesService.js`.
  - Modales estándar de selección de lotes existentes en pantallas como `ReubicacionLibre.jsx`.

---

## 3. Integración con el Package PL/SQL `GSM_LOTES`

El paquete `GSM_LOTES` en la base de datos Oracle contiene la lógica oficial del negocio para el tratamiento de kits y lotes compuestos:

### 3.1. Procedimientos y Funciones Empleados

#### A) Montaje de Kits:
1. **`GSM_LOTES.SPPRP_CHECKUNIDADESPREPLOTE`**:
   - **Firma**: `FUNCTION SPPRP_CHECKUNIDADESPREPLOTE(p_CodUbicacion IN NUMBER, p_CodArticulo IN NUMBER, p_Cantidad IN NUMBER) RETURN NUMBER`
   - **Uso**: Valida antes de ejecutar el montaje que en la ubicación de origen exista stock suficiente de todos y cada uno de los componentes hijos definidos en `TMST_ARTICULOSCOMPUESTOS` para cubrir `p_Cantidad * rec.Unidades`.
   - **Retorno**:
     - `0`: Stock suficiente para todos los componentes.
     - `-1`: Stock insuficiente de al menos un componente.

2. **`GSM_LOTES.SPPRP_CrearLote`**:
   - **Firma**:
     ```sql
     PROCEDURE SPPRP_CrearLote (
       p_CodTerminal         IN NUMBER,
       p_CodUbicacionOrigen  IN NUMBER,
       p_CodArticulo         IN NUMBER,
       p_Stock               IN NUMBER,
       p_FechaCaducidad      IN DATE DEFAULT NULL,
       p_Peso                IN NUMBER DEFAULT 0,
       p_CodUbicacionDestino IN NUMBER DEFAULT NULL,
       p_CodPalet            IN NUMBER DEFAULT NULL,
       p_CodFacturacion      IN VARCHAR2 DEFAULT NULL,
       p_NumeroLote          IN VARCHAR2 DEFAULT NULL
     );
     ```
   - **Operativa interna**:
     - Incrementa el stock del artículo kit en la ubicación origen mediante `SPREU_ReubicarUbicArticulo`.
     - Recorre los componentes hijos en `TMST_ARTICULOSCOMPUESTOS`, descuenta las unidades correspondientes en `TMST_UBICACIONESARTICULO` y registra la traza estadística con `SPEST_SaveVarMovimientoStock` (concepto `c_CEST_DEL_ART_COMPOS_LOTE`).
     - Si la ubicación destino es distinta a la de origen, reubica el kit terminado hacia la ubicación de destino.

#### B) Desmontaje de Kits:
1. **`GSM_LOTES.GET_PERMITIRDESMONTARLOTE`**:
   - **Firma**: `FUNCTION GET_PERMITIRDESMONTARLOTE(p_CodUbicacion IN NUMBER, p_CodArticulo IN NUMBER) RETURN NUMBER`
   - **Uso**: Verifica la zonificación de almacén. Comprueba si los artículos hijos que componen el kit pueden ubicarse en la zona física a la que pertenece la ubicación donde se encuentra el kit.
   - **Retorno**:
     - `1`: Permitido desmontar en esa ubicación.
     - `0`: No permitido (incompatibilidad de zonas de almacén).

2. **`GSM_LOTES.SPPRP_DESMONTARLOTES`**:
   - **Firma**:
     ```sql
     PROCEDURE SPPRP_DESMONTARLOTES (
       p_CodArticulo         IN NUMBER DEFAULT NULL,
       p_CodUbicacion        IN NUMBER DEFAULT NULL,
       p_NumeroOrden         IN NUMBER DEFAULT NULL,
       p_Unidades            IN NUMBER DEFAULT NULL,
       p_CodTerminal         IN NUMBER DEFAULT NULL,
       p_TipoActualizacion   IN NUMBER DEFAULT NULL,
       p_CodComponente       IN NUMBER DEFAULT NULL,
       p_NumLote             IN VARCHAR2 DEFAULT NULL,
       p_FechaCaducidad      IN DATE DEFAULT NULL,
       p_SolLoteComp         IN NUMBER DEFAULT NULL,
       p_SolFecCaducidadComp IN NUMBER DEFAULT NULL
     );
     ```
   - **Operativa interna**:
     - Verifica que exista stock suficiente del kit en la ubicación y número de orden especificados.
     - Descuenta las unidades del kit de la ubicación origen (`SPREU_ReubicarUbicArticulo` con concepto estadístico `c_CEST_DESMONTAR_LOTE`).
     - Reincorpora los artículos hijos en la ubicación con las cantidades proporcionales (`p_Unidades * rec.Unidades`), heredando o asignando trazabilidad y fecha de caducidad según el modo de actualización (`p_TipoActualizacion = 0` para desmontaje integral).

---

## 4. Arquitectura de la Solución

### 4.1. Backend (Flask / Python)

Siguiendo la arquitectura limpia de SGA:

1. **Capa Repositorio (`backend/app/repositories/kits_repo.py`)**:
   - `get_composicion_kit(cod_articulo)`: Consulta los componentes del kit desde `TMST_ARTICULOSCOMPUESTOS` junto a nombres y parámetros de trazabilidad de `TMST_ARTICULOS`.
   - `get_kits_con_stock_en_ubicacion(cod_ubicacion)`: Obtiene los artículos compuestos que actualmente poseen stock disponible en la ubicación indicada.
   - `check_unidades_prep_lote(cod_ubicacion, cod_articulo, cantidad)`: Ejecuta `GSM_LOTES.SPPRP_CHECKUNIDADESPREPLOTE`.
   - `crear_lote_kit(terminal, ubi_origen, cod_articulo, cantidad, caducidad, peso, ubi_destino, palet, cod_facturacion, num_lote)`: Ejecuta `GSM_LOTES.SPPRP_CrearLote`.
   - `permitir_desmontar_lote(cod_ubicacion, cod_articulo)`: Ejecuta `GSM_LOTES.GET_PERMITIRDESMONTARLOTE`.
   - `desmontar_lote(cod_articulo, cod_ubicacion, numero_orden, unidades, terminal, tipo_actualizacion)`: Ejecuta `GSM_LOTES.SPPRP_DESMONTARLOTES`.

2. **Capa Servicio (`backend/app/services/kits_service.py`)**:
   - `consultar_composicion_kit(cod_articulo, cod_ubicacion=None)`: Obtiene los componentes y calcula el stock actual de cada hijo en la ubicación origen y el máximo de kits ensamblables.
   - `validar_montaje_kit(cod_ubicacion, cod_articulo, cantidad)`: Valida existencia del kit, parámetros y ejecuta `check_unidades_prep_lote`.
   - `ejecutar_montaje_kit(datos_montaje, cod_terminal)`: Orquesta la ejecución de `crear_lote_kit` controlando transacciones y excepciones Oracle.
   - `listar_kits_desmontables(cod_ubicacion)`: Devuelve los kits con stock en la ubicación que cumplen `permitir_desmontar_lote`.
   - `validar_desmontaje_kit(cod_ubicacion, cod_articulo, numero_orden, unidades)`: Comprueba la viabilidad y permisos de zona con `permitir_desmontar_lote`.
   - `ejecutar_desmontaje_kit(datos_desmontaje, cod_terminal)`: Invoca `desmontar_lote` bajo `p_TipoActualizacion = 0`.

3. **Capa Controlador (`backend/app/routes/kits_routes.py`)**:
   - Endpoints protegidos con `@token_required`:
     - `GET /api/kits/<int:cod_articulo>/composicion?cod_ubicacion=<int>`: Obtiene la ficha de componentes y disponibilidad.
     - `POST /api/kits/validar-montaje`: Valida viabilidad de montaje mediante `SPPRP_CHECKUNIDADESPREPLOTE`.
     - `POST /api/kits/montar`: Ejecuta el montaje de kits (`SPPRP_CrearLote`).
     - `GET /api/kits/ubicacion/<int:cod_ubicacion>`: Obtiene los kits presentes en la ubicación listos para desensamblar.
     - `POST /api/kits/validar-desmontaje`: Valida zonificación (`GET_PERMITIRDESMONTARLOTE`) y stock de orden.
     - `POST /api/kits/desmontar`: Ejecuta el desmontaje de kits (`SPPRP_DESMONTARLOTES`).

### 4.2. Frontend PDA (React + Tailwind)

1. **Cliente API (`pda/src/api/kitsService.js`)**:
   - Métodos Axios conectados a `/api/kits/*`. Reutiliza `validarUbicacion` de `reubicacionesService.js`.

2. **Vistas PDA**:
   - **`pda/src/views/MontarKits.jsx`**:
     - *Paso 1: Ubicación Origen*: Escaneo con `validarUbicacion` (modal de posiciones si aplica).
     - *Paso 2: Artículo Kit*: Escaneo con `ArticleSearchInput`. Comprobación automática de que es kit. Visualización de lista de componentes y stock disponible.
     - *Paso 3: Cantidad a Montar*: Entrada numérica con cálculo en vivo de necesidad de componentes y validación con `SPPRP_CHECKUNIDADESPREPLOTE`.
     - *Paso 4: Trazabilidad y Destino (si aplica)*: Solicitud de fecha de caducidad y número de lote si el kit lo gestiona. Ubicación destino opcional (por defecto la de origen).
     - *Paso 5: Resumen y Confirmación*: Botón grande de confirmación y feedback táctil/sonoro.
   - **`pda/src/views/DesmontarKits.jsx`**:
     - *Paso 1: Ubicación*: Escaneo de ubicación origen con `validarUbicacion`.
     - *Paso 2: Selección de Kit*: Lista táctil de kits con stock en la ubicación o escaneo con `ArticleSearchInput`. Comprobación de zonas con `GET_PERMITIRDESMONTARLOTE`.
     - *Paso 3: Cantidad a Desmontar*: Ingreso de unidades (con control de máximo según stock del número de orden). Muestra el desglose de componentes que se reintegrarán.
     - *Paso 4: Confirmación y Desmontaje*: Ejecución de `SPPRP_DESMONTARLOTES` y notificación de stock liberado.

3. **Navegación y Rutas**:
   - En `pda/src/views/SubMenus.jsx`:
     - Activar ruta `/utilidades/montar-kits` para `Montar Kits`.
     - Activar ruta `/utilidades/desmontar-kits` para `Desmontaje Kits` (controlado con `hasPermission('PRM_DESMONTARKIT')`).
   - En `pda/src/App.jsx`:
     - Registrar las rutas `<Route path="/utilidades/montar-kits" element={<PrivateRoute><MontarKits /></PrivateRoute>} />` y `<Route path="/utilidades/desmontar-kits" element={<PrivateRoute><DesmontarKits /></PrivateRoute>} />`.

---

## 5. Fases de Ejecución

1. **Fase 1: Backend (Repositorio, Servicio y Rutas)**:
   - Crear `kits_repo.py` implementando las llamadas seguras a `GSM_LOTES` con bind variables.
   - Crear `kits_service.py` con las reglas de negocio y reutilización de validaciones.
   - Crear `kits_routes.py` y registrar el blueprint en `register_routes`.
   - Pruebas de integración del backend ejecutando llamadas contra Oracle.

2. **Fase 2: Servicios de API en Frontend PDA**:
   - Crear `pda/src/api/kitsService.js` enlazado a los nuevos endpoints.

3. **Fase 3: Desarrollo de la Vista "Montar Kits" en PDA**:
   - Implementar `pda/src/views/MontarKits.jsx` integrando `TerminalHeader`, `ArticleSearchInput` y `validarUbicacion`.
   - Validar flujos de kits con trazabilidad y sin trazabilidad.

4. **Fase 4: Desarrollo de la Vista "Desmontar Kits" en PDA**:
   - Implementar `pda/src/views/DesmontarKits.jsx` con control de permisos `PRM_DESMONTARKIT` y validación de zonas `GET_PERMITIRDESMONTARLOTE`.

5. **Fase 5: Integración en Menús, Rutas y Verificación Global**:
   - Configurar `SubMenus.jsx` y `App.jsx`.
   - Pruebas completas de ciclo de vida (montar kits -> verificar stock y componentes -> desmontar kits -> verificar restitución de componentes).

6. **Fase 6: Documentación Final**:
   - Crear `docs/interno/kits_service_doc.md` (documentación técnica y manual de usuario para operadores).
   - Actualizar `docs/interno/operaciones_terminal.md`.
