import logging
# pyrefly: ignore [missing-import]
from flask import Blueprint, jsonify
from ..utils.decorators import token_required
from ..services.stock_service import StockService
from ..utils.exceptions import ArticuloNoEncontrado, EanNoEncontrado

stock_bp = Blueprint("stock", __name__)
logger = logging.getLogger(__name__)


@stock_bp.route("/<string:cod_articulo>", methods=["GET"])
@token_required
def obtener_stock(cod_articulo):
    """
    Endpoint para consultar el stock desglosado de un artículo.
    Requiere autenticación JWT en cabecera 'Authorization'.
    """
    try:
        logger.info(f"Petición GET de consulta de stock recibida para artículo '{cod_articulo}'")
        
        resultado = StockService.consultar_stock_articulo(cod_articulo)
        
        return jsonify({
            "status": "success",
            "message": "Stock consultado con éxito",
            "data": resultado
        }), 200

    except ValueError as e:
        return jsonify({
            "status": "error",
            "error": "Bad Request",
            "message": str(e)
        }), 400

    except ArticuloNoEncontrado as e:
        return jsonify({
            "status": "error",
            "error": "Not Found",
            "message": str(e)
        }), 404

    except Exception as e:
        logger.error(f"Error grave en endpoint de stock para '{cod_articulo}': {e}", exc_info=True)
        return jsonify({
            "status": "error",
            "error": "Internal Server Error",
            "message": "Error interno del servidor al procesar la consulta."
        }), 500


@stock_bp.route("/ean/<string:ean_leido>", methods=["GET"])
@token_required
def obtener_stock_por_ean(ean_leido):
    """
    Endpoint para consultar el stock desglosado de un artículo mediante su EAN.
    Requiere autenticación JWT en cabecera 'Authorization'.
    El JSON de salida está adaptado para lectura en terminales Seypos.
    """
    try:
        logger.info(f"Petición GET de consulta de stock por EAN recibida para: '{ean_leido}'")
        
        resultado = StockService.consultar_stock_ean(ean_leido)
        
        # El servicio ya devuelve la estructura de Seypos (que incluye ubicaciones y stock de forma redundante para máxima compatibilidad)
        return jsonify(resultado), 200

    except ValueError as e:
        return jsonify({
            "status": "error",
            "error": "Bad Request",
            "message": str(e)
        }), 400

    except EanNoEncontrado as e:
        return jsonify({
            "status": "error",
            "error": "Not Found",
            "message": str(e)
        }), 404

    except Exception as e:
        logger.error(f"Error grave en endpoint de stock por EAN para '{ean_leido}': {e}", exc_info=True)
        return jsonify({
            "status": "error",
            "error": "Internal Server Error",
            "message": "Error interno del servidor al procesar la consulta de EAN."
        }), 500
