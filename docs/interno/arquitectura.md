# Arquitectura y Documentación - SGA Cliente PDA

## Estructura del Proyecto

Esta aplicación cliente está diseñada para ejecutarse en terminales PDA Seypos (pantallas táctiles de 4-5 pulgadas, Android) utilizando el navegador o modo PWA. 
Se ha implementado utilizando **React 18** empaquetado con **Vite** y con estilos mediante **Tailwind CSS**.

### Decisiones Técnicas Clave:
1. **Enrutamiento (React Router v6)**: Manejo de pantallas Login, Menú y Stock (búsqueda y resultados).
2. **Autenticación Interceptada**: Utilizando Axios. Todas las llamadas añaden la cabecera `Authorization: Bearer <token>`. Si se recibe un error 401, se borra el token y se redirige a `/`.
3. **Alto Contraste y UI Industrial**: Tailwind CSS permite componer botones grandes, colores de alto contraste (`sga-primary`, `sga-danger`) y una estructura limpia, ideal para una pantalla pequeña.
4. **Mock de la API**: Utilizando `axios-mock-adapter` simulamos los endpoints `/api/auth/login` y `/api/stock/ean/<ean>`. Para conectar al backend real, basta con desactivar la importación en `src/main.jsx`.

## Integración con Lector de Código de Barras (Wedge)

Las PDAs industriales de Seypos incluyen un escáner tipo Wedge. Estos se comportan como un teclado físico: "escriben" el código y al final simulan presionar la tecla `Enter`.

Para que el operador **no tenga que tocar la pantalla** en cada lectura, se creó el Hook `useScannerFocus` (`src/hooks/useScannerFocus.js`).
- El input permanece `opacity-0` (oculto visualmente) o muy discreto pero accesible.
- El hook monitoriza los clicks y pérdidas de foco; si el usuario no está escribiendo explícitamente en otro lado, se asegura de forzar el foco de nuevo en este input para que el siguiente disparo de escáner funcione inmediatamente.
- Cuando ocurre un "Enter", se dispara el `onSubmit` del formulario y ejecuta la búsqueda por Axios.

## Diccionario de Permisos
El sistema maneja un objeto JSON con atributos booleanos `PRM_...` devuelto por el endpoint de Login. El componente `MainMenu` muestra u oculta botones en base a estos permisos.

## Compilación para Producción
Para desplegar:
```bash
npm run build
```
Esto generará los estáticos listos para un servidor Nginx, Apache o para ser envueltos en un Capacitor / PWA offline.
