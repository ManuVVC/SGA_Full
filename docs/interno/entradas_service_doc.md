# Documentación del Servicio de Entradas (Recepción de Mercancía)

Este documento detalla el diseño técnico y la guía de usuario para el flujo de recepción de mercancía (entradas) del SGA (Sistema de Gestión de Almacenes).

---

## 💻 Documentación Técnica (Para Desarrolladores)

### Descripción General
El servicio `EntradasService` (`entradas_service.py`) actúa como la capa de lógica de negocio (intermediario) entre los controladores de la API y los repositorios (`EntradasRepository`, `StockRepository`). Su principal responsabilidad es orquestar las operaciones de recepción, garantizando el flujo correcto desde la selección del muelle hasta el cierre del albarán.

### Dependencias y Arquitectura
- **Patrón:** Repository Pattern y Service Layer.
- **Módulos Requeridos:** `app.repositories.entradas_repo`, `app.repositories.stock_repo`, `app.utils.impresion`.
- **Registro (Logging):** Utiliza la librería estándar `logging` para capturar excepciones, warnings sobre impresoras y errores de capa de persistencia.

### Especificación de la API (Métodos del Servicio)

| Método | Descripción | Parámetros (Payload) | Respuesta / Códigos (Esperados) |
|---|---|---|---|
| `get_parametros_entrada()` | Obtiene parámetros de configuración de la entrada. | - | `{"status": "success", "parametros": [...]}` |
| `get_muelles()` | Lista los muelles disponibles. | - | `{"status": "success", "muelles": [...]}` |
| `get_albaranes_en_curso(codmuelle)` | Lista albaranes activos en un muelle específico. | `codmuelle: int` | `{"status": "success", "albaranes": [...]}` |
| `get_proveedores()` | Obtiene proveedores que tienen pedidos pendientes. | - | `{"status": "success", "proveedores": [...]}` |
| `get_pedidos(codproveedor)` | Obtiene pedidos pendientes agrupados por proveedor. | `codproveedor: int` | `{"status": "success", "pedidos": [...]}` |
| `crear_albaran(payload)` | Inicializa un nuevo albarán en sistema. | `dict` (datos del albarán) | `{"status": "success", "coddocumento": int}` |
| `grabar_linea(payload)` | Registra una entrada física de producto. Si se generan palets, manda imprimir las etiquetas SSCC automáticamente. | `dict` (EAN, UNIDADES, CODARTICULO opcional) | `{"status": "success", "coddocumento": int, "aviso_impresion": str}` |
| `finalizar_entrada(coddocumento, codoperador)` | Cierra el documento de entrada (albarán). | `coddocumento: int`, `codoperador: int` | `{"status": "success", "message": "..."}` |
| `get_articulo_info(ean)` | Obtiene el detalle logístico a partir de un EAN. | `ean: str` | `{"status": "success", "info": dict}` |

> [!NOTE]
> La función `grabar_linea` implementa un *fallback* automático: si el cliente o la pistola de RF envía únicamente el `EAN`, el servicio consulta el `CODARTICULO` en BBDD antes de guardarlo. Asimismo, la integración con impresoras se ejecuta síncronamente devolviendo _warnings_ mediante `aviso_impresion` si falla, sin abortar la transacción de persistencia.

---

## 📖 Manual de Usuario (Para Operadores)

### Recepción de Mercancía: Guía Paso a Paso

Bienvenido al módulo de recepción de mercancía. Sigue estos pasos para registrar la entrada de productos al almacén de forma rápida y sin errores.

**Paso 1: Preparación en el Muelle**
1. Accede al menú de **Entradas** en tu dispositivo o terminal.
2. Selecciona el **Muelle** en el que se encuentra aparcado el camión. Si ya existía una descarga a medias, verás una lista bajo "Albaranes en curso".

**Paso 2: Seleccionar Proveedor y Pedido**
1. Para comenzar a descargar, selecciona la opción para crear un nuevo albarán.
2. Elige el **Proveedor** de la lista (solo aparecerán aquellos que esperamos hoy).
3. Selecciona el número de **Pedido** que corresponde a la mercancía del camión. El sistema creará un albarán temporal para ti.

**Paso 3: Escaneo de Mercancía**
Esta es la parte principal de tu trabajo:
1. **Escanea el código de barras (EAN)** del producto con tu lector.
2. Introduce el número de **Unidades** que estás recibiendo de ese artículo.
3. Presiona confirmar. El sistema procesará el artículo. 
4. Si el sistema calcula que la mercancía forma un palet, **imprimirá automáticamente la etiqueta identificativa (SSCC)**. Pega esta etiqueta visiblemente en la carga.

**Paso 4: Revisiones Opcionales**
- ¿Dudas de si faltan cosas por bajar? Utiliza la opción **Ver líneas pendientes**.
- ¿Quieres comprobar si has pasado un palet dos veces? Utiliza **Ver líneas grabadas**.

**Paso 5: Cierre de la Descarga**
1. Cuando hayas escaneado el último artículo de la entrega, dirígete al botón de **Finalizar Entrada**.
2. Confirma la operación. 
3. ¡Listo! La mercancía ahora consta en el sistema y se ha actualizado el stock disponible del almacén.

> [!TIP]
> Si la pantalla muestra un mensaje de *Aviso de Impresión* durante el "Paso 3", significa que hubo un problema de comunicación con la etiquetadora de tu zona. Revisa el papel de la impresora antes de continuar.
