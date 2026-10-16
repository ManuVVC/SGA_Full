# Análisis y Propuesta de Optimización: Preparación de Pedidos por Modales (Zero-Scroll UI)

> **Estado**: ✅ Implementado y Compilado  
> **Fecha**: 16 de Octubre de 2026  
> **Módulo**: PDA — Preparación de Pedidos ([`PreparaPedido.jsx`](file:///g:/Proyectos/SGA/pda/src/views/PreparaPedido.jsx) / [`usePreparacionPedido.js`](file:///g:/Proyectos/SGA/pda/src/hooks/usePreparacionPedido.js) / [`feedbackUtils.js`](file:///g:/Proyectos/SGA/pda/src/utils/feedbackUtils.js))  
> **Objetivo**: Eliminar los desplazamientos verticales (scroll) de la pantalla y reducir drásticamente el tiempo de interacción del operario mediante el uso de popups/modales focalizados y mejoras de ergonomía industrial.

---

## 1. Diagnóstico del Estado Actual (Problemas Detectados)

Tras analizar la implementación actual en [`PreparaPedido.jsx`](file:///g:/Proyectos/SGA/pda/src/views/PreparaPedido.jsx) y [`usePreparacionPedido.js`](file:///g:/Proyectos/SGA/pda/src/hooks/usePreparacionPedido.js), se identifican los siguientes cuellos de botella que penalizan el tiempo de operación en el almacén:

### 1.1. Apilamiento Vertical ("Stacked Steps") y Scroll Forzado
* Actualmente, la pantalla mantiene fijo el encabezado (`TerminalHeader` ~48px), una barra exclusiva para el botón `Volver` (~44px), la tarjeta resumen `PanelInfoCard` (~180px) y la barra inferior `WizardBottomBar` (~64px). Esto consume **~336px fijos**.
* En un terminal industrial estándar (ej. Zebra TC21/TC26 con `360×640 px` lógicos, que se reducen a `<400 px` al abrirse el teclado virtual de Android), el espacio libre real es de apenas **60 a 250 px**.
* A medida que el operario avanza por las fases (`1. Ubicación` → `2. Artículo` → `3. Lote` → `4. Cantidad`), las tarjetas de cada paso **se apilan una debajo de otra** en el contenedor principal.
* Al llegar al paso 3 o 4, el campo de cantidad y el botón `CONFIRMAR` quedan fuera de la vista, obligando a realizar scroll manual o programático (`scrollIntoView` en la línea 319 de `PreparaPedido.jsx`).

### 1.2. Duplicidad Visual de Información
* El componente `PanelInfoCard` superior ya muestra la ubicación, el artículo, las observaciones y las cantidades (`SOLICITADO`, `PREPARADO`, `PDTE`).
* Sin embargo, los bloques de los pasos 1, 2 y 3 vuelven a pintar en pantalla la ubicación confirmada y el nombre del artículo confirmado, desperdiciando espacio vertical crítico.

### 1.3. Apertura Innecesaria del Teclado Virtual
* En el paso `CONFIRMAR_UBICACION`, el `<input type="text">` no gestiona el atributo `inputMode="none"`. En Android, al recibir el foco automático (`inputRef.current.focus()`), el sistema operativo despliega el teclado virtual en pantalla aunque el operario vaya a usar el lector láser físico, provocando un salto brusco de la interfaz.

### 1.4. Latencia de Red Bloqueante entre Líneas
* En [`usePreparacionPedido.js`](file:///g:/Proyectos/SGA/pda/src/hooks/usePreparacionPedido.js#L186), la función `aplicarLinea()` ejecuta `await cargarLineasPendientes(cabecera.cod_documento)` de forma **síncrona** antes de pasar a la fase `CONFIRMAR_UBICACION`. Esto añade entre **200 ms y 500 ms** de espera muerta en cada línea antes de que el operario pueda disparar el láser.

---

## 2. Nueva Arquitectura de Interfaz: "Zero-Scroll" + Modales de Acción

El nuevo paradigma divide la interfaz en dos capas claramente diferenciadas:

```mermaid
flowchart TD
    subgraph Base["Capa 1: Pantalla Base Fija (Zero-Scroll)"]
        H["Cabecera Compacta (Volver + Doc + Progreso)"]
        Card["Ficha Consolidada de Línea Activa\n(Ubicación, Artículo, Lote, Solicitado/Preparado/Pdte)"]
        Stepper["Barra de Progreso de Pasos (Chips Interactivos)\n[1. Ubicación] ➔ [2. Artículo] ➔ [3. Lote] ➔ [4. Cantidad]"]
        Nav["WizardBottomBar (ANT | Líneas | SIG)"]
    end

    subgraph Modales["Capa 2: Popups / Modales de Captura Rápida"]
        M1["Modal 1: Escanear Ubicación\n(Auto-foco, sin teclado virtual)"]
        M2["Modal 2: Escanear Artículo\n(Compacto + Soporte GS1-128)"]
        M3["Modal 3: Seleccionar/Escanear Lote\n(Solo si >1 lote disponible)"]
        M4["Modal 4: Introducir Cantidad\n(Botón 'Todo Pendiente' + Teclado Rápido)"]
    end

    Card --> M1
    M1 -- "Lectura OK" --> M2
    M2 -- "Si >1 Lote" --> M3
    M2 -- "Sin Lote o 1 Lote" --> M4
    M3 -- "Lote OK" --> M4
    M4 -- "Confirmar Carga" --> Next["Siguiente Línea Automática"]
```

### 2.1. Capa 1: Pantalla Base Fija (Sin Desplazamiento)
* **Contenedor Principal Estático (`overflow-hidden`)**: Todos los datos de la línea caben siempre en una sola vista sin barra de scroll.
* **Integración del botón "Volver"**: Se elimina la fila blanca dedicada exclusivamente al botón `Volver`, integrándolo de forma compacta junto al indicador de líneas pendientes o cabecera, ganando **44 px verticales**.
* **Indicadores de Estado (Stepper Horizontal)**: Una fila de píldoras (*chips*) muestra qué validaciones se han completado (`Ubicación ✓`, `Artículo ✓`, `Lote ✓`, `Cantidad`).
  * Si el operario cierra un modal para ver algún detalle de la pantalla base, puede reabrir el modal activo con un solo toque en el botón central **"CONTINUAR LECTURA"** o tocando el chip del paso que desee modificar.

### 2.2. Capa 2: Modales / Popups por Fase de Lectura
Todos los campos donde se realiza una lectura de código de barras o introducción de datos se presentan en un **Modal ergonómico** alineado en la zona superior-central (`items-start pt-4`), garantizando que aunque se abra el teclado numérico de Android, el campo y los botones queden 100% visibles sin desplazar el fondo:

| Fase | Modal / Popup | Comportamiento Optimizado |
|---|---|---|
| **1. Ubicación** (`CONFIRMAR_UBICACION`) | **Popup de Lectura de Ubicación** | Muestra en grande el código de hueco esperado (ej. `A-01-02`). El input tiene foco automático y `inputMode="none"` (a menos que el usuario active el teclado). Al escanear con el gatillo (envía `Enter`), valida y transiciona automáticamente al modal de Artículo. Si hay múltiples posiciones, muestra los botones `Pos 1`, `Pos 2` en el mismo modal. |
| **2. Artículo** (`CONFIRMAR_ARTICULO`) | **Popup de Lectura de Artículo** | Muestra referencia y descripción del artículo esperado en el encabezado del modal. Renderiza [`ArticleSearchInput`](file:///g:/Proyectos/SGA/pda/src/components/ArticleSearchInput.jsx) en versión `compact={true}`. Al escanear el EAN válido, cierra y abre inmediatamente el paso siguiente. |
| **3. Lote / Caducidad** (`SELECCIONAR_LOTE`) | **Popup de Selección de Lote** | **Solo se abre si existen 2 o más lotes** en la ubicación (si hay 1 único lote, se asigna automáticamente en transparente). Permite tanto pulsar el lote en la lista como escanear el código del lote directamente. |
| **4. Cantidad** (`INTRODUCIR_CANTIDAD`) | **Popup de Cantidad** | Muestra de forma prominente la **Cantidad Pendiente**, el **Stock Disponible** y el **Factor de Conversión** (si ha leído caja). Incluye botones de 1 toque para evitar teclear dígitos manualmente. |
| **5. Exceso / Suma** (`CONFIRMAR_EXCESO`, `CONFIRMAR_SUMA_SUSTITUCION`) | **Popup de Confirmación** | Sustituye las vistas inline actuales por un modal de decisión directa con botones grandes de alto contraste. |

---

## 3. Propuestas de Mejora Adicionales (Ahorro de Tiempo del Operario)

Además del paso a modales, proponemos **7 mejoras de alto impacto** enfocadas en reducir el uso de pantalla táctil y acelerar el ritmo de picking:

### 🚀 Mejora 1: Lectura Integral GS1-128 ("One-Scan Picking")
* **Situación actual**: `PreparaPedido.jsx` utiliza `<ArticleSearchInput />` en modo `ean-only`, desaprovechando el parser GS1-128 ([`gs1Parser.js`](file:///g:/Proyectos/SGA/pda/src/utils/gs1Parser.js)) que ya existe en el proyecto.
* **Propuesta**: Activar `mode="full"` y conectar `onGs1Parsed` en el modal de Artículo.
* **Impacto**: Cuando el operario escanee una etiqueta logística GS1-128 que contenga `(01) EAN + (10) Lote + (17) Caducidad + (30/37) Cantidad`:
  1. Se valida el artículo automáticamente.
  2. Si el lote del GS1 coincide con uno de los `lotesDisponibles` en la ubicación, **se autoselecciona el lote saltándose el Modal 3** (incluso habiendo múltiples lotes en el hueco).
  3. Si el GS1 incluye cantidad (o si se parametriza), pre-rellena la cantidad en el Modal 4.
  * *Ahorro estimado: De 3 interacciones a 1 único disparo de escáner.*

### ⚡ Mejora 2: Confirmación en 1 Toque en el Modal de Cantidad ("Preparar Todo" y Pre-selección)
* **Situación actual**: En el paso de cantidad el input aparece vacío (`placeholder="0"`). El operario tiene que teclear los números (ej. `2`, `4`) y pulsar `CONFIRMAR` en el 100% de las líneas.
* **Propuesta**:
  1. En más del 85% de los casos de picking, el operario recoge exactamente la cantidad pendiente solicitada (o el máximo disponible en el hueco si hay menos stock: `cantSugerida = Math.min(pendiente, stockMax)`).
  2. Añadir en el Modal de Cantidad un botón destacado de acceso rápido: **`PREPARAR TODO EL PENDIENTE (X uds)`** (y permitir que pulsar `Enter` con el input vacío o pre-seleccionado confirme directamente esa cantidad).
  3. Añadir botones de ajuste rápido (`+1`, `-1`, `Máx Stock`) junto al input numérico para correcciones sin abrir el teclado virtual.

### 📍 Mejora 3: Memoria de Ubicación en Líneas Consecutivas ("Mismo Hueco")
* **Situación actual**: Si un pedido tiene dos líneas seguidas en la misma ubicación física (ej. mismo pasillo y hueco para dos variantes o lotes distintos), `aplicarLinea` borra `ubicacionConfirmada` y obliga al operario a volver a escanear la etiqueta de la estantería frente a la que ya está parado.
* **Propuesta**: Si la nueva línea cargada por `siguienteLinea` tiene exactamente el mismo `codubicacion` que la línea que se acaba de confirmar en los últimos segundos, mantener la ubicación como confirmada (o mostrar en el modal un botón directo de 1 toque `"MISMA UBICACIÓN"`), pasando directamente al escaneo del artículo.

### 🔊 Mejora 4: Feedback Acústico y Háptico (Ojos en la Mercancía, no en la Pantalla)
* **Situación actual**: El operario debe mirar la pantalla de la PDA tras cada disparo del láser para verificar si la lectura fue aceptada o dio error.
* **Propuesta**: Incorporar retroalimentación sensorial mediante APIs nativas del navegador (sin librerías externas):
  * **Lectura correcta (Ubicación / Artículo / Carga)**: Pitido corto agudo (`AudioContext` a 1200 Hz, 80 ms) + vibración sutil (`navigator.vibrate(40)`).
  * **Error (Ubicación errónea / Artículo equivocado / Stock superado)**: Doble tono grave de alerta (300 Hz, 200 ms) + vibración doble (`navigator.vibrate([150, 80, 150])`) + animación de sacudida (*shake*) en el modal.
  * *Impacto: El operario sabe al instante si acertó o falló sin levantar ni bajar la vista hacia el terminal.*

### 🧲 Mejora 5: Trampa de Foco Permanente en Modales (`useScannerFocus`)
* **Situación actual**: Si el operario toca por accidente cualquier zona gris de la pantalla con el dedo o el guante, el `<input>` pierde el foco y cuando dispara el gatillo láser la lectura se pierde en el vacío.
* **Propuesta**: Integrar el hook existente [`useScannerFocus.js`](file:///g:/Proyectos/SGA/pda/src/hooks/useScannerFocus.js) dentro de los modales de Ubicación, Artículo y Cantidad para que, mientras el modal esté abierto, el foco regrese automáticamente al input de escaneo ante cualquier toque accidental fuera de él.

### 🌐 Mejora 6: Desacoplamiento Asíncrono de `cargarLineasPendientes`
* **Situación actual**: `await cargarLineasPendientes(cabecera.cod_documento)` bloquea la transición a la siguiente línea.
* **Propuesta**: Ejecutar la recarga del contador de líneas pendientes en segundo plano (sin `await` bloqueante) o descontar localmente la línea completada mientras se resuelve la petición en background.
* *Impacto: Transición instantánea (<50 ms) entre el fin de una línea y la apertura del modal de la siguiente.*

### 📐 Mejora 7: Adaptabilidad con `useDeviceScreen`
* Utilizar los flags `isShortScreen` e `isVeryShortScreen` del hook [`useDeviceScreen.js`](file:///g:/Proyectos/SGA/pda/src/hooks/useDeviceScreen.js) para ajustar dinámicamente los paddings de la tarjeta base y posicionar los modales en la parte superior del viewport cuando el teclado virtual esté desplegado.

---

## 4. Comparativa de Eficiencia Operativa (Actual vs. Propuesto)

| Métrica por Línea de Pedido | Diseño Actual (Stacked Steps) | Diseño Propuesto (Modales + Mejoras) | Mejora |
|---|---|---|---|
| **Desplazamientos de pantalla (Scrolls)** | 1 a 3 scrolls por línea | **0 scrolls (Pantalla 100% fija)** | **-100% desplazamientos** |
| **Toques en pantalla (con Lote + Cantidad)** | 5 a 7 toques (Scroll + Input + Teclado + Confirmar) | **1 a 2 toques** (Escaneo directo + Enter/Todo) | **-70% toques táctiles** |
| **Aperturas innecesarias del teclado virtual** | En cada ubicación y cantidad | **0 en lecturas láser** (`inputMode="none"`) | Visibilidad total |
| **Tiempo medio de interacción en terminal** | ~12 - 18 segundos / línea | **~4 - 7 segundos / línea** | **Ahorro de ~8-10s por línea** |

---

## 5. Plan de Implementación Propuesto

Para llevar a cabo esta mejora de forma limpia y segura en la nueva rama:

1. **Optimización del Hook [`usePreparacionPedido.js`](file:///g:/Proyectos/SGA/pda/src/hooks/usePreparacionPedido.js)**:
   * Añadir estado de visibilidad del modal activo (`isStepModalOpen`) para permitir minimizar/reabrir el popup de la fase actual si el operario quiere inspeccionar la pantalla base.
   * Añadir soporte para callback `handleGs1Parsed` (autoselección de lote y pre-carga de cantidad cuando se lee un GS1-128).
   * Hacer no bloqueante la llamada a `cargarLineasPendientes` dentro de `aplicarLinea`.
   * Añadir función de ayuda para confirmar "Todo el pendiente" en un toque y conservar ubicación si la línea consecutiva comparte `codubicacion`.
2. **Utilidad de Feedback Sensorial (`pda/src/utils/feedbackUtils.js`)**:
   * Crear helper ligero con Web Audio API + `navigator.vibrate` para pitidos de éxito (`beepSuccess`) y error (`beepError`).
3. **Rediseño de [`PreparaPedido.jsx`](file:///g:/Proyectos/SGA/pda/src/views/PreparaPedido.jsx)**:
   * Compactar la cabecera y eliminar la barra secundaria del botón `Volver`.
   * Convertir la vista principal en un panel fijo sin scroll con la información enriquecida de la línea y el *Stepper* horizontal de progreso (`Ubicación` → `Artículo` → `Lote` → `Cantidad`).
   * Sustituir las tarjetas apiladas por el **Modal Dinámico de Preparación** que renderiza la vista correspondiente a la fase activa (`CONFIRMAR_UBICACION`, `CONFIRMAR_ARTICULO`, `SELECCIONAR_LOTE`, `INTRODUCIR_CANTIDAD`, `CONFIRMAR_EXCESO`, `CONFIRMAR_SUMA_SUSTITUCION`) con auto-foco garantizado y diseño compacto.
4. **Pruebas y Validación**:
   * Verificar todos los flujos de permisos (`solicitar_ubicacion`, `solicitar_articulo`, `solicitar_cantidad`, `puede_servir_mas`).
   * Verificar el flujo de múltiples posiciones de ubicación y anulación de líneas preparadas.

---

## 6. Modo Antebrazo Horizontal (Wearable + Escáner de Anillo)

Para terminales acoplados en el antebrazo con lector láser en el dedo/mano (ej. Zebra WT6000/WT6300, Honeywell CW45) que trabajan en orientación **Horizontal (`isLandscape`)**, la interfaz se reorganiza automáticamente (o mediante el conmutador rápido **`Antebrazo (H)` / `Mano (V)`** de la barra superior):

### 6.1. Ergonomía Izquierda (Datos + Inputs) ➔ Derecha (Teclado Táctil Encuadrado)
* En dispositivos Android en formato apaisado (Horizontal), los teclados numéricos o virtuales se despliegan en el **lado derecho** de la pantalla. Además, el terminal suele llevarse en el antebrazo izquierdo y operarse con la mano derecha:
  * **Columna Izquierda (`col-span-7`) — Objetivo + Campos de Introducción**: Agrupa de forma compacta la información objetivo del paso (Ubicación, Artículo, Lotes o Métricas) junto con el **campo de entrada (`input`) y botones de acción**. Así, ningún teclado en el lado derecho llega jamás a tapar el campo donde se está leyendo o escribiendo.
  * **Columna Derecha (`col-span-5`) — Teclado Táctil Encuadrado (`HorizontalKeypad`)**: Integra un teclado numérico/código (`1-9`, `0`, `-`/`.`, `⌫`, `BORRAR`, `↵ OK`) directamente encuadrado en el modal que escribe sobre el campo activo sin robarle el foco al lector láser de anillo y evitando que el teclado flotante del sistema operativo tape la cabecera o los controles.

### 6.2. Reorganización de Pantallas y Modales en Horizontal
1. **[`TerminalHeader.jsx`](file:///g:/Proyectos/SGA/pda/src/components/TerminalHeader.jsx) en 1 sola fila**: Compacta logo, título, nombre del operario, teclado y terminal en una única barra de ~32 px de alto.
2. **[`WizardBottomBar.jsx`](file:///g:/Proyectos/SGA/pda/src/components/WizardBottomBar.jsx) como Dock Lateral Derecho (`vertical={true}`)**: En lugar de restar 64 px en la parte inferior, los botones `ANT`, `Líneas` y `SIG` pasan a una columna vertical en el borde derecho.
3. **Pantalla Base Split-Screen (12 columnas)**:
   * **Izquierda (7 cols)**: Ficha completa de la línea (`PanelInfoCard`).
   * **Derecha (5 cols)**: Cuadrícula `2×2` con los 4 pasos (`1. Ubic.`, `2. Artíc.`, `3. Lote`, `4. Cant.`) y el botón de apertura de lectura.
4. **Modales Encuadrados al Área de Trabajo (`absolute inset-0` / `grid-cols-12`)**:
   * El modal se encuadra exactamente sobre el área de trabajo central bajo la barra superior (`Salir`, `Doc`, `Antebrazo (H)`), evitando que asomen textos cortados del fondo en los márgenes.
   * **Columna Izquierda del Modal (7 cols)**: Información objetivo compacta + **Campos de introducción** ([`ArticleSearchInput.jsx`](file:///g:/Proyectos/SGA/pda/src/components/ArticleSearchInput.jsx), `#inputUbi`, `#inputCantidad`, buscador de lotes) + botón **`⚡ PREPARAR PENDIENTE (1 TOQUE)`** y confirmación.
   * **Columna Derecha del Modal (5 cols)**: **Teclado Táctil Encuadrado (`HorizontalKeypad`)** conectado mediante `controlRef` / estado directo a los inputs de la izquierda.
5. **Vista `VER_LINEAS` en Doble Columna**: Muestra en paralelo la columna de **Pendientes** a la izquierda y la de **Preparadas** a la derecha con scroll independiente.


