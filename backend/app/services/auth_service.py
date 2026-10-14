import jwt
import datetime
import logging
from typing import Dict, Any, Optional

from ..repositories.auth_repo import AuthRepository
from ..repositories.terminal_repo import TerminalRepository
from ..utils.exceptions import UserNotFoundError, InvalidPasswordError
from werkzeug.security import check_password_hash
from .terminal_service import TerminalService
from ..utils.session_manager import session_manager

logger = logging.getLogger(__name__)

class AuthService:
    @staticmethod
    def _verify_password(stored_password: Optional[str], provided_password: str) -> None:
        """
        Valida la contraseña contra la almacenada. Soporta hash o texto plano y permite NULL (retrocompatibilidad).
        """
        if stored_password is None:
            return

        if stored_password.startswith('pbkdf2:'):
            if not check_password_hash(stored_password, provided_password):
                raise InvalidPasswordError("La contraseña proporcionada es incorrecta.")
        else:
            if stored_password != provided_password:
                raise InvalidPasswordError("La contraseña proporcionada es incorrecta.")

    @staticmethod
    def _update_terminal_operator(cod_terminal: str, cod_operador: str) -> None:
        try:
            TerminalRepository.actualizar_ultimo_operario(cod_terminal, cod_operador)
        except Exception as e:
            logger.error(f"Fallo al actualizar último operario en terminal '{cod_terminal}': {e}.")

    @staticmethod
    def _generate_token_and_register_session(operador: Dict[str, Any], terminal_info: Dict[str, Any], secret_key: str, ip_address: str) -> str:
        ahora = datetime.datetime.now(datetime.timezone.utc)
        cod_operador = str(operador["CODOPERADOR"])
        cod_terminal = terminal_info.get("CODTERMINAL")

        payload = {
            "sub": cod_operador,
            "nombre": operador["NOMBRE"],
            "terminal": cod_terminal,
            "iat": ahora,
            "exp": ahora + datetime.timedelta(hours=8)
        }
        token = jwt.encode(payload, secret_key, algorithm="HS256")
        session_manager.register_session(token, cod_terminal, cod_operador, ip_address)
        return token

    @staticmethod
    def login(username: str, password: str, ip_address: str, secret_key: str, session_timeout_minutes: int) -> Dict[str, Any]:
        if not username:
            raise UserNotFoundError("El nombre de usuario no puede estar vacío.")

        terminal_info = TerminalService.validar_y_obtener_terminal(ip_address)
        operador = AuthRepository.get_operador_por_codigo(username)
        
        if not operador:
            raise UserNotFoundError(f"El operador '{username}' no existe en el sistema.")

        AuthService._verify_password(operador.get("PASSWORD"), password)
        AuthService._update_terminal_operator(terminal_info.get("CODTERMINAL"), str(operador["CODOPERADOR"]))
        
        token = AuthService._generate_token_and_register_session(operador, terminal_info, secret_key, ip_address)

        return {
            "token": token,
            "permisos": operador.get("permisos", []),
            "terminal": terminal_info,
            "operador_nombre": operador["NOMBRE"],
            "session_timeout_minutes": session_timeout_minutes
        }

    @staticmethod
    def validate_credentials(username: str, password: str, ip_address: str = "", secret_key: str = "change-me", session_timeout_minutes: int = 30) -> bool:
        try:
            AuthService.login(username, password, ip_address, secret_key, session_timeout_minutes)
            return True
        except Exception:
            return False

    @staticmethod
    def login_web(username: str, password: str, ip_address: str, secret_key: str, session_timeout_minutes: int) -> Dict[str, Any]:
        if not username:
            raise UserNotFoundError("El nombre de usuario no puede estar vacío.")

        try:
            terminal_info = TerminalService.validar_y_obtener_terminal(ip_address)
        except Exception:
            terminal_info = {
                "CODTERMINAL": "WEB-CONSOLE",
                "DESCRIPCION": "Consola Backoffice Web SGA",
                "BLOQUEADO": False,
                "PRM_ES_PDA": 0
            }

        operador = AuthRepository.get_operador_por_nombre(username)
        if not operador:
            raise UserNotFoundError(f"El operador '{username}' no existe en la base de datos Oracle.")

        AuthService._verify_password(operador.get("PASSWORD"), password)

        cod_terminal = terminal_info.get("CODTERMINAL")
        if cod_terminal != "WEB-CONSOLE":
            AuthService._update_terminal_operator(cod_terminal, str(operador["CODOPERADOR"]))

        token = AuthService._generate_token_and_register_session(operador, terminal_info, secret_key, ip_address)

        return {
            "token": token,
            "permisos": operador.get("permisos", []),
            "terminal": terminal_info,
            "operador_nombre": operador["NOMBRE"],
            "operador_codigo": str(operador["CODOPERADOR"]),
            "session_timeout_minutes": session_timeout_minutes
        }
