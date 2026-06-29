import logging
from flask import Blueprint, request, jsonify, g
from ..utils.decorators import token_required
from ..services.reubicaciones_service import ReubicacionesService

reubicaciones_bp = Blueprint("reubicaciones", __name__)
logger = logging.getLogger(__name__)

@reubicaciones_bp.route("/validar-ubicacion", methods=["POST"])
@token_required
def validar_ubicacion():
    data = request.get_json() or {}
    input_value = data.get("ubicacion")
    posicion = data.get("posicion")

    if not input_value:
        return jsonify({"status": "error", "message": "Debe proporcionar una ubicación."}), 400

    result = ReubicacionesService.validar_ubicacion(str(input_value), posicion)
    
    if result["status"] == "success":
        return jsonify(result), 200
    elif result["status"] == "necesita_posicion":
        return jsonify(result), 200 # 200 OK pero indicando al cliente qué hacer
    else:
        return jsonify(result), 404

@reubicaciones_bp.route("/validar-articulo", methods=["POST"])
@token_required
def validar_articulo():
    data = request.get_json() or {}
    input_value = data.get("articulo")
    tipo_busqueda = data.get("tipo_busqueda", "auto")

    if not input_value:
        return jsonify({"status": "error", "message": "Debe proporcionar un artículo."}), 400

    result = ReubicacionesService.validar_articulo(str(input_value), tipo_busqueda)
    
    if result["status"] == "success":
        return jsonify(result), 200
    elif result["status"] == "multiples_resultados":
        return jsonify(result), 200
    else:
        return jsonify(result), 404

@reubicaciones_bp.route("/validar-cantidad", methods=["POST"])
@token_required
def validar_cantidad():
    data = request.get_json() or {}
    cod_ubicacion = data.get("cod_ubicacion")
    cod_articulo = data.get("cod_articulo")
    cantidad = data.get("cantidad")
    unidades_conversion = data.get("unidades_conversion", 1)

    if cod_ubicacion is None or cod_articulo is None or cantidad is None:
        return jsonify({"status": "error", "message": "Faltan datos obligatorios."}), 400

    try:
        cantidad = float(cantidad)
        unidades_conversion = float(unidades_conversion)
    except ValueError:
        return jsonify({"status": "error", "message": "Cantidad o unidades_conversion inválidas."}), 400

    result = ReubicacionesService.validar_cantidad(cod_ubicacion, cod_articulo, cantidad, unidades_conversion)
    
    if result["status"] == "success":
        return jsonify(result), 200
    else:
        return jsonify(result), 400

@reubicaciones_bp.route("/lotes-disponibles", methods=["POST"])
@token_required
def lotes_disponibles():
    data = request.get_json() or {}
    cod_ubicacion = data.get("cod_ubicacion")
    cod_articulo = data.get("cod_articulo")

    if cod_ubicacion is None or cod_articulo is None:
        return jsonify({"status": "error", "message": "Faltan datos obligatorios."}), 400

    result = ReubicacionesService.obtener_lotes_disponibles(cod_ubicacion, cod_articulo)
    
    if result["status"] == "success":
        return jsonify(result), 200
    else:
        return jsonify(result), 400

@reubicaciones_bp.route("/grabar", methods=["POST"])
@token_required
def grabar_reubicacion():
    data = request.get_json() or {}
    origen = data.get("origen")
    destino = data.get("destino")
    articulo = data.get("articulo")
    cantidad = data.get("cantidad")
    lote = data.get("lote")

    if not all([origen, destino, articulo, cantidad]):
        return jsonify({"status": "error", "message": "Faltan datos en la petición."}), 400

    # Obtener info del contexto
    operador_info = g.get("operador", {})
    cod_operador = operador_info.get("cod_operador")
    cod_terminal = operador_info.get("terminal")

    if not cod_operador or not cod_terminal:
        return jsonify({"status": "error", "message": "Falta información del operador o terminal en el token."}), 401

    try:
        cantidad = float(cantidad)
    except ValueError:
        return jsonify({"status": "error", "message": "Cantidad inválida."}), 400

    result = ReubicacionesService.grabar_reubicacion(
        origen=origen, 
        destino=destino, 
        articulo=articulo, 
        cantidad=cantidad,
        terminal=cod_terminal,
        operador=cod_operador,
        lote=lote
    )
    
    if result["status"] == "success":
        return jsonify(result), 200
    else:
        return jsonify(result), 400

@reubicaciones_bp.route("/validar-palet", methods=["POST"])
@token_required
def validar_palet():
    data = request.get_json() or {}
    sscc = data.get("sscc")

    if not sscc:
        return jsonify({"status": "error", "message": "Debe proporcionar una matrícula (SSCC)."}), 400

    result = ReubicacionesService.validar_palet(str(sscc))
    
    if result["status"] == "success":
        return jsonify(result), 200
    else:
        return jsonify(result), 404

@reubicaciones_bp.route("/grabar-palet", methods=["POST"])
@token_required
def grabar_reubicacion_palet():
    data = request.get_json() or {}
    palet = data.get("palet")
    destino = data.get("destino")

    if not all([palet, destino]):
        return jsonify({"status": "error", "message": "Faltan datos en la petición (palet o destino)."}), 400

    # Obtener info del contexto
    operador_info = g.get("operador", {})
    cod_operador = operador_info.get("cod_operador")
    cod_terminal = operador_info.get("terminal")

    if not cod_operador or not cod_terminal:
        return jsonify({"status": "error", "message": "Falta información del operador o terminal en el token."}), 401

    result = ReubicacionesService.grabar_reubicacion_palet(
        palet=palet, 
        destino=destino, 
        terminal=cod_terminal,
        operador=cod_operador
    )
    
    if result["status"] == "success":
        return jsonify(result), 200
    else:
        return jsonify(result), 400
