from flask import Blueprint, request, jsonify, g
from ..utils.decorators import token_required
from ..services.ajustes_stock_service import StockAjustesService
import logging

logger = logging.getLogger(__name__)

ajustes_stock_bp = Blueprint('ajustes_stock', __name__, url_prefix='/api/stock/ajustes')

@ajustes_stock_bp.route('/conceptos', methods=['GET'])
@token_required
def get_conceptos():
    try:
        conceptos = StockAjustesService.get_conceptos()
        return jsonify({"conceptos": conceptos}), 200
    except Exception as e:
        logger.error(f"Error fetching conceptos: {e}")
        return jsonify({"error": "Error interno del servidor"}), 500

@ajustes_stock_bp.route('/lotes', methods=['GET'])
@token_required
def get_lotes():
    try:
        cod_ubicacion = request.args.get('cod_ubicacion', type=int)
        cod_articulo = request.args.get('cod_articulo', type=int)
        if not cod_ubicacion or not cod_articulo:
            return jsonify({"error": "Faltan parámetros cod_ubicacion o cod_articulo"}), 400
            
        lotes = StockAjustesService.get_lotes(cod_ubicacion, cod_articulo)
        return jsonify({"lotes": lotes}), 200
    except Exception as e:
        logger.error(f"Error fetching lotes: {e}")
        return jsonify({"error": "Error interno del servidor"}), 500

@ajustes_stock_bp.route('/ejecutar', methods=['POST'])
@token_required
def ejecutar_ajuste():
    try:
        cod_operador = g.operador.get('cod_operador', 0) if hasattr(g, 'operador') else 0
        cod_terminal = g.operador.get('terminal', 0) if hasattr(g, 'operador') else 0

        payload = request.get_json()
        if not payload:
            return jsonify({"error": "Faltan datos de ajuste"}), 400

        result = StockAjustesService.ejecutar_ajuste(payload, cod_operador, cod_terminal)
        return jsonify(result), 200

    except Exception as e:
        logger.error(f"Error en ejecutar ajuste: {e}")
        return jsonify({"error": str(e)}), 500
