from functools import wraps
from flask import request, jsonify, current_app, g
import jwt


def token_required(f):
    """
    Decorador para proteger rutas con autenticación JWT.
    Busca el token en la cabecera 'Authorization' con formato 'Bearer <token>'.
    Si el token es válido, almacena el CODOPERADOR en g.current_user y continúa.
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None

        # Obtener cabecera Authorization
        auth_header = request.headers.get("Authorization")
        if auth_header:
            parts = auth_header.split(" ")
            if len(parts) == 2 and parts[0].lower() == "bearer":
                token = parts[1]
            else:
                # Soporte de fallback si envían el token directamente sin Bearer
                token = auth_header

        if not token:
            return jsonify({
                "status": "error",
                "error": "Unauthorized",
                "message": "Token de autenticación faltante."
            }), 401

        try:
            secret_key = current_app.config.get("SECRET_KEY", "change-me")
            payload = jwt.decode(token, secret_key, algorithms=["HS256"])
            # Inyectar el código del operador en el contexto global de Flask (g)
            g.current_user = payload.get("sub")
        except jwt.ExpiredSignatureError:
            return jsonify({
                "status": "error",
                "error": "Unauthorized",
                "message": "El token ha expirado. Por favor, inicie sesión de nuevo."
            }), 401
        except jwt.InvalidTokenError:
            return jsonify({
                "status": "error",
                "error": "Unauthorized",
                "message": "Token de autenticación inválido."
            }), 401

        return f(*args, **kwargs)

    return decorated
