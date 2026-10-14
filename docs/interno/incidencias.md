# Registro de Incidencias

## 2026-09-14 - Duplicidad de stock en reubicación (Art. 801611)

**Descripción:** 
Se detectó una duplicidad en el stock del artículo `801611` (CABREIROA PET 6BOT. 1.5L) al realizar un movimiento de reubicación mediante la PDA. 

**Causa localizada:**
En los logs de auditoría del contenedor `sga_backend` en producción se observa que se recibieron dos peticiones `POST` idénticas al endpoint `/api/reubicaciones/grabar` en un intervalo de apenas ~1.5 segundos.
- Petición 1: `2026-09-14 09:56:45,113`
- Petición 2: `2026-09-14 09:56:46,604`

Ambas solicitudes movían 378 unidades desde la ubicación `10-08-04-1-1` a la `10-08-05-1-1`, lo que sumó un total de 756 unidades en la ubicación de destino.

**Solución propuesta:**
Implementar un mecanismo de "debounce" en los botones de acción del frontend (PDA) o deshabilitar el botón de envío mientras la petición está en curso (loading state) para evitar el doble envío de formularios. Alternativamente, asegurar la idempotencia de las operaciones en el backend.

**Estado:** 
Resuelto en desarrollo mediante la implementación de una referencia `isSubmitting` (debounce) en los componentes de React `ReubicacionLibre.jsx` y `ReubicacionEntrada.jsx` de la PDA, lo que bloquea el doble envío en peticiones consecutivas rápidas. Listo para pruebas en el contenedor de develop.
