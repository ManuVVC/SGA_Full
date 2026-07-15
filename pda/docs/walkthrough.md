# Walkthrough: Cliente SGA para PDA Seypos

He completado el desarrollo y la configuración base de la aplicación cliente para los terminales PDA Seypos. 
A continuación se detalla lo implementado:

## Cambios Realizados

1. **Estructura Base Vite + React**
   - Inicializado el entorno de desarrollo usando **Vite** para una compilación ultrarrápida.
   - Configurado **Tailwind CSS v3** con una paleta de colores de alto contraste (`sga-primary`, `sga-secondary`, `sga-danger`, `sga-success`) para asegurar máxima visibilidad en pantallas industriales.

2. **Servicio HTTP y Mocks**
   - Creado `src/api/apiService.js` con **Axios** e interceptores globales para manejar automáticamente los tokens JWT y reaccionar a los errores de sesión (401 Unauthorized).
   - Implementado un mock completo en `src/api/mockAdapter.js` que simula retrasos de red y responde a las peticiones de login (`POST /api/auth/login`) y lectura de stock (`GET /api/stock/ean/<ean>`).
   > [!NOTE]  
   > Para pruebas de login, puedes usar el usuario `CODIGO` y la clave `123`. Para el EAN, usa `12345` (cualquier otro código dará error "SIN STOCK").

3. **Flujo de Pantallas**
   - **Login**: Autentica, guarda el token y permisos en el `localStorage`.
   - **Menú Principal**: Muestra botones basados en los permisos retornados (ej. `PRM_INVENTARIO`).
   - **Búsqueda (StockQuery)**: Contiene la interfaz central para el escáner.
   - **Resultados (StockResults)**: Lista visual, de alto contraste y tipografía muy grande para mostrar las cantidades y ubicaciones del EAN consultado.

4. **Integración con Escáner "Wedge"**
   - Se ha diseñado el Hook `useScannerFocus` (`src/hooks/useScannerFocus.js`).
   - Este hook previene de forma activa la pérdida del enfoque (blur) en el input invisible de búsqueda. Esto permite que el operario pueda simplemente apretar el gatillo del escáner en cualquier momento sin tener que andar tocando la pantalla para reactivar la barra de búsqueda.

5. **Documentación Interna**
   - Siguiendo tu regla global, se ha creado la documentación técnica base del proyecto en [docs/interno/arquitectura.md](file:///g:/Proyectos/SGA_PDA/docs/interno/arquitectura.md).

## Validación
- [x] La interfaz responde correctamente a errores 401 y 404 simulados.
- [x] El autofocus del lector de código de barras asegura fluidez operativa.
- [x] El flujo de navegación está protegido y enlazado completamente usando React Router.

## Próximos Pasos
Para iniciar la aplicación en modo desarrollo y probar la interfaz en el navegador, abre una terminal en la carpeta `g:\Proyectos\SGA_PDA` y ejecuta:
```bash
npm run dev
```
