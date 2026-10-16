from flask import Blueprint, request, jsonify, g
import logging
from ..services.kits_service import KitsService
from ..utils.decorators import token_required

logger = logging.getLogger(__name__)

kits_bp = Blueprint("kits", __name__)


@kits_bp.route("/<int:cod_articulo>/composicion", methods=["GET"])
@token_required
def get_composicion(cod_articulo):
    """
    Obtiene la composición de un artículo kit y calcula la disponibilidad de sus componentes.
    Opcionalmente acepta ?cod_ubicacion=X para comprobar el stock en dicha ubicación.
    """
    try:
        cod_ubicacion_param = request.args.get("cod_ubicacion")
        cod_ubicacion = int(cod_ubicacion_param) if cod_ubicacion_param and cod_ubicacion_param.isdigit() else None

        result = KitsService.consultar_composicion_kit(cod_articulo, cod_ubicacion)
        status_code = 200 if result.get("status") == "success" else 400
        return jsonify(result), status_code
    except Exception as e:
        logger.error(f"Error en GET /api/kits/{cod_articulo}/composicion: {e}", exc_info=True)
        return jsonify({"status": "error", "message": "Error al consultar la composición del kit."}), 500


@kits_bp.route("/validar-montaje", methods=["POST"])
@token_required
def validar_montaje():
    """
    Valida si existe suficiente stock de todos los componentes para montar el kit.
    """
    try:
        data = request.json or {}
        cod_ubicacion = data.get("cod_ubicacion")
        cod_articulo = data.get("cod_articulo")
        cantidad = data.get("cantidad")

        if cod_ubicacion is None or cod_articulo is None or cantidad is None:
            return jsonify({"status": "error", "message": "cod_ubicacion, cod_articulo y cantidad son requeridos."}), 400

        try:
            cod_ubicacion = int(cod_ubicacion)
            cod_articulo = int(cod_articulo)
            cantidad = float(cantidad)
        except (ValueError, TypeError):
            return jsonify({"status": "error", "message": "Parámetros numéricos inválidos."}), 400

        result = KitsService.validar_montaje(cod_ubicacion, cod_articulo, cantidad)
        status_code = 200 if result.get("status") == "success" else 400
        return jsonify(result), status_code
    except Exception as e:
        logger.error(f"Error en POST /api/kits/validar-montaje: {e}", exc_info=True)
        return jsonify({"status": "error", "message": "Error al validar el montaje del kit."}), 500


@kits_bp.route("/montar", methods=["POST"])
@token_required
def montar_kit():
    """
    Ejecuta el procedimiento de montaje de kits en almacén (GSM_LOTES.SPPRP_CrearLote).
    """
    try:
        data = request.json or {}
        cod_ubicacion_origen = data.get("cod_ubicacion_origen")
        cod_articulo = data.get("cod_articulo")
        cantidad = data.get("cantidad")

        if cod_ubicacion_origen is None or cod_articulo is None or cantidad is None:
            return jsonify({"status": "error", "message": "cod_ubicacion_origen, cod_articulo y cantidad son requeridos."}), 400

        try:
            cod_ubicacion_origen = int(cod_ubicacion_origen)
            cod_articulo = int(cod_articulo)
            cantidad = float(cantidad)
        except (ValueError, TypeError):
            return jsonify({"status": "error", "message": "Parámetros numéricos inválidos."}), 400

        cod_terminal = g.operador.get("terminal")
        if not cod_terminal:
            return jsonify({"status": "error", "message": "Terminal no identificado en la sesión del usuario."}), 400

        fecha_caducidad = data.get("fecha_caducidad")
        peso = float(data.get("peso", 0) or 0)
        cod_ubicacion_dest = data.get("cod_ubicacion_destino")
        cod_ubicacion_destino = int(cod_ubicacion_dest) if cod_ubicacion_dest and str(cod_ubicacion_dest).isdigit() else None
        cod_palet = int(data.get("cod_palet")) if data.get("cod_palet") and str(data.get("cod_palet")).isdigit() else None
        cod_facturacion = data.get("cod_facturacion")
        numero_lote = data.get("numero_lote")

        result = KitsService.ejecutar_montaje(
            cod_terminal=int(cod_terminal),
            cod_ubicacion_origen=cod_ubicacion_origen,
            cod_articulo=cod_articulo,
            cantidad=cantidad,
            fecha_caducidad_str=fecha_caducidad,
            peso=peso,
            cod_ubicacion_destino=cod_ubicacion_destino,
            cod_palet=cod_palet,
            cod_facturacion=cod_facturacion,
            numero_lote=numero_lote
        )

        status_code = 200 if result.get("status") == "success" else 400
        return jsonify(result), status_code
    except Exception as e:
        logger.error(f"Error en POST /api/kits/montar: {e}", exc_info=True)
        return jsonify({"status": "error", "message": "Error al montar el kit."}), 500


@kits_bp.route("/ubicacion/<int:cod_ubicacion>", methods=["GET"])
@token_required
def get_kits_en_ubicacion(cod_ubicacion):
    """
    Devuelve los kits disponibles en una ubicación y valida su viabilidad de desmontaje por zonas.
    """
    try:
        result = KitsService.listar_kits_desmontables(cod_ubicacion)
        status_code = 200 if result.get("status") == "success" else 400
        return jsonify(result), status_code
    except Exception as e:
        logger.error(f"Error en GET /api/kits/ubicacion/{cod_ubicacion}: {e}", exc_info=True)
        return jsonify({"status": "error", "message": "Error al consultar kits en la ubicación."}), 500


@kits_bp.route("/validar-desmontaje", methods=["POST"])
@token_required
def validar_desmontaje():
    """
    Valida las restricciones de zona y disponibilidad para desmontar un kit.
    """
    try:
        data = request.json or {}
        cod_ubicacion = data.get("cod_ubicacion")
        cod_articulo = data.get("cod_articulo")
        numero_orden = data.get("numero_orden")
        unidades = data.get("unidades")

        if cod_ubicacion is None or cod_articulo is None or numero_orden is None or unidades is None:
            return jsonify({"status": "error", "message": "cod_ubicacion, cod_articulo, numero_orden y unidades son requeridos."}), 400

        try:
            cod_ubicacion = int(cod_ubicacion)
            cod_articulo = int(cod_articulo)
            numero_orden = int(numero_orden)
            unidades = float(unidades)
        except (ValueError, TypeError):
            return jsonify({"status": "error", "message": "Parámetros numéricos inválidos."}), 400

        result = KitsService.validar_desmontaje(cod_ubicacion, cod_articulo, numero_orden, unidades)
        status_code = 200 if result.get("status") == "success" else 400
        return jsonify(result), status_code
    except Exception as e:
        logger.error(f"Error en POST /api/kits/validar-desmontaje: {e}", exc_info=True)
        return jsonify({"status": "error", "message": "Error al validar el desmontaje."}), 500


@kits_bp.route("/desmontar", methods=["POST"])
@token_required
def desmontar_kit():
    """
    Ejecuta el desensamblado del kit en almacén (GSM_LOTES.SPPRP_DESMONTARLOTES).
    """
    try:
        data = request.json or {}
        cod_ubicacion = data.get("cod_ubicacion")
        cod_articulo = data.get("cod_articulo")
        numero_orden = data.get("numero_orden")
        unidades = data.get("unidades")
        tipo_actualizacion = int(data.get("tipo_actualizacion", 0) or 0)

        if cod_ubicacion is None or cod_articulo is None or numero_orden is None or unidades is None:
            return jsonify({"status": "error", "message": "cod_ubicacion, cod_articulo, numero_orden y unidades son requeridos."}), 400

        try:
            cod_ubicacion = int(cod_ubicacion)
            cod_articulo = int(cod_articulo)
            numero_orden = int(numero_orden)
            unidades = float(unidades)
        except (ValueError, TypeError):
            return jsonify({"status": "error", "message": "Parámetros numéricos inválidos."}), 400

        cod_terminal = g.operador.get("terminal")
        if not cod_terminal:
            return jsonify({"status": "error", "message": "Terminal no identificado en la sesión del usuario."}), 400

        result = KitsService.ejecutar_desmontaje(
            cod_terminal=int(cod_terminal),
            cod_ubicacion=cod_ubicacion,
            cod_articulo=cod_articulo,
            numero_orden=numero_orden,
            unidades=unidades,
            tipo_actualizacion=tipo_actualizacion
        )

        status_code = 200 if result.get("status") == "success" else 400
        return jsonify(result), status_code
    except Exception as e:
        logger.error(f"Error en POST /api/kits/desmontar: {e}", exc_info=True)
        return jsonify({"status": "error", "message": "Error al desmontar el kit."}), 500
