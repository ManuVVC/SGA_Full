Análisis del Proyecto SGA
1. Estructura del Monorepo
El proyecto está organizado en un monorepo bajo las siguientes rutas principales:

backend
: API desarrollada en Flask (Python 3.11-slim) que interactúa con la base de datos Oracle a través de python-oracledb en modo Thick.
Estructura interna: Sigue un patrón de arquitectura limpia dividida en:
routes
 (Rutas Flask).
services
 (Lógica de negocio).
repositories
 (Acceso a base de datos Oracle).
utils
 (Utilidades, decoradores y manejo de excepciones).
pda
: Aplicación frontend SPA construida con React (Vite) diseñada específicamente para terminales móviles PDA de almacén.
docs/interno
: Directorio exclusivo para documentación técnica interna (por ejemplo, 
monorepo.md
).
Orquestación Docker:
docker-compose.yml
: Configuración de producción que compila el frontend en una imagen Nginx multi-stage (sirviendo archivos estáticos y actuando como proxy de /api/* hacia el backend Flask) y levanta el servicio de backend Flask.
docker-compose.dev.yml
: Configuración de desarrollo que habilita el hot-reload (Vite Dev Server en http://localhost:5173 y Flask debug en http://localhost:5000).
2. Protocolos de Comunicación y Conectividad (Resiliencia Wi-Fi)
Dado que las terminales PDA operan en almacenes con estanterías metálicas propensas a zonas de sombra Wi-Fi, se implementan protocolos específicos de resiliencia en red:

Reintentos Automáticos (Frontend): El cliente Axios configurado en 
apiService.js
 utiliza axios-retry con las siguientes directrices:
3 reintentos máximos usando una estrategia de backoff exponencial (
1
s
→
2
s
→
4
s
1s→2s→4s).
Las peticiones tienen un timeout de 8s para dar margen al último reintento.
Condición: Solo se reintentan errores de red puros (corte de conexión) o errores 5xx del servidor. Los errores de negocio (4xx) no se reintentan.
El proceso es silencioso para el operario, alertando en pantalla con banner rojo solo si se agotan todos los intentos (~7 segundos).
Identificación del Terminal físico (Docker NAT Bypass):
Docker en Windows NAT-ea las peticiones IP al gateway (172.19.0.1), ocultando la IP real del dispositivo.
Para solucionarlo, el frontend extrae la IP real de manera síncrona mediante el parámetro terminal_ip de la URL de carga (y usa detección WebRTC en segundo plano como fallback), guardándola en sessionStorage.
Cada petición HTTP añade la cabecera personalizada X-Terminal-IP.
El backend Flask en 
terminal_service.py
 prioriza esta cabecera y provee un bypass de desarrollo mediante DEV_DEFAULT_TERMINAL_IP (definido en .env) si detecta IPs locales o de subred Docker.
3. Protocolos de Autenticación, Autorización y Auditoría
El flujo de seguridad del monorepo sigue un esquema estructurado en dos pasos:

A. Validación del Dispositivo (Terminal)
Antes de permitir cualquier acción o login, el backend valida el terminal que realiza la llamada:

El backend recibe la IP del cliente (priorizando X-Terminal-IP).
Consulta la vista de Oracle GSM.VMST_TERMINALES en 
terminal_repo.py
.
Si el terminal no está registrado, se deniega la petición arrojando un error TerminalNoAutorizado (HTTP 403).
Si está registrado pero tiene el campo PRM_BLOQUEADO activo (
1
1, "1" o True), se arroja TerminalBloqueado (HTTP 403).
Extrae los permisos del terminal (columnas que inician con PRM_).
B. Autenticación del Operario
Se procesan el usuario y contraseña contra la tabla GSM.TMST_OPERADORES en 
auth_repo.py
.
Se admite que un operario tenga contraseña NULL en base de datos (permitiendo cualquier entrada), emulando el procedimiento de base de datos original.
Se actualiza el código del último operador logueado (CODOPERADOR) en la tabla GSM.TMST_TERMINALES del dispositivo correspondiente.
Se genera un token JWT firmado con la clave secreta SECRET_KEY (algoritmo HS256) con un tiempo de expiración de 8 horas.
Las peticiones subsecuentes adjuntan la cabecera Authorization: Bearer <token>.
El decorador @token_required en 
decorators.py
 intercepta las llamadas, valida la firma, la expiración del token y carga los datos del operador en el contexto global de Flask (g.operador).
C. Auditoría y Registro (Audit Log)
Si AUDIT_LOG_ENABLED está activo en .env:
Se activa un middleware en Flask (@before_request y @after_request) que captura: IP, Operador actual, Método HTTP, URL, JSON de petición y JSON de respuesta.
Las conexiones a base de datos son envueltas en la clase AuditConnection (
database.py
) para auditar y registrar las consultas SQL directas ejecutadas en Oracle.
4. Protocolo de Base de Datos (Oracle)
Gestión del Pool: Se inicializa un pool único y compartido mediante oracledb.create_pool con parámetros de límites mínimos/máximos (ORACLE_MIN y ORACLE_MAX).
Modo Thick: Habilitado mediante oracledb.init_oracle_client(lib_dir=client_path) apuntando a la ruta del Oracle Instant Client configurado.
Seguridad: Todas las consultas SQL en los repositorios son parametrizadas (ej. WHERE IP = :ip_address) para prevenir inyecciones SQL.
⚙️ Compromiso con las Reglas del Agente
Para garantizar el cumplimiento riguroso de tus requerimientos y las directrices globales de desarrollo establecidas:

Uso de Idioma Español: Toda comunicación contigo, documentación generada, comentarios técnicos de relevancia, y ficheros informativos se redactarán estrictamente en español.
Mantenimiento de Documentación: Cualquier alteración del flujo, protocolo, base de datos o estructura de carpetas se verá reflejada y actualizada inmediatamente en la documentación del directorio 
docs/interno
.
Proceso de Planificación y Control (Modo Planificación):
Ante cualquier desarrollo o modificación de código que me solicites, primero realizaré una fase de investigación detallada sin tocar el código fuente.
Crearé un archivo de plan de implementación (
implementation_plan.md
) con la propuesta técnica detallada, riesgos y plan de pruebas, solicitando tu feedback y aprobación explícita mediante el botón de proceder.
Tras tu aprobación, gestionaré las tareas de manera interactiva a través del archivo de lista de control (
task.md
).
Finalmente, realizaré las validaciones y actualizaré el archivo de cierre de cambios (
walkthrough.md
).