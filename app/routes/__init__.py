from .auth_routes import auth_bp
from .stock_routes import stock_bp
from .reubicaciones_routes import reubicaciones_bp
from .entradas_routes import entradas_bp
from .utilidades_routes import utilidades_bp

def register_routes(app):
    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(stock_bp, url_prefix="/api/stock")
    app.register_blueprint(reubicaciones_bp, url_prefix="/api/reubicaciones")
    app.register_blueprint(entradas_bp, url_prefix="/api/entradas")
    app.register_blueprint(utilidades_bp, url_prefix="/api/utilidades")
