import jwt
import datetime
from flask import current_app
from ..repositories.auth_repo import AuthRepository
from ..utils.exceptions import UserNotFoundError, InvalidPasswordError


class AuthService:
    @staticmethod
    def login(username: str, password: str) -> dict:
        """
        Valida las credenciales de un operador contra el repositorio.
        Genera un token JWT si las credenciales son válidas y expira en 8 horas.
        """
        if not username:
            raise UserNotFoundError("El nombre de usuario no puede estar vacío.")

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

        # Generar token JWT con validez de 8 horas
        ahora = datetime.datetime.now(datetime.timezone.utc)
        payload = {
            "sub": operador["CODOPERADOR"],
            "nombre": operador["NOMBRE"],
            "iat": ahora,
            "exp": ahora + datetime.timedelta(hours=8)
        }

        secret_key = current_app.config.get("SECRET_KEY", "change-me")
        token = jwt.encode(payload, secret_key, algorithm="HS256")

        return {
            "token": token,
            "permisos": operador["permisos"]
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

