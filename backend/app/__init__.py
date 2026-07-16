from flask import Flask, jsonify
from .config import Config
from .database import db
from .routes import register_routes


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    db.init_app(app)
    register_routes(app)

    # ── Endpoint de salud para el healthcheck de Docker ──────
    # Responde 200 OK en cuanto Flask está arriba.
    # No depende de Oracle para no bloquear el arranque.
    @app.route('/api/health')
    def health():
        return jsonify({'status': 'ok', 'service': 'sga-backend'}), 200

    return app
