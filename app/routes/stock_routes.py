import logging
from flask import Blueprint, jsonify
from ..services.stock_service import StockService
from ..utils.exceptions import ArticuloNotFoundError
from ..utils.decorators import token_required

stock_bp = Blueprint("stock", __name__)
logger = logging.getLogger(__name__)

@stock_bp.route("/<cod_articulo>", methods=["GET"])
@token_required
def get_stock(cod_articulo):
    """
    Ruta para consultar el stock de un artículo.
    Requiere token JWT de autenticación válido en la cabecera Authorization.
    
    Retorna la lista de ubicaciones con su stock formateada en JSON.
    """
    try:
        logger.info(f"Petición de consulta de stock recibida para el artículo: {cod_articulo}")
        
        result = StockService.consultar_stock_articulo(cod_articulo)
        
        return jsonify({
            "status": "success",
            "message": "Stock consultado correctamente",
            "data": result
        }), 200

    except ArticuloNotFoundError as e:
        logger.warning(f"Artículo no encontrado en la consulta de stock: {str(e)}")
        return jsonify({
            "status": "error",
            "error": "Not Found",
            "message": str(e)
        }), 404

    except Exception as e:
        logger.error(f"Error inesperado al consultar stock para el artículo '{cod_articulo}': {e}", exc_info=True)
        return jsonify({
            "status": "error",
            "error": "Internal Server Error",
            "message": "Error interno del servidor al consultar el inventario."
        }), 500
