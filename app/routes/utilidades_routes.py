from flask import Blueprint, request, jsonify
import logging
from ..services.utilidades_service import UtilidadesService
from ..utils.decorators import token_required

logger = logging.getLogger(__name__)

utilidades_bp = Blueprint("utilidades", __name__)

@utilidades_bp.route("/ean/<ean>", methods=["GET"])
@token_required
def get_ean_info(ean):
    try:
        if not ean:
            return jsonify({"status": "error", "message": "EAN es requerido"}), 400
        
        result = UtilidadesService.get_ean_info(ean)
        return jsonify(result), 200
    except Exception as e:
        logger.error(f"Error en GET /api/utilidades/ean/{ean}: {e}", exc_info=True)
        return jsonify({"status": "error", "message": "Error al obtener información del EAN"}), 500

@utilidades_bp.route("/ean", methods=["POST"])
@token_required
def create_ean():
    try:
        data = request.json
        ean = data.get("ean")
        cod_articulo = data.get("codArticulo")
        factor = data.get("factor")

        if not ean or not cod_articulo or factor is None:
            return jsonify({"status": "error", "message": "EAN, código de artículo y factor son requeridos"}), 400
        
        # Validar factor
        try:
            factor = float(factor)
            if factor <= 0:
                return jsonify({"status": "error", "message": "El factor debe ser mayor a 0"}), 400
        except ValueError:
            return jsonify({"status": "error", "message": "Factor inválido"}), 400

        result = UtilidadesService.crear_ean(ean, cod_articulo, factor)
        if result["status"] == "error":
            return jsonify(result), 400
            
        return jsonify(result), 201
    except Exception as e:
        logger.error(f"Error en POST /api/utilidades/ean: {e}", exc_info=True)
        return jsonify({"status": "error", "message": "Error al crear el EAN"}), 500

@utilidades_bp.route("/ean/<ean>", methods=["PUT"])
@token_required
def update_ean(ean):
    try:
        data = request.json
        cod_articulo = data.get("codArticulo")
        factor = data.get("factor")

        if not cod_articulo or factor is None:
            return jsonify({"status": "error", "message": "Código de artículo y factor son requeridos"}), 400
        
        # Validar factor
        try:
            factor = float(factor)
            if factor <= 0:
                return jsonify({"status": "error", "message": "El factor debe ser mayor a 0"}), 400
        except ValueError:
            return jsonify({"status": "error", "message": "Factor inválido"}), 400

        result = UtilidadesService.actualizar_ean(ean, cod_articulo, factor)
        if result["status"] == "error":
            return jsonify(result), 404
            
        return jsonify(result), 200
    except Exception as e:
        logger.error(f"Error en PUT /api/utilidades/ean/{ean}: {e}", exc_info=True)
        return jsonify({"status": "error", "message": "Error al actualizar el EAN"}), 500
