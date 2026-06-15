from flask import Flask, jsonify
from .utils.exceptions import TerminalNoAutorizado, TerminalBloqueado

from .config import Config
from .database import db
from .routes import register_routes


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    db.init_app(app)
    register_routes(app)

    # Manejadores de errores globales
    @app.errorhandler(TerminalNoAutorizado)
    def handle_terminal_no_autorizado(error):
        return jsonify({
            "status": "error",
            "error": "Forbidden",
            "message": str(error)
        }), 403

    @app.errorhandler(TerminalBloqueado)
    def handle_terminal_bloqueado(error):
        return jsonify({
            "status": "error",
            "error": "Forbidden",
            "message": str(error)
        }), 403

    return app
