from flask import Flask
from .config import Config
from .database import db
from .routes import register_routes


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    db.init_app(app)
    register_routes(app)

    return app
