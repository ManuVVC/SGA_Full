import logging
import os
from ..repositories.terminal_repo import TerminalRepository
from ..utils.exceptions import TerminalNoAutorizado, TerminalBloqueado

logger = logging.getLogger(__name__)


def _es_ip_docker_o_local(ip: str) -> bool:
    """
    Devuelve True si la IP es una dirección que Docker Desktop (Windows/WSL2)
    o el propio host asignarían como gateway/origen NAT, es decir, cuando el
    backend NO puede ver la IP real de la PDA física.

    Rangos cubiertos:
      - Sin IP (None / cadena vacía)
      - 127.x.x.x          → loopback
      - ::1                 → loopback IPv6
      - 172.16.x – 172.31.x → toda la clase B privada que usa Docker
      - 10.x.x.x            → clase A privada (Docker WSL2, VPN internas)
    """
    if not ip:
        return True
    if ip == "::1":
        return True
    parts = ip.split(".")
    if len(parts) != 4:
        return False
    try:
        first = int(parts[0])
        second = int(parts[1])
    except ValueError:
        return False
    if first == 127:
        return True
    if first == 172 and 16 <= second <= 31:
        return True
    if first == 10:
        return True
    return False

class TerminalService:
    @staticmethod
    def validar_y_obtener_terminal(ip_address: str) -> dict:
        """
        Valida y obtiene la información del terminal utilizando la IP.
        """

        # 2. Bypass NAT de Docker Desktop (SÓLO desarrollo)
        # En producción, DEV_DEFAULT_TERMINAL_IP NO debe estar definido.
        # Si está definido y la IP resuelta es una IP interna de Docker,
        # significa que ninguna cabecera fiable llegó al backend → usamos el
        # valor de DEV_DEFAULT_TERMINAL_IP como identidad del terminal en dev.
        dev_default_ip = os.getenv("DEV_DEFAULT_TERMINAL_IP")
        if dev_default_ip and _es_ip_docker_o_local(ip_address):
            logger.info(f"[SGA][NAT Bypass] Redireccionando IP Docker/local '{ip_address}' → '{dev_default_ip}'")
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
