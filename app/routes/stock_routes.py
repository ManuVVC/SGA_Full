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

@stock_bp.route("/ean/<ean_leido>", methods=["GET"])
@token_required
def get_stock_ean(ean_leido):
    from ..utils.exceptions import EanNoEncontrado
    try:
        logger.info(f"Petición de consulta de stock EAN recibida: {ean_leido}")
        result = StockService.consultar_stock_ean(ean_leido)
        return jsonify(result), 200

    except EanNoEncontrado as e:
        logger.warning(f"EAN no encontrado: {str(e)}")
        return jsonify({
            "status": "error",
            "error": "Not Found",
            "message": str(e)
        }), 404

    except Exception as e:
        logger.error(f"Error inesperado al consultar stock EAN '{ean_leido}': {e}", exc_info=True)
        return jsonify({
            "status": "error",
            "error": "Internal Server Error",
            "message": "Error interno del servidor al consultar el EAN."
        }), 500

from flask import request

@stock_bp.route("/search", methods=["GET"])
@token_required
def search_stock():
    query = request.args.get("q", "")
    search_type = request.args.get("type", "")
    try:
        results = StockService.search_articulos(search_type, query)
        return jsonify({
            "status": "success",
            "data": results
        }), 200
    except Exception as e:
        logger.error(f"Error en búsqueda: {e}", exc_info=True)
        return jsonify({
            "status": "error",
            "message": "Error al buscar artículos."
        }), 500

@stock_bp.route("/article/<int:cod_articulo>/eans", methods=["GET"])
@token_required
def get_article_eans(cod_articulo):
    try:
        eans = StockService.consultar_eans_articulo(cod_articulo)
        return jsonify({
            "status": "success",
            "data": eans
        }), 200
    except Exception as e:
        logger.error(f"Error al obtener EANs: {e}", exc_info=True)
        return jsonify({
            "status": "error",
            "message": "Error al obtener los EANs."
        }), 500
