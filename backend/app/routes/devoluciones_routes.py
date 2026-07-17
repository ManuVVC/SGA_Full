import logging
from flask import Blueprint, request, jsonify, g
from ..utils.decorators import token_required
from ..services.devoluciones_service import DevolucionesService

devoluciones_bp = Blueprint("devoluciones", __name__)
logger = logging.getLogger(__name__)


@devoluciones_bp.route("/clientes", methods=["GET"])
@token_required
def get_clientes():
    try:
        filtro = request.args.get("filtro", "").strip()
        if not filtro:
            return jsonify({"status": "success", "clientes": []}), 200

        clientes = DevolucionesService.get_clientes(filtro)
        return jsonify({
            "status": "success",
            "clientes": clientes
        }), 200
    except Exception as e:
        logger.error(f"Error en /devoluciones/clientes: {e}", exc_info=True)
        return jsonify({
            "status": "error",
            "message": "Error al buscar clientes."
        }), 500


@devoluciones_bp.route("/parametros", methods=["GET"])
@token_required
def get_parametros():
    try:
        config = DevolucionesService.get_parametros_devolucion()
        return jsonify({
            "status": "success",
            "parametros": config
        }), 200
    except Exception as e:
        logger.error(f"Error en /devoluciones/parametros: {e}", exc_info=True)
        return jsonify({
            "status": "error",
            "message": "Error al obtener parámetros de devoluciones."
        }), 500


@devoluciones_bp.route("/cabecera", methods=["POST"])
@token_required
def crear_cabecera():
    try:
        data = request.get_json() or {}
        
        # Inyectar operador y terminal desde la sesión del token en Flask g
        data['CODOPERADOR'] = g.operador.get("cod_operador")
        data['CODTERMINAL'] = g.operador.get("terminal")

        result = DevolucionesService.crear_devolucion_cabecera(data)
        return jsonify({
            "status": "success",
            "message": "Cabecera de devolución creada con éxito",
            "data": result
        }), 200
    except ValueError as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 400
    except Exception as e:
        logger.error(f"Error en /devoluciones/cabecera: {e}", exc_info=True)
        return jsonify({
            "status": "error",
            "message": "Error interno al crear la cabecera de la devolución."
        }), 500


@devoluciones_bp.route("/linea", methods=["POST"])
@token_required
def grabar_linea():
    try:
        data = request.get_json() or {}

        # Inyectar operador y terminal desde la sesión
        data['CODOPERADOR'] = g.operador.get("cod_operador")
        data['CODTERMINAL'] = g.operador.get("terminal")

        result = DevolucionesService.grabar_linea_devolucion(data)
        return jsonify({
            "status": "success",
            "message": "Línea de devolución grabada con éxito",
            "data": result
        }), 200
    except ValueError as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 400
    except Exception as e:
        logger.error(f"Error en /devoluciones/linea: {e}", exc_info=True)
        return jsonify({
            "status": "error",
            "message": f"Error al grabar la línea de devolución: {str(e)}"
        }), 500


@devoluciones_bp.route("/en-curso", methods=["GET"])
@token_required
def get_devolucion_en_curso():
    try:
        cod_operador = g.operador.get("cod_operador")
        result = DevolucionesService.get_devolucion_en_curso(cod_operador)
        return jsonify({
            "status": "success",
            "devolucion": result
        }), 200
    except Exception as e:
        logger.error(f"Error en /devoluciones/en-curso: {e}", exc_info=True)
        return jsonify({
            "status": "error",
            "message": "Error al obtener devolución en curso."
        }), 500


@devoluciones_bp.route("/lineas/<int:cod_documento>", methods=["GET"])
@token_required
def get_lineas_devolucion(cod_documento):
    try:
        result = DevolucionesService.get_lineas_devolucion(cod_documento)
        return jsonify({
            "status": "success",
            "lineas": result
        }), 200
    except Exception as e:
        logger.error(f"Error en /devoluciones/lineas/{cod_documento}: {e}", exc_info=True)
        return jsonify({
            "status": "error",
            "message": "Error al obtener líneas de la devolución."
        }), 500


@devoluciones_bp.route("/finalizar", methods=["POST"])
@token_required
def finalizar_devolucion():
    try:
        data = request.json or {}
        cod_documento = data.get("CODDOCUMENTO")
        if not cod_documento:
            return jsonify({
                "status": "error",
                "message": "El código de documento es obligatorio."
            }), 400
        result = DevolucionesService.finalizar_devolucion(cod_documento)
        return jsonify(result), 200
    except Exception as e:
        logger.error(f"Error en /devoluciones/finalizar: {e}", exc_info=True)
        return jsonify({
            "status": "error",
            "message": f"Error al finalizar la devolución: {str(e)}"
        }), 500
