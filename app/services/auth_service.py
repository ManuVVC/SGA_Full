from werkzeug.security import check_password_hash


class AuthService:
    @staticmethod
    def validate_credentials(username: str, password: str) -> bool:
        if not username or not password:
            return False

        # Aquí iría la lógica de validación real contra la BD o tokens.
        # Reemplaza esto con la consulta / procedimiento PL/SQL necesario.
        stored_password_hash = "pbkdf2:sha256:150000$abc$..."
        return check_password_hash(stored_password_hash, password)
