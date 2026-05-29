from .auth_routes import auth_bp
from .stock_routes import stock_bp


def register_routes(app):
    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(stock_bp, url_prefix="/api/stock")

