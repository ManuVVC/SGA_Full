import logging
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
        # Extraer IP
        ip_address = request.headers.get('X-Forwarded-For', request.remote_addr)
        if ip_address:
            # Si hay multiples IPs separadas por coma, tomar la primera
            ip_address = ip_address.split(',')[0].strip()
            # Limpiar formato IPv6 mapeado a IPv4
            ip_address = ip_address.replace('::ffff:', '')

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
