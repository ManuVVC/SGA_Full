# Documentación del Servicio de Autenticación

## 1. Documentación Técnica

### Resumen Arquitectónico
El `AuthService` es el núcleo de seguridad de la aplicación, encargado de validar las credenciales del operador frente a Oracle, registrar la sesión JWT y asociar al usuario con un terminal físico o web. Se apoya en la validación de contraseñas de `werkzeug.security` permitiendo retrocompatibilidad con contraseñas en texto plano almacenadas y soportando hasheo moderno (`pbkdf2`).

### Estructura de Métodos Principales

#### `login(username, password, ip_address, secret_key, session_timeout_minutes)`
- **Propósito:** Proceso principal de inicio de sesión para operadores de PDA o escritorio en planta.
- **Lógica Interna:**
  1. Valida terminal usando la IP (vía `TerminalService`).
  2. Verifica que el operador exista en BD.
  3. Valida la contraseña: Si tiene el prefijo `pbkdf2:`, comprueba el hash; de lo contrario, hace comparación literal. Si la contraseña en BD es `NULL`, permite la entrada directa según comportamiento legado.
  4. Actualiza en el repositorio del terminal quién es el último operario en ingresar.
  5. Genera un JSON Web Token (JWT) con 8 horas de expiración.
  6. Registra la sesión en el `session_manager`.
- **Excepciones:** `UserNotFoundError`, `InvalidPasswordError`.

#### `login_web(username, password, ip_address, secret_key, session_timeout_minutes)`
- **Propósito:** Inicio de sesión para administradores / backoffice en consola Web.
- **Diferencia Clave:** Utiliza un terminal virtual genérico llamado `"WEB-CONSOLE"` si no detecta una IP asignada en la base de datos de terminales (`TMST_TERMINALES`), permitiendo la conectividad sin requerir hardware logístico.

---

## 2. Manual de Usuario (Para Clientes y Administradores)

### Acceso a la Plataforma (Login)

La plataforma diferencia dos modos de entrada según su dispositivo:

#### Acceso Operario (Terminal de Almacén/PDA)
1. **Inicio:** Ingrese su Código de Operador y su Contraseña en la pantalla de la terminal.
2. **Validación:** El sistema reconoce automáticamente en qué terminal físico (pistola, carretilla) se encuentra usted según la red, registrando sus operaciones bajo este dispositivo.
3. **Caducidad:** Su sesión se mantendrá activa por el turno completo (8 horas) antes de solicitar credenciales de nuevo.

#### Acceso Backoffice Web (Consola de Administración)
1. **Inicio:** Desde su navegador de escritorio (PC), ingrese al portal.
2. **Credenciales:** Indique su **Nombre de Usuario** y **Contraseña**. 
3. **Sin Terminal:** En el acceso web, el sistema le asigna un equipo virtual llamado "WEB-CONSOLE". No necesita estar conectado a una red física de almacén específica para administrar los datos.

> **Importante:** Si olvida su contraseña o la cuenta queda bloqueada, contacte al administrador del sistema para regenerar su usuario en base de datos.
