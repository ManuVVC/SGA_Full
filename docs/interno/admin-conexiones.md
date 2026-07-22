# Endpoint de Monitorización: Conexiones Activas

> **Estado**: Implementado en desarrollo · Pendiente de validación para producción  
> **Fecha**: 2026-07-21

---

## Descripción

El endpoint `GET /admin/conexiones` permite ver en tiempo real qué terminales/operadores están conectados al servicio SGA, junto con su IP, hora de login y tiempo de inactividad.

La información se obtiene del `SessionManager` (singleton en memoria). **No consulta la base de datos**, por lo que es instantáneo y sin impacto en el rendimiento.

---

## Acceso

| Entorno     | URL                                      |
|-------------|------------------------------------------|
| Desarrollo  | `http://localhost:5001/admin/conexiones` |
| Producción  | `http://localhost:5000/admin/conexiones` |

> **Nota**: El endpoint solo responde a IPs de redes privadas (RFC-1918). Cualquier petición desde una IP pública recibirá `403 Forbidden`.

---

## Respuesta de ejemplo

```json
{
  "status": "success",
  "total": 2,
  "sesiones": [
    {
      "cod_terminal": "T01",
      "cod_operador": "OP001",
      "ip_address": "192.168.1.101",
      "login_time": "2026-07-21T08:00:00+00:00",
      "last_activity": "2026-07-21T08:35:10+00:00",
      "inactividad_minutos": 1.2
    },
    {
      "cod_terminal": "T02",
      "cod_operador": "OP005",
      "ip_address": "192.168.1.102",
      "login_time": "2026-07-21T07:45:00+00:00",
      "last_activity": "2026-07-21T08:36:00+00:00",
      "inactividad_minutos": 0.5
    }
  ]
}
```

---

## Campos de la respuesta

| Campo                 | Tipo     | Descripción                                               |
|-----------------------|----------|-----------------------------------------------------------|
| `cod_terminal`        | `string` | Código del terminal registrado en BD                      |
| `cod_operador`        | `string` | Código del operario actualmente logueado                  |
| `ip_address`          | `string` | IP del cliente en el momento del login                    |
| `login_time`          | `string` | Timestamp ISO 8601 (UTC) del inicio de sesión             |
| `last_activity`       | `string` | Timestamp ISO 8601 (UTC) de la última petición recibida   |
| `inactividad_minutos` | `float`  | Minutos transcurridos desde la última actividad           |

---

## Archivos modificados

| Archivo | Cambio |
|---------|--------|
| [`session_manager.py`](file:///g:/Proyectos/SGA/backend/app/utils/session_manager.py) | Añadidos `ip_address` y `login_time` en el registro de sesión; nuevo método `get_active_sessions()` |
| [`auth_service.py`](file:///g:/Proyectos/SGA/backend/app/services/auth_service.py) | Captura la IP del cliente al hacer login y la pasa a `register_session` |
| [`admin_routes.py`](file:///g:/Proyectos/SGA/backend/app/routes/admin_routes.py) | **NUEVO** — Blueprint con el endpoint `GET /admin/conexiones` |
| [`routes/__init__.py`](file:///g:/Proyectos/SGA/backend/app/routes/__init__.py) | Importación y registro de `admin_bp` con prefijo `/admin` |

---

## Seguridad

- **Acceso por red local únicamente**: El blueprint valida la IP del solicitante contra los rangos RFC-1918 (`10.x`, `172.16–31.x`, `192.168.x`, `127.x`) antes de devolver cualquier dato.
- **Sin autenticación por token**: El endpoint no requiere JWT. Es accesible desde cualquier cliente en la LAN.
- **Pendiente**: Si en el futuro se expone por Nginx al exterior, se deberá añadir una capa de autenticación (cabecera `X-Admin-Key` o similar).

---

## Consideraciones

- Los datos son **volátiles**: si el backend se reinicia, el `SessionManager` se vacía y las sesiones activas se pierden (los usuarios deberán volver a hacer login).
- Los resultados se ordenan por `cod_terminal` para facilitar la lectura.
- El tiempo de inactividad refleja el umbral respecto al cual el `SessionManager` expira sesiones (configurable con `SESSION_TIMEOUT_MINUTES`).
