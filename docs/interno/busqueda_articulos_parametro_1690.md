# Búsqueda de Artículos por Código de Fabricante (Parámetro 1690)

## Resumen Ejecutivo
En todo el sistema SGA, la introducción y búsqueda de artículos soporta de forma estándar tres métodos de resolución: **EAN** (`CODFACTURACION`), **Código Interno** (`CODARTICULOAPLICACION` o `CODARTICULO`) y **Descripción** (`NOMBREARTICULO`).

Con la activación del parámetro del sistema **1690** (almacenado en `GSM.TSYS_PARAMETROSXAMBITO`), se habilita una cuarta vía de búsqueda subordinada: **Código de Fabricante** (`CODREALFABRICANTE` de la tabla `GSM.TMST_ARTICULOS`).

---

## Reglas de Negocio y Orden de Resolución

1. **Jerarquía en Búsqueda Automática (`auto` / `general`)**:
   Cuando un operario o sistema externo realiza una consulta sin especificar el tipo exacto, el motor sigue este orden estricto:
   1. Búsqueda por EAN exacto o patrón LIKE en `GSM.TMST_CODFACTURACION`.
   2. Búsqueda por Código Interno / Comercial en `GSM.TMST_ARTICULOS.CODARTICULOAPLICACION`.
   3. **Búsqueda por Código de Fabricante en `GSM.TMST_ARTICULOS.CODREALFABRICANTE` (Sólo si el parámetro 1690 está activo)**.
   4. Búsqueda por Descripción (`NOMBREARTICULO`).

2. **Insensibilidad a Mayúsculas/Minúsculas**:
   Todas las comparaciones contra `CODREALFABRICANTE` se ejecutan empleando la función `UPPER()` en SQL, garantizando que búsquedas como `"fab-123"`, `"FAB-123"` o `"Fab-123"` resuelvan idénticamente.

3. **Gestión de Ambiguos (Multiselección)**:
   Si dos o más artículos comparten exactamente el mismo Código de Fabricante, el sistema no asigne automáticamente ninguno. En su lugar, el motor retorna un listado de candidatos (`status: multiples_resultados` o lista en `/stock/search`), presentando en la PDA un modal interactivo para que el operario seleccione el artículo correcto.

---

## Componentes Modificados y Arquitectura

### 1. Utilidades y Configuración Backend
- **`backend/app/utils/parametros.py`**: Módulo centralizado que consulta y evalúa `GSM.TSYS_PARAMETROSXAMBITO`. Exponiendo `get_parametro(cod)` e `is_parametro_activo(cod)`.
- **`backend/app/routes/utilidades_routes.py`**: Nuevo endpoint REST `GET /api/utilidades/parametro/<id>` para permitir al frontend consultar la configuración en tiempo de ejecución de manera segura y autenticada.

### 2. Capa de Acceso a Datos (Repositorios)
- **`StockRepository` (`backend/app/repositories/stock_repo.py`)**:
  - Incorpora la columna `CODREALFABRICANTE` en todas las proyecciones de consultas de artículos.
  - En `search_articulos`: Añade soporte para `type="codrealfabricante"` y `type="fabricante"`, e incluye el filtro en la búsqueda general cuando el parámetro 1690 está activo. Además, incorpora un mecanismo de *fallback* automático hacia `CODREALFABRICANTE` si la búsqueda en modo EAN o código interno no produce resultados.
  - En `get_articulo_por_codigo` y `get_articulo_por_ean`: Implementa un fallback automático hacia `CODREALFABRICANTE` si la consulta original no produce coincidencias y el parámetro 1690 está activo.
- **`ReubicacionesRepository` (`backend/app/repositories/reubicaciones_repo.py`)**:
  - Nuevo método `get_articulo_por_cod_fabricante(cod_fabricante)` para la validación rápida en movimientos de almacén y ajustes de inventario.
- **`EntradasRepository` y `DevolucionesRepository` (`entradas_repo.py`, `devoluciones_repo.py`)**:
  - Se añade el parámetro `1690` en los listados de configuración devueltos al inicializar pantallas de entrada y devolución.
  - En `get_info_articulo_por_ean` de entradas se añade fallback a fabricante si no se encuentra EAN exacto ni recortado.

### 3. Frontend y Experiencia de Usuario (PDA)
- **`ArticleSearchInput.jsx` y `StockQuery.jsx` (Info Artículo)**:
  - Consultan en su inicialización el endpoint `/api/utilidades/parametro/1690`.
  - Propagan al componente de selección de filtros el estado `param1690Active`.
  - Configuran el teclado virtual en modo `text` cuando el operario selecciona búsqueda por Fabricante.
  - En `StockQuery.jsx` (módulo de Info Artículo) se añade soporte completo para que el operario pueda elegir la opción de búsqueda por Fabricante y escanear códigos de fabricante sin restricciones de teclado numérico.
- **`StockResults.jsx`**:
  - Muestra la etiqueta `Fabr: [código]` tanto en los listados de selección múltiple de Info Artículo como en la cabecera del detalle de artículo seleccionado.
- **`SearchTypeToggle.jsx` (`pda/src/components/SearchTypeToggle.jsx`)**:
  - Renderiza dinámicamente el botón **"Fabr."** con el icono de fábrica (`Factory` de Lucide React) únicamente cuando `param1690Active` es `true`.

---

## Verificación y Mantenimiento
Para verificar el correcto funcionamiento en cualquier nuevo entorno o tras actualizaciones de base de datos:
1. Comprobar en SQL o PDA con el parámetro 1690 inactivo (`VALOR = '0'` o inexistente): El botón "Fabr." no debe aparecer y buscar por código de fabricante no devolverá resultados en modo general.
2. Activar parámetro 1690 (`UPDATE GSM.TSYS_PARAMETROSXAMBITO SET VALOR = '1' WHERE CODPARAMETRO = 1690;`): El botón "Fabr." aparecerá en la PDA y el escaneo de códigos de fabricante resolverá el artículo correctamente.
