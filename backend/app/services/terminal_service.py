import logging
import os
import ipaddress
from ..repositories.terminal_repo import TerminalRepository
from ..utils.exceptions import TerminalNoAutorizado, TerminalBloqueado

logger = logging.getLogger(__name__)


_RED_LAN_TERMINALES = ipaddress.ip_network("192.168.0.0/16")


def _es_ip_docker_o_local(ip: str) -> bool:
    """
    Verifica si una IP es de loopback o de red interna de Docker/WSL2,
    excluyendo la red LAN real de los terminales (192.168.0.0/16).
    """
    if not ip:
        return True
    try:
        addr = ipaddress.ip_address(ip)
        if addr in _RED_LAN_TERMINALES:
            return False
        return addr.is_loopback or addr.is_private
    except ValueError:
        return False


class TerminalService:
    @staticmethod
    def validar_y_obtener_terminal(ip_address: str) -> dict:
        """
        Valida y obtiene la información del terminal utilizando la IP.
        """
        # Bypass NAT de Docker Desktop para desarrollo
        dev_default_ip = os.getenv("DEV_DEFAULT_TERMINAL_IP")
        if dev_default_ip and _es_ip_docker_o_local(ip_address):
            logger.info(f"[SGA][NAT Bypass] Redireccionando IP Docker/local '{ip_address}' → '{dev_default_ip}'")
            ip_address = dev_default_ip

        if not ip_address:
            raise TerminalNoAutorizado("No se pudo determinar la dirección IP del terminal.")

        logger.info(f"Iniciando validación de terminal para la IP: {ip_address}")
        terminal_info = TerminalRepository.get_info_terminal_por_ip(ip_address)

        if not terminal_info:
            raise TerminalNoAutorizado(f"El terminal con IP '{ip_address}' no está autorizado o no existe en la configuración.")

        # Verificar si el terminal está bloqueado
        prm_bloqueado = terminal_info.get("permisos", {}).get("PRM_BLOQUEADO", False)
        if str(prm_bloqueado).lower() in ("1", "true"):
            raise TerminalBloqueado(f"El terminal '{terminal_info.get('CODTERMINAL')}' está bloqueado.")

        return terminal_info
