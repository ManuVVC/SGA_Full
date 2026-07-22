from .auth_routes import auth_bp
from .stock_routes import stock_bp
from .reubicaciones_routes import reubicaciones_bp
from .entradas_routes import entradas_bp
from .utilidades_routes import utilidades_bp
from .ajustes_stock_routes import ajustes_stock_bp
from .devoluciones_routes import devoluciones_bp
from .admin_routes import admin_bp

def register_routes(app):
    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(stock_bp, url_prefix="/api/stock")
    app.register_blueprint(reubicaciones_bp, url_prefix="/api/reubicaciones")
    app.register_blueprint(entradas_bp, url_prefix="/api/entradas")
    app.register_blueprint(utilidades_bp, url_prefix="/api/utilidades")
    app.register_blueprint(ajustes_stock_bp) # url_prefix is already in the blueprint
    app.register_blueprint(devoluciones_bp, url_prefix="/api/devoluciones")
    app.register_blueprint(admin_bp, url_prefix="/admin")
