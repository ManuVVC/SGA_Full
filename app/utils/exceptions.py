class UserNotFoundError(Exception):
    """Excepción cuando un operador no existe en la base de datos."""
    def __init__(self, message="El usuario no existe"):
        self.message = message
        super().__init__(self.message)

class InvalidPasswordError(Exception):
    """Excepción cuando la contraseña proporcionada es incorrecta."""
    def __init__(self, message="Contraseña incorrecta"):
        self.message = message
        super().__init__(self.message)
