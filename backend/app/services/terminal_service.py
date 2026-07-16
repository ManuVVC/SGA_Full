import logging
import os
from ..repositories.terminal_repo import TerminalRepository
from ..utils.exceptions import TerminalNoAutorizado, TerminalBloqueado

logger = logging.getLogger(__name__)

class TerminalService:
    @staticmethod
    def validar_y_obtener_terminal(request) -> dict:
        """
        Valida y obtiene la información del terminal utilizando la IP 
        de la solicitud.
        """
        # Extraer IP (Priorizar X-Terminal-IP para resolver el NAT de Docker en Windows)
        ip_address = (
            request.headers.get('X-Terminal-IP')
            or request.headers.get('X-Forwarded-For', request.remote_addr)
        )
        if ip_address:
            # Si hay multiples IPs separadas por coma, tomar la primera
            ip_address = ip_address.split(',')[0].strip()
            # Limpiar formato IPv6 mapeado a IPv4
            ip_address = ip_address.replace('::ffff:', '')

        # Bypass automático para desarrollo en Windows (Docker NAT)
        # Si la IP es localhost o el gateway de Docker (172.x.x.x), forzamos a la IP definida en .env
        dev_default_ip = os.getenv("DEV_DEFAULT_TERMINAL_IP")
        if dev_default_ip and (not ip_address or ip_address in ("172.19.0.1", "172.25.96.1", "127.0.0.1") or ip_address.startswith("172.19.")):
            logger.info(f"[SGA][Dev Mode] Redireccionando IP Docker NAT '{ip_address}' a IP configurada '{dev_default_ip}'")
            ip_address = dev_default_ip

        logger.info(f"Iniciando validación de terminal para la IP: {ip_address}")

        if not ip_address:
            raise TerminalNoAutorizado("No se pudo determinar la dirección IP del terminal.")

        terminal_info = TerminalRepository.get_info_terminal_por_ip(ip_address)

        if terminal_info is None:
            raise TerminalNoAutorizado(f"El terminal con IP '{ip_address}' no está autorizado o no existe en la configuración.")

        # Verificar si el terminal está bloqueado
        permisos_terminal = terminal_info.get("permisos", {})
        prm_bloqueado = permisos_terminal.get("PRM_BLOQUEADO", False)
        # Asegurarse de manejar distintos tipos de datos (1, "1", True, etc.)
        if prm_bloqueado in (1, "1", True):
            raise TerminalBloqueado(f"El terminal '{terminal_info.get('CODTERMINAL')}' está bloqueado.")

        return terminal_info
