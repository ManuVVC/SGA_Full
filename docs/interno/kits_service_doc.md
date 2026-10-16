# Documentación del Módulo de Kits (SGA)

Esta documentación está estructurada en dos secciones: **Documentación Técnica**, orientada a los desarrolladores y mantenedores del sistema; y el **Manual de Usuario**, destinado a los operadores de almacén que ejecutan las operativas en la PDA.

---

## 💻 Documentación Técnica (Para Desarrolladores)

### Visión General
El módulo de Kits gestiona el ensamblado (**Montar Kits**) y desensamblado (**Desmontar Kits**) de artículos compuestos en el SGA. Integra directamente el paquete de base de datos Oracle **`GSM_LOTES`** y reutiliza al 100% las funciones existentes para la validación de ubicaciones (`ReubicacionesService.validar_ubicacion`) y búsqueda de artículos (`StockRepository.search_articles` / `ArticleSearchInput`).

### Arquitectura de Capas

```
PDA (React + Vite)
 ├── views/MontarKits.jsx / views/DesmontarKits.jsx
 └── api/kitsService.js (Cliente Axios centralizado)
       ↓ HTTP REST (/api/kits/* con @token_required)
Backend Flask (Python)
 ├── routes/kits_routes.py (Controlador HTTP)
 ├── services/kits_service.py (Lógica de Negocio desacoplada)
 └── repositories/kits_repo.py (Acceso a Datos y Bind Variables)
       ↓ Oracle Client (Modo Thick)
Oracle Database
 ├── Paquete GSM_LOTES (SPPRP_CrearLote, SPPRP_DESMONTARLOTES, SPPRP_CHECKUNIDADESPREPLOTE, GET_PERMITIRDESMONTARLOTE)
 ├── Tablas TMST_ARTICULOSCOMPUESTOS, TMST_ARTICULOS, TMST_UBICACIONESARTICULO
 └── Procedimientos auxiliares (SPREU_ReubicarUbicArticulo, SPEST_SaveVarMovimientoStock)
```

### Procedimientos de `GSM_LOTES` Empleados

#### 1. `GSM_LOTES.SPPRP_CHECKUNIDADESPREPLOTE`
- **Firma**: `FUNCTION SPPRP_CHECKUNIDADESPREPLOTE(p_CodUbicacion NUMBER, p_CodArticulo NUMBER, p_Cantidad NUMBER) RETURN NUMBER`
- **Comportamiento**: Recorre la tabla `TMST_ARTICULOSCOMPUESTOS` para el artículo kit y comprueba que en `TMST_UBICACIONESARTICULO` de la ubicación de origen exista stock suficiente de cada componente hijo para cubrir `p_Cantidad * rec.Unidades`.
- **Valores de Retorno**:
  - `0`: Stock suficiente para todos los componentes.
  - `-1`: Stock insuficiente de al menos un componente.

#### 2. `GSM_LOTES.SPPRP_CrearLote`
- **Firma**:
  ```sql
  PROCEDURE SPPRP_CrearLote(
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
- **Lógica interna**:
  - Da de alta el stock del artículo kit en la ubicación origen mediante `SPREU_ReubicarUbicArticulo`.
  - Recorre los componentes hijos en `TMST_ARTICULOSCOMPUESTOS`, descuenta las unidades correspondientes del stock de origen y registra el movimiento estadístico con `SPEST_SaveVarMovimientoStock` (concepto `c_CEST_DEL_ART_COMPOS_LOTE`).
  - Si la ubicación destino difiere del origen, reubica el kit terminado a la ubicación destino.

#### 3. Validación de Zonas de Almacén para Componentes
- **Función Oficial Empleada**: `GETPERMITIRUBICARARTICULOXZONA(p_CodUbicacion NUMBER, p_CodArticulo NUMBER) RETURN NUMBER`
- **Comportamiento**: En el paquete `GSM_LOTES` original existe la función `GET_PERMITIRDESMONTARLOTE`, la cual presenta una limitación conocida en su consulta SQL (`FULL OUTER JOIN ... WHERE AZ.CODZONAALMACEN IS NULL`), provocando que artículos componentes genéricos (que no tienen restricciones de zona en `TMST_ARTICULOSXZONASALMACEN` y pueden almacenarse en cualquier hueco) sean identificados erróneamente como incompatibles.
- Por ello, el backend SGA evalúa la compatibilidad de cada componente hijo mediante la función oficial y centralizada de Oracle `GETPERMITIRUBICARARTICULOXZONA` (la misma que emplea `SPREU_ReubicarUbicArticulo`).
- **Valores de Retorno**:
  - `1`: Todos los componentes pueden ubicarse válidamente en la ubicación.
  - `0`: Incompatibilidad de zonas física real detectada.

#### 4. `GSM_LOTES.SPPRP_DESMONTARLOTES`
- **Firma**:
  ```sql
  PROCEDURE SPPRP_DESMONTARLOTES(
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
- **Lógica interna**:
  - Verifica la existencia de stock para el `NumeroOrden` del kit en la ubicación.
  - Descuenta el kit del stock con concepto estadístico `c_CEST_DESMONTAR_LOTE`.
  - Reincorpora al stock en esa misma ubicación las piezas de cada componente hijo proporcionales a las unidades desmontadas (`p_Unidades * rec.Unidades`). Con `p_TipoActualizacion = 0`, realiza el desensamblado integral en un solo paso.

### Endpoints de la API Backend (`kits_routes.py`)

Todos los endpoints requieren autenticación mediante cabecera `Authorization: Bearer <token>` (`@token_required`).

| Endpoint | Método | Parámetros / Body | Descripción |
| :--- | :---: | :--- | :--- |
| `/api/kits/<cod_articulo>/composicion` | `GET` | Query param opcional: `cod_ubicacion` | Devuelve la lista de componentes de un kit, su ratio y el stock actual en la ubicación. |
| `/api/kits/validar-montaje` | `POST` | `{"cod_ubicacion": int, "cod_articulo": int, "cantidad": float}` | Invoca `SPPRP_CHECKUNIDADESPREPLOTE`. |
| `/api/kits/montar` | `POST` | `{"cod_ubicacion_origen": int, "cod_articulo": int, "cantidad": float, "fecha_caducidad": str, "numero_lote": str, "cod_ubicacion_destino": int}` | Ejecuta `SPPRP_CrearLote`. |
| `/api/kits/ubicacion/<cod_ubicacion>` | `GET` | Ninguno (en URL) | Lista los kits con stock en la ubicación y evalúa compatibilidad de zonas. |
| `/api/kits/validar-desmontaje` | `POST` | `{"cod_ubicacion": int, "cod_articulo": int, "numero_orden": int, "unidades": float}` | Valida zonificación y stock para desmontar. |
| `/api/kits/desmontar` | `POST` | `{"cod_ubicacion": int, "cod_articulo": int, "numero_orden": int, "unidades": float, "tipo_actualizacion": 0}` | Ejecuta `SPPRP_DESMONTARLOTES`. |

---

### Adaptabilidad y Ergonomía en Pantallas Reducidas (PDA)

Con el fin de garantizar una correcta visualización en terminales industriales (Zebra TC21/TC26, Memor 10, etc.) y en simulaciones de pantalla de baja altura o con teclado virtual activo, las vistas `MontarKits.jsx` y `DesmontarKits.jsx` incorporan un diseño responsivo optimizado:

1. **Modo Compacto de Búsqueda (`ArticleSearchInput` y `SearchTypeToggle`)**:
   - Incorporan la propiedad `compact={true}`.
   - El selector de tipo de búsqueda (`EAN`, `Interno`, `Fabr.`, `Descrip.`) se renderiza como una barra horizontal delgada con iconos de 14px (`h-3.5 w-3.5`), reduciendo la altura vertical de 55px a 24px.
   - El input de texto y el botón "Buscar" se alinean en la misma fila horizontal (`flex gap-1.5 items-stretch`), reduciendo el espacio ocupado por el buscador de más de 220px a menos de 70px.

2. **Píldoras de Estado Ultra-Compactas**:
   - Los resúmenes de ubicación y artículo kit seleccionado se muestran en barras horizontales delgadas de una sola línea con enlace "Cambiar" a la derecha, ahorrando más de 30px verticales por tarjeta.

3. **Visibilidad Prioritaria de Kits Disponibles (`DesmontarKits.jsx`)**:
   - En el Paso 2 de Desmontar Kits, los kits ya cargados en la ubicación se muestran inmediatamente accesibles en tarjetas compactas (45px de alto por kit con código, lote, caducidad y stock).
   - El operario puede tocar directamente el kit sin verse forzado a hacer scroll hacia abajo.

4. **Selectores Táctiles Ergonómicos de Cantidad (`[-]` y `[+]`)**:
   - Tanto en montaje como en desmontaje, el campo de cantidad incluye botones táctiles grandes de incremento y decremento rápido para agilizar la operativa sin obligar a abrir el teclado en pantalla.

5. **Contenedores Flexibles con Scroll Adaptativo**:
   - Se utiliza `flex-1 min-h-0 overflow-y-auto` con paddings adaptativos (`p-2 sm:p-3`, `gap-2`), evitando desbordamientos de pantalla en cualquier resolución.

---

## 📖 Manual de Usuario (Para Operadores de Almacén)

Las opciones de montaje y desmontaje de kits se encuentran disponibles en la PDA dentro del menú **UTILIDADES**:
- **Montar Kits**: Accesible para todos los operarios con acceso al menú de utilidades.
- **Desmontaje Kits**: Requiere que el terminal cuente con el permiso de sistema `PRM_DESMONTARKIT`.

---

### 1. Montar Kits (Ensamblado)

Esta operativa te permite fabricar o preparar artículos compuestos (packs o kits promocionales) a partir de los productos sueltos (componentes) disponibles en una ubicación.

#### Paso a paso:
1. **Escanear Ubicación de Origen**:
   - Lee el código de barras del hueco donde tienes almacenados los componentes.
   - *Nota*: Si la etiqueta engloba varios huecos unidos, selecciona la **Posición** correspondiente en la pantalla táctil.
2. **Escanear o Buscar el Kit**:
   - Escanea el código de barras (EAN), el código interno o busca por nombre el kit que vas a montar mediante el buscador compacto superior.
   - La pantalla validará automáticamente que sea un kit configurado y te mostrará la lista de componentes necesarios con sus unidades por kit.
3. **Indicar Cantidad de Kits**:
   - Ajusta la cantidad utilizando los botones táctiles **`[-]`** y **`[+]`** o teclea la cifra directamente.
   - En la parte superior verás el **Máximo posible** según las existencias de componentes en esa ubicación.
   - La lista de componentes te indicará en verde (`✓ OK`) los que tienen stock suficiente y en rojo (`✗ Falta`) si falta material.
   - Pulsa **Continuar**. El sistema validará que haya existencias suficientes antes de avanzar.
4. **Trazabilidad y Destino**:
   - Si el kit gestiona fecha de caducidad, introduce la fecha correspondiente.
   - Si el kit gestiona lote, indica o escanea el número de lote.
   - **Ubicación Destino**: Por defecto se guardará en la misma ubicación donde estabas trabajando. Si deseas trasladar los kits terminados a otra estantería, pulsa "Cambiar Destino" y escanea la nueva ubicación.
5. **Confirmar Montaje**:
   - Pulsa **Confirmar y Montar Kit**.
   - El sistema dará de alta los kits terminados y descontará automáticamente las piezas de los componentes utilizados.

---

### 2. Desmontaje de Kits (Desensamblado)

Esta operativa te permite deshacer un pack o kit existente en el almacén, dando de baja el artículo kit y devolviendo todos sus componentes al stock disponible.

#### Paso a paso:
1. **Escanear Ubicación**:
   - Escanea la estantería o hueco donde se encuentra el kit que vas a desarmar.
2. **Seleccionar el Kit a Desmontar**:
   - El sistema te mostrará automáticamente en pantalla la lista de kits disponibles en esa ubicación con su stock, código, lote y fecha de caducidad.
   - Con un **único toque táctil** sobre el kit de la lista podrás seleccionarlo para avanzar.
   - Si lo prefieres o si hay muchos artículos, puedes usar el lector láser para escanear directamente el código de barras en el buscador rápido.
   - *Restricción de zona*: Si algún kit no se puede desmontar en esa zona debido a incompatibilidad de sus componentes, aparecerá claramente indicado y no permitirá seleccionarlo.
3. **Indicar Cantidad a Desmontar**:
   - Ajusta las unidades a desmontar mediante los botones táctiles **`[-]`** / **`[+]`** o escribe la cifra.
   - Verás en tiempo real un desglose compacto con las unidades exactas de cada componente que se van a reincorporar al almacén.
   - Pulsa **Continuar**.
4. **Confirmar Desmontaje**:
   - Revisa el resumen de la operación.
   - Pulsa **Confirmar y Desmontar Kit**.
   - Los kits se darán de baja y los productos componentes quedarán inmediatamente disponibles en la ubicación para su posterior preparación o venta.
