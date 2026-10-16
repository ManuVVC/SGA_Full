# Arquitectura y Diseño Conceptual del Frontend (SGA)

## 1. Paradigma de Interfaz: Dos Universos de Trabajo
Para un sistema de gestión de almacén (SGA) estándar, el frontend no debe ser una única interfaz genérica. Quienes trabajan con los datos lo hacen desde dos contextos radicalmente distintos. Por ello, el frontend debe dividirse en dos "universos":

### A. Frontend de Backoffice (Escritorio / Web)
Orientado a Jefes de Almacén y Administración. Su objetivo es la **gestión, configuración y resolución de problemas**.
*   **Dispositivos:** Pantallas grandes (Monitores de PC).
*   **Interacción:** Ratón y teclado, tablas de datos densas, formularios complejos.

### B. Frontend de Operativa (PDA / Tablets / Dispositivos Móviles)
Orientado a los operarios de planta. Su objetivo es la **ejecución rápida y sin errores**.
*   **Dispositivos:** Terminales de radiofrecuencia (PDAs), tablets montadas en carretillas.
*   **Interacción:** Táctil (botones grandes), lectura de códigos de barras/QR (cero tecleo manual), alto contraste, flujos paso a paso.

---

## 2. Módulos Principales de Trabajo con Datos

### 2.1. Control del Mapeo del Almacén (Layout)
*   **Backoffice:** Interfaz de configuración donde se define la topología: `Zona -> Pasillo -> Estantería -> Nivel -> Hueco`.
    *   *Trabajo de datos:* Asignación de propiedades a los huecos (ej. "Solo admite pallets europeos", "Peso máximo 1000kg", "Zona de frío").
*   **PDA:** El operario no configura, solo consume. El sistema le indica gráficamente o por texto hacia qué pasillo y hueco dirigirse.

### 2.2. Recepción de Pedidos de Proveedores (Inbound)
*   **PDA (Flujo de Muelle):** 
    1. Escaneo del albarán o pedido de compra.
    2. Escaneo de los artículos recibidos (validación contra lo esperado).
    3. **Putaway (Ubicación):** El frontend calcula (basado en el peso/volumen del artículo) y *sugiere* el hueco óptimo para guardarlo. El operario va al hueco, escanea el código de barras del hueco para confirmar que lo dejó ahí, y el dato se guarda.

### 2.3. Preparación de Pedidos de Clientes (Picking / Outbound)
*   **Backoffice:** Agrupación de pedidos en "Olas" (Waves) para optimizar el trabajo.
*   **PDA (Flujo de Picking):**
    1. El frontend muestra al operario una ruta optimizada (para no dar vueltas en zigzag por el almacén).
    2. Llega al hueco -> Escanea el hueco (valida que está en el sitio correcto).
    3. Escanea el artículo (valida que cogió lo correcto).
    4. *Control de peso/volumen:* Si el sistema detecta que la caja final excede el volumen/peso logístico configurado, alerta al operario para cerrar esa caja e iniciar una nueva.

### 2.4. Control de la Mercancía Almacenada (Inventario)
*   **PDA (Conteos Cíclicos):** Interfaz rápida donde al operario le saltan "misiones" de ir a un hueco y contar qué hay. 
    *   *Regla de UI:* El sistema **nunca** le dice cuánto debería haber (para evitar que el operario mienta confirmando sin mirar). El operario introduce el dato ciego, y el backend valida si cuadra o genera una discrepancia.
*   **Backoffice:** Tableros de control de roturas de stock, reabastecimiento (min-max), y gestión de caducidades o lotes inmovilizados.

---

## 3. Principios UX/UI para Operativa de Almacén
Para que el trabajo con los datos sea eficiente en el almacén:
1. **Escaneo sobre Tecleo:** Minimizar los inputs de texto manuales. Si algo puede tener un código de barras, se escanea.
2. **Validación Inmediata:** Si el operario escanea el hueco equivocado, el frontend debe emitir una alerta sonora (beep de error) y visual (pantalla roja) de forma instantánea.
3. **Flujos Lineales ("Wizard"):** El operario no debe tener menús de navegación complejos en la PDA. El proceso debe ser: *Ir a A -> Escanear B -> Coger C -> Confirmar*.
4. **Resiliencia:** Si la señal WiFi del almacén se pierde en un pasillo oscuro, el frontend de la PDA debe poder guardar el escaneo temporalmente e intentar enviarlo al backend de Flask cuando recupere la señal.
5. **Diseño Adaptativo a Alturas Críticas:** Terminales industriales como Zebra TC21/TC26 o simulaciones móviles presentan resoluciones lógicas de 360×640 px que se reducen drásticamente a menos de 450 px útiles cuando se abre el teclado virtual de Android. La interfaz debe compactar dinámicamente formularios, paddings y modales para mantener la visibilidad y operabilidad táctil.

---

## 4. Detección y Adaptación Reactiva de Pantalla (`useDeviceScreen`)

Para gestionar la adaptabilidad en tiempo real sin recargar ni romper la experiencia de usuario, el frontend de la PDA dispone del hook centralizado:

*   **Ruta:** `pda/src/hooks/useDeviceScreen.js`
*   **Capacidades:**
    *   Escucha eventos `resize`, `orientationchange` y `window.visualViewport` (precisión milimétrica ante la apertura/cierre del teclado virtual de Android).
    *   Proporciona dimensiones reales: `width`, `height`, `screenWidth`, `screenHeight`, `pixelRatio`.
    *   Flags booleanos para layouts:
        *   `isShortScreen`: `true` si el viewport útil es `< 550px`.
        *   `isVeryShortScreen`: `true` si el viewport útil es `< 450px`.
        *   `isNarrowScreen`: `true` si el ancho es `< 380px`.
        *   `isLandscape`: `true` si la orientación es horizontal.
*   **Diagnóstico Rápido en Planta:**
    *   Al hacer clic sobre el botón `TERM: [Nº]` en el `TerminalHeader`, se despliega un modal con la resolución visible, resolución del panel, densidad DPR y diagnóstico del terminal.
