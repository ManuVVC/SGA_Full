import jwt
import datetime
import logging

from ..repositories.auth_repo import AuthRepository
from ..repositories.terminal_repo import TerminalRepository
from ..utils.exceptions import UserNotFoundError, InvalidPasswordError
from werkzeug.security import check_password_hash, generate_password_hash
from .terminal_service import TerminalService

logger = logging.getLogger(__name__)



class AuthService:
    @staticmethod
    def login(username: str, password: str, ip_address: str, secret_key: str, session_timeout_minutes: int) -> dict:
        """
        Valida las credenciales de un operador contra el repositorio.
        Genera un token JWT si las credenciales son válidas y expira en 8 horas.
        """
        if not username:
            raise UserNotFoundError("El nombre de usuario no puede estar vacío.")

        # Validar y obtener el terminal asociado a la IP
        terminal_info = TerminalService.validar_y_obtener_terminal(ip_address)

        # Obtener el operador desde la base de datos
        operador = AuthRepository.get_operador_por_codigo(username)
        if not operador:
            raise UserNotFoundError(f"El operador '{username}' no existe en el sistema.")

        # Obtener contraseña almacenada
        stored_password = operador.get("PASSWORD")

        # Validar contraseña (soporte a hash para mayor seguridad, con retrocompatibilidad para claves planas)
        # Soporta que la contraseña sea NULL en base de datos (según OR PassWord IS NULL)
        if stored_password is not None:
            if stored_password.startswith('pbkdf2:'):
                if not check_password_hash(stored_password, password):
                    raise InvalidPasswordError("La contraseña proporcionada es incorrecta.")
            else:
                if stored_password != password:
                    raise InvalidPasswordError("La contraseña proporcionada es incorrecta.")
        else:
            # Si el password en BD es NULL y el usuario envía algo no vacío, o viceversa,
            # en Oracle (PassWord = p_Contraseña OR PassWord IS NULL) permite cualquier contraseña.
            # Seguiremos exactamente el comportamiento de Oracle.
            pass

        # Actualizar último operario en el terminal
        try:
            cod_terminal = terminal_info.get("CODTERMINAL")
            cod_operador = str(operador["CODOPERADOR"])
            TerminalRepository.actualizar_ultimo_operario(cod_terminal, cod_operador)
        except Exception as e:
            logger.error(f"Fallo al actualizar último operario en terminal '{cod_terminal}': {e}. El login continuará.")

        # Generar token JWT con validez de 8 horas
        ahora = datetime.datetime.now(datetime.timezone.utc)
        payload = {
            "sub": str(operador["CODOPERADOR"]),
            "nombre": operador["NOMBRE"],
            "terminal": terminal_info.get("CODTERMINAL"),
            "iat": ahora,
            "exp": ahora + datetime.timedelta(hours=8)
        }

        token = jwt.encode(payload, secret_key, algorithm="HS256")

        # Registrar la sesión en el gestor de sesiones
        from ..utils.session_manager import session_manager
        cod_terminal = terminal_info.get("CODTERMINAL")
        cod_operador = str(operador["CODOPERADOR"])
        session_manager.register_session(token, cod_terminal, cod_operador, ip_address)

        return {
            "token": token,
            "permisos": operador["permisos"],
            "terminal": terminal_info,
            "operador_nombre": operador["NOMBRE"],
            "session_timeout_minutes": session_timeout_minutes
        }

    @staticmethod
    def validate_credentials(username: str, password: str, ip_address: str = "", secret_key: str = "change-me", session_timeout_minutes: int = 30) -> bool:
        """
        Método legado para compatibilidad con la interfaz anterior.
        """
        try:
            AuthService.login(username, password, ip_address, secret_key, session_timeout_minutes)
            return True
        except Exception:
            return False

    @staticmethod
    def login_web(username: str, password: str, ip_address: str, secret_key: str, session_timeout_minutes: int) -> dict:
        """
        Valida credenciales para el Backoffice Web usando el NOMBRE del operador en Oracle.
        Soporta acceso desde PC aunque el terminal no esté en TMST_TERMINALES.
        """
        if not username:
            raise UserNotFoundError("El nombre de usuario no puede estar vacío.")

        # Obtener terminal por IP, o usar un terminal web genérico si se accede por navegador en PC
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

        stored_password = operador.get("PASSWORD")
        if stored_password is not None:
            if stored_password.startswith('pbkdf2:'):
                if not check_password_hash(stored_password, password):
                    raise InvalidPasswordError("La contraseña proporcionada es incorrecta.")
            else:
                if stored_password != password:
                    raise InvalidPasswordError("La contraseña proporcionada es incorrecta.")
        else:
            pass

        try:
            cod_terminal = terminal_info.get("CODTERMINAL")
            cod_operador = str(operador["CODOPERADOR"])
            if cod_terminal != "WEB-CONSOLE":
                TerminalRepository.actualizar_ultimo_operario(cod_terminal, cod_operador)
        except Exception as e:
            logger.error(f"Aviso actualizando terminal web: {e}")

        ahora = datetime.datetime.now(datetime.timezone.utc)
        payload = {
            "sub": str(operador["CODOPERADOR"]),
            "nombre": operador["NOMBRE"],
            "terminal": terminal_info.get("CODTERMINAL"),
            "iat": ahora,
            "exp": ahora + datetime.timedelta(hours=8)
        }

        token = jwt.encode(payload, secret_key, algorithm="HS256")

        from ..utils.session_manager import session_manager
        cod_terminal = terminal_info.get("CODTERMINAL")
        cod_operador = str(operador["CODOPERADOR"])
        session_manager.register_session(token, cod_terminal, cod_operador, ip_address)

        return {
            "token": token,
            "permisos": operador["permisos"],
            "terminal": terminal_info,
            "operador_nombre": operador["NOMBRE"],
            "operador_codigo": cod_operador,
            "session_timeout_minutes": session_timeout_minutes
        }

