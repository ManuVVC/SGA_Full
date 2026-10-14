# Documentación del Servicio de Devoluciones

## 1. Documentación Técnica

### Resumen Arquitectónico
El `DevolucionesService` gestiona el flujo del negocio cuando la mercancía retorna al almacén. Se encarga de validar reglas operativas antes de solicitar las persistencias en base de datos, garantizando que todo documento tenga su cabecera y líneas correctamente procesadas.

### Estructura de Métodos

#### `get_parametros_devolucion()`
- **Propósito:** Lee variables de entorno operativas desde BD.
- **Reglas del Negocio:**
  - Código `1636`: Determina si el sistema exige preguntar al usuario en qué ubicación dejar la mercancía devuelta (0 = asume ubicación por defecto, otro = solicitar ubicación).
  - Código `1637`: El código de la ubicación por defecto a utilizar.
  - Código `1768`: La serie documental utilizada para registrar el movimiento en el ERP.

#### `crear_devolucion_cabecera(payload)`
- **Validación:** Comprueba estrictamente la presencia de `CODCLIENTE`.

#### `grabar_linea_devolucion(payload)`
- **Validaciones Críticas:** Requiere obligatoriamente `CODDOCUMENTO`, `CODARTICULO` y que `UNIDADES` sea un número entero mayor a 0.

#### `finalizar_devolucion(cod_documento)`
- **Propósito:** Cierra el ciclo del documento de devolución, dejando los registros confirmados y listos para la integración con sistemas externos (ERP).

---

## 2. Manual de Usuario (Para Operadores)

### Gestión de Devoluciones de Clientes

Este módulo le permite reingresar al almacén mercancía que ha sido retornada por un cliente (por error en envío, mercancía dañada o cancelaciones).

### Pasos para realizar una devolución:

1. **Buscar el Cliente:**
   En el buscador, introduzca el nombre o código del cliente. El sistema le sugerirá coincidencias para iniciar el proceso.

2. **Crear la Cabecera de Devolución:**
   Al seleccionar al cliente, se generará internamente un Documento (o "Cabecera") que agrupará todos los productos devueltos.

3. **Escanear Artículos (Líneas de Devolución):**
   - Lea el código de barras del producto devuelto (o introdúzcalo a mano).
   - Indique la **cantidad**. El sistema no permite ingresar cantidad 0 ni negativa.
   - Según la configuración del almacén, el sistema puede preguntarle en qué ubicación va a dejar la mercancía, o puede asignarla automáticamente a una zona predeterminada (por ejemplo, "Zona de Cuarentena" o "Control de Calidad").

4. **Finalizar:**
   Cuando termine de ingresar todos los productos del cliente, pulse en **Finalizar Devolución**. Esto cerrará el documento para que contabilidad y stock central reciban la actualización inmediata.
