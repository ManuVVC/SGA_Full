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

class ArticuloNotFoundError(Exception):
    """Excepción cuando un artículo no existe en la base de datos."""
    def __init__(self, message="El artículo no existe"):
        self.message = message
        super().__init__(self.message)


class ArticuloNoEncontrado(Exception):
    """Excepción cuando un artículo no se encuentra en el maestro o no tiene stock."""
    def __init__(self, message="El artículo no existe o no tiene stock registrado"):
        self.message = message
        super().__init__(self.message)

class EanNoEncontrado(Exception):
    """Excepción cuando un código de barras (EAN) no se encuentra en el sistema."""
    def __init__(self, message="El código EAN no está registrado"):
        self.message = message
        super().__init__(self.message)
