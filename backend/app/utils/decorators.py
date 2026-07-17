import jwt
import logging
from functools import wraps
from flask import request, jsonify, current_app, g

logger = logging.getLogger(__name__)


def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        # Buscar en cabecera 'Authorization'
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            # El formato debe ser "Bearer <token>"
            parts = auth_header.split()
            if len(parts) == 2 and parts[0].lower() == 'bearer':
                token = parts[1]
        
        if not token:
            return jsonify({
                "status": "error",
                "error": "Unauthorized",
                "message": "Token de autenticación faltante o con formato inválido. Use Bearer <token>."
            }), 401
            
        try:
            secret_key = current_app.config.get("SECRET_KEY", "change-me")
            # Decodificar el token JWT
            payload = jwt.decode(token, secret_key, algorithms=["HS256"])
            
            # Validar la sesión activa y controlar inactividad
            from .session_manager import session_manager
            timeout_minutes = current_app.config.get("SESSION_TIMEOUT_MINUTES", 30)
            is_valid, error_reason = session_manager.validate_session(token, timeout_minutes)
            
            if not is_valid:
                if error_reason == "session_expired":
                    return jsonify({
                        "status": "error",
                        "error": "Unauthorized",
                        "code": "SESSION_EXPIRED",
                        "message": "La sesión ha expirado por inactividad. Por favor, inicie sesión de nuevo."
                    }), 401
                else:
                    return jsonify({
                        "status": "error",
                        "error": "Unauthorized",
                        "code": "SESSION_INVALIDATED",
                        "message": "Esta sesión ya no está activa. Se ha iniciado sesión desde otra pestaña o dispositivo para este terminal."
                    }), 401
            
            # Guardar la información del operador en el contexto g de Flask
            g.operador = {
                "cod_operador": payload.get("sub"),
                "nombre": payload.get("nombre"),
                "terminal": payload.get("terminal")
            }
        except jwt.ExpiredSignatureError:
            return jsonify({
                "status": "error",
                "error": "Unauthorized",
                "message": "El token ha expirado. Por favor, inicie sesión nuevamente."
            }), 401
        except jwt.InvalidTokenError as e:
            logger.warning(f"Error de validación de token: {e}")
            return jsonify({
                "status": "error",
                "error": "Unauthorized",
                "message": f"Token de autenticación inválido: {str(e)}"
            }), 401

        except Exception as e:
            return jsonify({
                "status": "error",
                "error": "Internal Server Error",
                "message": f"Error al procesar el token: {str(e)}"
            }), 500
            
        return f(*args, **kwargs)
        
    return decorated
