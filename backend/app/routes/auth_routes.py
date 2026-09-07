import logging
from flask import Blueprint, jsonify, request, current_app
from ..services.auth_service import AuthService
from ..services.terminal_service import TerminalService
from ..utils.exceptions import UserNotFoundError, InvalidPasswordError, TerminalNoAutorizado, TerminalBloqueado

auth_bp = Blueprint("auth", __name__)
logger = logging.getLogger(__name__)

def _extract_ip(req) -> str:
    x_terminal_ip = req.headers.get('X-Terminal-IP', '').strip()
    x_real_ip = req.headers.get('X-Real-IP', '').strip()
    x_forwarded = req.headers.get('X-Forwarded-For', '').split(',')[0].strip()
    
    ip_address = (
        x_terminal_ip
        or x_real_ip
        or x_forwarded
        or req.remote_addr
        or ""
    )
    if ip_address:
        ip_address = ip_address.replace('::ffff:', '').strip()
    return ip_address


@auth_bp.route("/terminal", methods=["GET"])
def get_terminal_info():
    try:
        ip_address = _extract_ip(request)
        terminal_info = TerminalService.validar_y_obtener_terminal(ip_address)
        return jsonify({
            "status": "success",
            "terminal": terminal_info
        }), 200

    except (TerminalNoAutorizado, TerminalBloqueado) as e:
        return jsonify({
            "status": "error",
            "error": "Forbidden",
            "message": str(e)
        }), 403

    except Exception as e:
        logger.error(f"Error inesperado en endpoint de terminal: {e}", exc_info=True)
        return jsonify({
            "status": "error",
            "error": "Internal Server Error",
            "message": "Error interno del servidor al obtener la información del terminal."
        }), 500


@auth_bp.route("/login", methods=["POST"])
def login():
    try:
        data = request.get_json() or {}
        username = data.get("username")
        password = data.get("password")

        ip_address = _extract_ip(request)
        secret_key = current_app.config.get("SECRET_KEY", "change-me")
        session_timeout = current_app.config.get("SESSION_TIMEOUT_MINUTES", 30)

        # Llamar al servicio de autenticación
        result = AuthService.login(username, password, ip_address, secret_key, session_timeout)

        return jsonify({
            "status": "success",
            "message": "Autenticación exitosa",
            "token": result["token"],
            "permisos": result["permisos"],
            "terminal": result["terminal"],
            "operador_nombre": result["operador_nombre"],
            "session_timeout_minutes": result["session_timeout_minutes"]
        }), 200

    except UserNotFoundError as e:
        return jsonify({
            "status": "error",
            "error": "Not Found",
            "message": str(e)
        }), 404

    except InvalidPasswordError as e:
        return jsonify({
            "status": "error",
            "error": "Unauthorized",
            "message": str(e)
        }), 401

    except (TerminalNoAutorizado, TerminalBloqueado) as e:
        return jsonify({
            "status": "error",
            "error": "Forbidden",
            "message": str(e)
        }), 403

    except Exception as e:
        logger.error(f"Error inesperado en endpoint de login: {e}", exc_info=True)
        return jsonify({
            "status": "error",
            "error": "Internal Server Error",
            "message": "Error interno del servidor. Problema con la base de datos o procesamiento."
        }), 500


@auth_bp.route("/logout", methods=["POST"])
def logout():
    token = None
    if "Authorization" in request.headers:
        auth_header = request.headers["Authorization"]
        parts = auth_header.split()
        if len(parts) == 2 and parts[0].lower() == "bearer":
            token = parts[1]

    if token:
        from ..utils.session_manager import session_manager
        session_manager.remove_session(token)

    return jsonify({"message": "Logout exitoso"}), 200


@auth_bp.route("/login-web", methods=["POST"])
def login_web():
    """
    Endpoint específico para autenticación desde el Backoffice Web SGA.
    Autentica contra Oracle DB usando el NOMBRE de operario en vez del código numérico.
    """
    try:
        data = request.get_json() or {}
        username = data.get("nombre") or data.get("username")
        password = data.get("password")

        ip_address = _extract_ip(request)
        secret_key = current_app.config.get("SECRET_KEY", "change-me")
        session_timeout = current_app.config.get("SESSION_TIMEOUT_MINUTES", 30)

        result = AuthService.login_web(username, password, ip_address, secret_key, session_timeout)

        return jsonify({
            "status": "success",
            "message": "Autenticación web exitosa en Oracle DB",
            "token": result["token"],
            "permisos": result["permisos"],
            "terminal": result["terminal"],
            "operador_nombre": result["operador_nombre"],
            "operador_codigo": result.get("operador_codigo"),
            "session_timeout_minutes": result["session_timeout_minutes"]
        }), 200

    except UserNotFoundError as e:
        return jsonify({
            "status": "error",
            "error": "Not Found",
            "message": str(e)
        }), 404

    except InvalidPasswordError as e:
        return jsonify({
            "status": "error",
            "error": "Unauthorized",
            "message": str(e)
        }), 401

    except Exception as e:
        logger.error(f"Error inesperado en endpoint de login-web: {e}", exc_info=True)
        return jsonify({
            "status": "error",
            "error": "Internal Server Error",
            "message": "Error interno al autenticar en la base de datos."
        }), 500


