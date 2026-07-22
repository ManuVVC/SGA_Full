import logging
import ipaddress
from flask import Blueprint, jsonify, request
from ..utils.session_manager import session_manager

admin_bp = Blueprint("admin", __name__)
logger = logging.getLogger(__name__)

# Redes consideradas "locales" — solo desde estas IPs se permite acceder
_REDES_LOCALES = [
    ipaddress.ip_network("127.0.0.0/8"),      # loopback
    ipaddress.ip_network("10.0.0.0/8"),        # clase A privada
    ipaddress.ip_network("172.16.0.0/12"),     # clase B privada (incluye Docker)
    ipaddress.ip_network("192.168.0.0/16"),    # clase C privada (LAN típica)
]


def _es_ip_local(ip: str) -> bool:
    """Devuelve True si la IP pertenece a una red privada/local."""
    if not ip or ip == "::1":
        return True
    # Limpiar formato IPv6 mapeado a IPv4
    ip = ip.replace("::ffff:", "").strip()
    try:
        addr = ipaddress.ip_address(ip)
        return any(addr in red for red in _REDES_LOCALES)
    except ValueError:
        return False


@admin_bp.route("/conexiones", methods=["GET"])
def get_conexiones():
    """
    Devuelve la lista de terminales/operadores actualmente conectados al servicio.

    Acceso restringido a la red local (LAN / rangos privados RFC-1918).
    Útil para supervisión sin necesidad de acceder a los logs.

    Respuesta ejemplo:
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
            }
        ]
    }
    """
    # Determinar IP del solicitante
    ip_solicitante = (
        request.headers.get("X-Real-IP", "").strip()
        or request.headers.get("X-Forwarded-For", "").split(",")[0].strip()
        or request.remote_addr
        or ""
    )
    ip_solicitante = ip_solicitante.replace("::ffff:", "").strip()

    if not _es_ip_local(ip_solicitante):
        logger.warning(
            f"[SGA][Admin] Acceso denegado a /admin/conexiones desde IP externa: {ip_solicitante}"
        )
        return jsonify({
            "status": "error",
            "error": "Forbidden",
            "message": "Este endpoint solo es accesible desde la red local."
        }), 403

    sesiones = session_manager.get_active_sessions()
    logger.info(
        f"[SGA][Admin] Consulta de conexiones activas desde {ip_solicitante} "
        f"— {len(sesiones)} sesión(es) activa(s)."
    )

    return jsonify({
        "status": "success",
        "total": len(sesiones),
        "sesiones": sesiones
    }), 200
