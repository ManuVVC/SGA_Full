# Documentación: Terminal Service

## 1. Documentación Técnica (Devs)

### Arquitectura y Diseño
`TerminalService` actúa como la capa de seguridad y control de acceso para los dispositivos físicos (PDAs, terminales) que se conectan al SGA. Se basa en la identificación por dirección IP.

- **Identificación de Terminal:** Consulta el `TerminalRepository` para verificar si la IP origen está registrada y autorizada.
- **Bypass de NAT/Docker (Entorno Dev):** Existe lógica específica en la función `_es_ip_docker_o_local` para entornos de desarrollo. Si la aplicación corre en Docker y el origen aparece como IP de Gateway (ej. `172.x.x.x` o `127.0.0.1`), la IP original del cliente se pierde por el NAT. El servicio intercepta esto y utiliza la variable de entorno `DEV_DEFAULT_TERMINAL_IP` para emular una PDA específica.
  > **Nota de Seguridad:** Asegurarse de que `DEV_DEFAULT_TERMINAL_IP` nunca se inyecte en Producción.
- **Control de Bloqueos:** El servicio valida el flag `PRM_BLOQUEADO` dentro de la configuración JSON de permisos del terminal. Lanza `TerminalBloqueado` o `TerminalNoAutorizado` cortando la petición de inmediato.

### API Interna (Métodos Principales)
| Método | Descripción | Excepciones Posibles |
|--------|-------------|----------------------|
| `validar_y_obtener_terminal(ip_address)` | Verifica registro, permisos y estado de bloqueo. | `TerminalNoAutorizado`, `TerminalBloqueado` |

*\[Insertar diagrama de arquitectura de red y resolución de IP aquí\]*

---

## 2. Manual de Usuario (Operadores)

### Control de Acceso de Terminales (PDA)
El sistema SGA restringe qué escáneres o PDAs pueden conectarse a la red para garantizar la seguridad del inventario.

**¿Qué pasa si mi PDA no conecta?**
- **Terminal no autorizado:** Si ve un mensaje indicando que el terminal no está autorizado, significa que la IP de su PDA no está registrada en el sistema. Debe solicitar al administrador que dé de alta la PDA.
- **Terminal bloqueado:** Si el administrador ha bloqueado temporalmente su dispositivo (por pérdida o mantenimiento), verá un error de "Terminal Bloqueado". Contacte a soporte para desbloquearlo.

**Para los Administradores:**
- Puede gestionar el acceso de los dispositivos configurando la IP y los permisos de cada terminal.
- Use la opción de **Bloqueo** si un dispositivo se extravía para evitar operaciones no autorizadas.

*\[Insertar captura de pantalla del error de acceso en la PDA aquí\]*
