import logging
from flask import Blueprint, jsonify, request
from ..services.auth_service import AuthService
from ..services.terminal_service import TerminalService
from ..utils.exceptions import UserNotFoundError, InvalidPasswordError, TerminalNoAutorizado, TerminalBloqueado



auth_bp = Blueprint("auth", __name__)
logger = logging.getLogger(__name__)


@auth_bp.route("/terminal", methods=["GET"])
def get_terminal_info():
    try:
        terminal_info = TerminalService.validar_y_obtener_terminal(request)
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

        # Llamar al servicio de autenticación
        result = AuthService.login(username, password)

        return jsonify({
            "status": "success",
            "message": "Autenticación exitosa",
            "token": result["token"],
            "permisos": result["permisos"],
            "terminal": result["terminal"],
            "operador_nombre": result["operador_nombre"]
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
    return jsonify({"message": "Logout exitoso"}), 200

