from flask import Flask, jsonify, request, g
from .utils.exceptions import TerminalNoAutorizado, TerminalBloqueado
from .utils.db_logger import setup_audit_logger
import logging
import json

from .config import Config
from .database import db
from .routes import register_routes


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    setup_audit_logger(app)
    db.init_app(app)
    register_routes(app)

    # ── Endpoint de salud para el healthcheck de Docker ──────
    # Responde 200 OK en cuanto Flask está arriba.
    # No depende de Oracle para no bloquear el arranque.
    # Nginx hace rewrite /api/* → /*, por lo que el endpoint queda en /health.
    # El healthcheck de docker-compose llama directamente a Flask (sin Nginx).
    @app.route('/health')
    def health():
        return jsonify({'status': 'ok', 'service': 'sga-backend'}), 200

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

    if app.config.get("AUDIT_LOG_ENABLED"):
        audit_logger = logging.getLogger("audit")
        audit_logger.setLevel(logging.INFO)
        if not audit_logger.handlers:
            handler = logging.StreamHandler()
            formatter = logging.Formatter('%(asctime)s - AUDIT - %(message)s')
            handler.setFormatter(formatter)
            audit_logger.addHandler(handler)

        @app.before_request
        def log_request_info():
            g.audit_data = {
                "method": request.method,
                "url": request.url,
                "ip": request.remote_addr,
                "body": request.get_json(silent=True) if request.is_json else None
            }

        @app.after_request
        def log_response_info(response):
            if hasattr(g, 'audit_data'):
                operador = g.operador.get("cod_operador") if hasattr(g, 'operador') else "Desconocido"
                
                resp_body = None
                if response.is_json:
                    resp_body = response.get_json()
                
                audit_logger.info(
                    f"Terminal IP: {g.audit_data['ip']} | Operador: {operador} | "
                    f"Metodo: {g.audit_data['method']} | URL: {g.audit_data['url']} | "
                    f"ReqBody: {json.dumps(g.audit_data['body'], ensure_ascii=False)} | "
                    f"Status: {response.status_code} | RespBody: {json.dumps(resp_body, ensure_ascii=False) if resp_body else 'N/A'}"
                )
            return response

    return app

