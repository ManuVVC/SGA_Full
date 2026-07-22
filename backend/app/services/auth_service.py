import jwt
import datetime
import logging
from flask import current_app, request
from ..repositories.auth_repo import AuthRepository
from ..repositories.terminal_repo import TerminalRepository
from ..utils.exceptions import UserNotFoundError, InvalidPasswordError
from .terminal_service import TerminalService

logger = logging.getLogger(__name__)



class AuthService:
    @staticmethod
    def login(username: str, password: str) -> dict:
        """
        Valida las credenciales de un operador contra el repositorio.
        Genera un token JWT si las credenciales son válidas y expira en 8 horas.
        """
        if not username:
            raise UserNotFoundError("El nombre de usuario no puede estar vacío.")

        # Validar y obtener el terminal asociado a la IP
        terminal_info = TerminalService.validar_y_obtener_terminal(request)

        # Obtener el operador desde la base de datos
        operador = AuthRepository.get_operador_por_codigo(username)
        if not operador:
            raise UserNotFoundError(f"El operador '{username}' no existe en el sistema.")

        # Obtener contraseña almacenada
        stored_password = operador.get("PASSWORD")

        # Validar contraseña (directamente contra texto plano, según SPTOL_VALIDARUSUARIO)
        # Soporta que la contraseña sea NULL en base de datos (según OR PassWord IS NULL)
        if stored_password is not None:
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

        secret_key = current_app.config.get("SECRET_KEY", "change-me")
        token = jwt.encode(payload, secret_key, algorithm="HS256")

        # Extraer la IP del cliente (misma lógica de prioridad que TerminalService)
        ip_address = (
            request.headers.get('X-Terminal-IP', '').strip()
            or request.headers.get('X-Real-IP', '').strip()
            or request.headers.get('X-Forwarded-For', '').split(',')[0].strip()
            or request.remote_addr
            or ""
        )
        if ip_address:
            ip_address = ip_address.replace('::ffff:', '').strip()

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
            "session_timeout_minutes": current_app.config.get("SESSION_TIMEOUT_MINUTES", 30)
        }

    @staticmethod
    def validate_credentials(username: str, password: str) -> bool:
        """
        Método legado para compatibilidad con la interfaz anterior.
        """
        try:
            AuthService.login(username, password)
            return True
        except Exception:
            return False

