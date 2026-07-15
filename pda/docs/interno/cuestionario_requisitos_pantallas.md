# Cuestionario de Requisitos: Pantallas del Terminal (PDA SGA)

Para poder diseñar y desarrollar correctamente todas las pantallas del terminal tras el proceso de login, necesito que definamos los siguientes aspectos clave del flujo de trabajo y la operativa del almacén. Por favor, revisa y responde o detalla los siguientes puntos:

## 1. Árbol de Navegación y Roles
- ¿Cuáles son las pantallas principales que debe tener la aplicación? (Ej: Recepción, Picking, Consulta de Stock, Ubicación/Traspasos, Expedición).
- ¿Existen restricciones de acceso a ciertas pantallas dependiendo de los permisos o el rol del usuario (obtenido a través del JWT)?

## 2. Operativa de Escaneo y Flujos
- ¿Cuáles son los flujos paso a paso de cada módulo? *(Ej. en Picking: Escanear Ubicación -> Escanear Artículo -> Introducir Cantidad -> Confirmar).*
- ¿Existen múltiples tipos de etiquetas a escanear que debamos distinguir? (Ej. Códigos que incluyen el Lote o Caducidad concatenados, como GS1-128, vs códigos EAN simples).
- ¿La integración del lector de código de barras se realizará mediante emulación de teclado (Keyboard Wedge) o mediante Broadcast/Intents nativos de Android (Zebra DataWedge, Honeywell, etc.)?

## 3. Detalle de los Datos de la Interfaz
Para cada módulo, necesitamos saber:
- **Datos de entrada:** ¿Qué información introduce el operario de forma manual (mediante teclado en pantalla o botones)?
- **Datos de visualización:** Una vez escaneado un artículo o ubicación, ¿qué información exacta debe devolverse y mostrarse en pantalla con tipografía grande? (Ej: Descripción, Lote, Unidades, Peso, Zona).
- **Interacciones:** ¿Qué otras acciones puede hacer el operario? (Ej: Botones de Confirmar, Volver, Cambiar Ubicación, Imprimir Etiqueta).

## 4. Endpoints del Backend (API)
- Necesitamos la especificación de los endpoints del backend que alimentarán cada pantalla (rutas, métodos HTTP).
- ¿Cuál es la estructura del payload (JSON) de petición y respuesta para las operaciones de lectura (consultas) y escritura (confirmación de movimientos)?
- ¿Cómo devuelve el backend los errores de negocio (ej. "Stock insuficiente", "Ubicación bloqueada") para poder mostrarlos de forma clara en rojo en la pantalla?

## 5. Diseño, UI/UX y Feedback
- Además del alto contraste y los botones grandes ya acordados (Tailwind CSS), ¿hay algún requisito de paleta de colores corporativa que debamos seguir?
- ¿Debe la aplicación emitir sonidos específicos o vibrar ante lecturas correctas (Beep) y ante errores (Buzzer de error) para dar feedback rápido al operario sin que tenga que mirar la pantalla?

## 6. Conectividad y Trabajo Offline
- ¿Está garantizada la cobertura Wi-Fi en todo el almacén?
- En caso de perder la conexión durante una operativa de "movimiento" o "picking", ¿qué comportamiento se espera? (Bloquear la pantalla con un mensaje de error de conexión, o encolar la operación de forma offline para sincronizar más tarde).
