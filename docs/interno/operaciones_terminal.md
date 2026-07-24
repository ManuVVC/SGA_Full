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
