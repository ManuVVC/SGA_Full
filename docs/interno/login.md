# Módulo de Login (Terminal SGA)

## Descripción General
El módulo de Login es la pantalla de entrada principal para los operarios de almacén. La característica clave de este módulo es la doble validación diseñada para entornos industriales controlados:
1. **Validación del Dispositivo (Terminal):** Se hace automáticamente de forma transparente en base a la IP fija del dispositivo (gestionada por la red del almacén).
2. **Validación del Operario:** Se realiza a través de credenciales manuales (código y contraseña).

## Flujo de Pantalla (`Login.jsx`)
1. **Montaje del Componente:**
   - Al inicializar la pantalla, se ejecuta un `useEffect` que realiza una petición `GET /auth/terminal`.
   - Mientras carga, se muestra el estado "Verificando terminal...".
2. **Respuesta del Servidor (Validación por IP):**
   - **Éxito (200 OK):** El servidor reconoce la IP y responde con los datos del equipo. Se dibuja un recuadro informativo con el icono de un monitor, indicando el identificador (`CODTERMINAL`) y su descripción (ej. "Terminal Planta 1"). Se habilitan los campos de entrada.
   - **Error (403 o no reconocido):** La IP de la PDA no existe en la base de datos de terminales. Se muestra un error descriptivo en rojo ("Terminal no autorizado o IP desconocida") y **se oculta completamente el formulario de login**, impidiendo el uso de la app.
3. **Inicio de Sesión del Operario:**
   - El formulario presenta inputs grandes y de alto contraste (diseño Tailwind para PDA).
   - El usuario introduce su `username` (Código) y `password`.
   - Al confirmar, se hace una petición `POST /auth/login`.
   - Si las credenciales son válidas, se guardan en el `localStorage` los datos del token (`sga_token`) y los permisos (`sga_permissions`), y se navega hacia el menú principal (`/menu`).
   - Cualquier error de credenciales (`401`, `404`, error de servidor) se captura y notifica visualmente con un banner rojo.

## Dependencias y Endpoints Utilizados
- **Endpoints:**
  - `GET /auth/terminal`: Reconocimiento físico del terminal.
  - `POST /auth/login`: Autenticación del usuario y entrega de JWT.
- **Librerías Frontend:**
  - `lucide-react`: Para la iconografía visual (`LogIn`, `Monitor`).
  - `react-router-dom`: Gestión de navegación (`useNavigate`).
  - `Tailwind CSS`: Utilidades de diseño con énfasis en tamaños grandes (`p-4`, `text-xl`, `border-2`).
