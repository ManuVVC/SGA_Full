# Operaciones de Terminal (GSM_TERMINALES)

Este documento recoge las constantes utilizadas en el paquete de base de datos `GSM_TERMINALES` para identificar el tipo de operación que se está realizando en los terminales (PDAs).

Estas constantes deben usarse cuando se llame a procedimientos PL/SQL como `SPPRP_CARGARMERCANCIATERMINAL`, `SPGET_UBICACIONTERMINAL`, etc., en el parámetro `P_CODOPERACIONTERMINAL`.

```sql
-- Public constant declarations
c_OPTERM_PREP_DOC_CLIENTE     CONSTANT NUMBER := 1;
c_OPTERM_REUBICACION          CONSTANT NUMBER := 2;
c_OPTERM_ENTRADA_MERCANCIA    CONSTANT NUMBER := 3;
c_OPTERM_DEVOLUCION_PROV      CONSTANT NUMBER := 5;
c_OPTERM_PREP_DOC_DIRECTO     CONSTANT NUMBER := 6;
c_OPTERM_MONTAR_PALET         CONSTANT NUMBER := 7;
c_OPTERM_MODIF_SOLIC_PREP_DOC CONSTANT NUMBER := 8;
c_OPTERM_REPARTO_XDOCK_JAULA  CONSTANT NUMBER := 11;
c_OPTERM_REPARTO_XDOCK_BULTO  CONSTANT NUMBER := 12;
```

## Mapeo en el Backend
- Para la preparación de pedidos estándar (cliente), se utiliza **1** (`c_OPTERM_PREP_DOC_CLIENTE`).

## Procedimientos Clave en el Flujo de Preparación
1. **`SPGET_NUMLINEASPENDIENTES(P_CODDOCUMENTO)`**: Devuelve un entero (`NUMBER`) con la cantidad de líneas que quedan pendientes por preparar en el documento. Se utiliza al finalizar la carga de una línea para verificar rápidamente si el pedido ha sido completado sin necesidad de traer todo el listado de líneas pendientes.
2. **`SPPRP_GET_UNIDSPREPDOCXUBIC`**: Se ejecuta justo antes de llamar a `SPPRP_CARGARMERCANCIATERMINAL`. Verifica si el operario ya tiene unidades preparadas en su carrito para esa misma combinación de documento, línea, artículo y ubicación.
   - Parámetros `IN`: `P_CODDOCUMENTO`, `P_NUMLINEA`, `P_CODUBICACION`, `P_CODARTICULO`, `P_FECHACADUCIDAD`, `P_NUMEROLOTE`, `P_CODTERMINAL`.
   - Parámetros `OUT`: `P_UNIDADESPREPARADAS`, `P_UNIDADESPREPARADASMISMAFECHA`, `P_PESOPREPEPARADO`, `P_PESOPREPARADOMISMAFECHA`.
3. **`SPPRP_CARGARMERCANCIATERMINAL` y Gestión de EAN**: Al registrar la mercancía preparada en una línea, se informan los parámetros correspondientes a la modalidad de identificación del artículo escaneada por el operario:
   - `P_TIPOCODIGOINTRODUCIDO`: Toma el valor **`1`** si el operario identificó el artículo escaneando o introduciendo un código EAN (en el selector de tipo de búsqueda `codfacturacion`). En caso de usar el código interno (`codarticuloaplicacion`) o descripción (`nombrearticulo`), toma el valor **`0`**.
   - `P_CODFACTURACION`: En caso de que `P_TIPOCODIGOINTRODUCIDO = 1`, se envía la cadena exacta del código EAN que el operario escaneó en la PDA. En caso de que `P_TIPOCODIGOINTRODUCIDO = 0`, se envía el código interno del artículo (`CODARTICULOAPLICACION`). El repositorio backend dispone de un mecanismo de respaldo para consultar y asegurar este código si no llegara informado desde el cliente.
4. **Envío de Lotes (`NUMEROLOTE` vs `CODNUMEROLOTE`)**: Tanto en `SPPRP_GET_UNIDSPREPDOCXUBIC` como en `SPPRP_CARGARMERCANCIATERMINAL`, el parámetro `P_NUMEROLOTE` espera recibir la **cadena real del número de lote** del proveedor (`NUMEROLOTE`, p. ej. "LOTE-2026-X"), y **nunca** el identificador interno numérico (`CODNUMEROLOTE`, p. ej. "1004"). Para garantizar esto, la consulta en `get_stock_lotes` realiza un `LEFT JOIN` con `GSM.TMST_NUMEROSLOTESPROVEEDORES` para exponer `NUMEROLOTE`, que el cliente PDA envía prioritaria y sistemáticamente.
5. **Registro de Recorrido (`SPPRP_SAVERECORRIDOPREPARACION`)**: Justo tras ejecutar la carga de mercancía en el terminal (`SPPRP_CARGARMERCANCIATERMINAL`), y dentro de la misma transacción antes de confirmar (`commit`), el backend llama al procedimiento `SPPRP_SAVERECORRIDOPREPARACION`. Este procedimiento almacena la traza histórica en `TPRP_RecorridoPreparacionDoc`, para lo cual se consulta en el servidor el `CODHUECO` de la ubicación de origen y se transmiten los 12 parámetros argumentales exactos (`P_CODDOCUMENTO`, `P_NUMLINEA`, `P_CODTERMINAL`, `P_CODHUECO`, `P_CODUBICACION`, `P_CODARTICULO`, `P_FECHACADUCIDAD`, `P_NUMEROLOTE`, `P_CANTPREPARADA`, `P_PESO`, `P_CANTDEVUELTA`, `P_CADCODNUMEROSDESERIE`).
6. **Actualización de Línea de Documento (`TMST_LineasDocumentoCliente`)**: Como punto final del proceso de carga y tras guardar el recorrido, el sistema calcula la cantidad total preparada de la línea sumando el historial (`SELECT NVL(SUM(CantPreparada) - SUM(CantDevuelta), 0) FROM TPRP_RecorridoPreparacionDoc WHERE CodDocumento = :1 AND NumLinea = :2`). A continuación, ejecuta un `UPDATE` en `TMST_LineasDocumentoCliente` para reflejar dicha `CantPreparada`, así como `TipoCodigoIntroducido` y `CodigoIntroducido` con los datos de identificación utilizados en el escaneo, preservando o estableciendo en sus valores por defecto los factores y unidades de conversión de la línea (`CodTipoUnidad`, `FactorConversionTipoUnidad`, `TipoConvFactConvSegunUnidadAlm`, `FactorConverSegunUnidadAlmacen`, `CantSegundaUnidadPreparada`, `DespreciarPendiente`).


