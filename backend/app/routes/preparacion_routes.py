from flask import Blueprint, jsonify, request, g
from ..utils.decorators import token_required
from app.services.preparacion_service import PreparacionService

preparacion_bp = Blueprint('preparacion', __name__)


@preparacion_bp.route('/obtener-documento', methods=['GET'])
@token_required
def obtener_documento():
    """Obtiene el documento asignado al terminal del operario."""
    try:
        current_user = g.operador if hasattr(g, 'operador') else {}
        result = PreparacionService.obtener_documento(current_user)
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@preparacion_bp.route('/cabecera/<int:cod_documento>', methods=['GET'])
@token_required
def get_cabecera(cod_documento):
    """Devuelve la cabecera completa del pedido."""
    try:
        result = PreparacionService.get_cabecera(cod_documento)
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@preparacion_bp.route('/permisos', methods=['GET'])
@token_required
def get_permisos():
    """
    Devuelve los PRM_SOLICITAR* y PRM_PUEDESERVIRMAS del operario en sesión.
    -1 = activo, 0 = desactivado.
    """
    try:
        current_user = g.operador if hasattr(g, 'operador') else {}
        # El decorator pone 'cod_operador' (ver decorators.py línea 56)
        cod_operador = current_user.get('cod_operador', 0)
        result = PreparacionService.get_permisos(int(cod_operador))
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@preparacion_bp.route('/validar-ubicacion', methods=['POST'])
@token_required
def validar_ubicacion():
    """Valida si un código de hueco escaneado existe"""
    try:
        data = request.get_json() or {}
        cod_hueco = data.get('cod_hueco', '').strip()
        cod_ubicacion_esperada = data.get('cod_ubicacion_esperada')
        posicion = data.get('posicion')
        
        if not cod_hueco:
            return jsonify({"status": "error", "message": "Parámetro cod_hueco es requerido"}), 400
            
        result = PreparacionService.validar_ubicacion(cod_hueco, cod_ubicacion_esperada, posicion)
        return jsonify(result), 200
    except Exception as e:
        logger.error(f"Error en validar_ubicacion ruta: {e}", exc_info=True)
        return jsonify({"error": str(e)}), 500


@preparacion_bp.route('/stock-lotes', methods=['POST'])
@token_required
def get_stock_lotes():
    """
    Devuelve el stock disponible por lote/caducidad de un artículo en una ubicación,
    filtrando caducados (fecha < hoy) y solo con stock > 0.
    Body: { cod_ubicacion: int, cod_articulo: int }
    """
    try:
        data = request.json or {}
        cod_ubicacion = data.get('cod_ubicacion')
        cod_articulo = data.get('cod_articulo')
        if not cod_ubicacion or not cod_articulo:
            return jsonify({"error": "cod_ubicacion y cod_articulo son requeridos"}), 400
        result = PreparacionService.get_stock_lotes(int(cod_ubicacion), int(cod_articulo))
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@preparacion_bp.route('/lineas-pendientes/<int:cod_documento>', methods=['GET'])
@token_required
def get_lineas_pendientes(cod_documento):
    """Devuelve todas las líneas pendientes del documento para mostrar el selector."""
    try:
        result = PreparacionService.get_lineas_pendientes(cod_documento)
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@preparacion_bp.route('/primera-linea', methods=['POST'])
@token_required
def primera_linea():
    """
    Devuelve la primera línea a preparar del documento.
    SPPRP_ARTICULOSPARAPREPARAR ya llama internamente a SPPRP_INSTMP_ARTPARAPREPARAR.
    Body: { cod_documento }
    """
    try:
        data = request.json or {}
        cod_documento = data.get('cod_documento')
        if not cod_documento:
            return jsonify({"error": "cod_documento es requerido"}), 400
        result = PreparacionService.get_primera_linea(int(cod_documento))
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@preparacion_bp.route('/siguiente-linea', methods=['POST'])
@token_required
def siguiente_linea():
    """
    Devuelve el siguiente o anterior artículo a preparar.
    Body: {
      cod_documento, cod_ubicacion, numero_orden,
      tipo_avance (0=siguiente, 1=anterior),
      cod_ubicacion_actual, cod_articulo,
      cant_solicitada? (para identificar la línea actual)
    }
    """
    try:
        data = request.json or {}
        cod_documento = data.get('cod_documento')
        if not cod_documento:
            return jsonify({"error": "cod_documento es requerido"}), 400

        result = PreparacionService.siguiente_linea(
            cod_documento=int(cod_documento),
            cod_ubicacion=data.get('cod_ubicacion', 0),
            numero_orden=data.get('numero_orden', 0),
            tipo_avance=data.get('tipo_avance', 0),
            cod_ubicacion_actual=data.get('cod_ubicacion_actual', 0),
            cod_articulo=data.get('cod_articulo', 0),
            cant_solicitada=data.get('cant_solicitada'),
        )
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@preparacion_bp.route('/cargar-mercancia', methods=['POST'])
@token_required
def cargar_mercancia():
    """
    Registra las unidades preparadas de una línea.
    Body: {
      cod_documento, cod_ubicacion, cod_articulo, num_linea, unidades,
      fecha_caducidad?, numero_lote?,
      cod_tipo_dato_maestro?, cod_dato_maestro?
    }
    """
    try:
        data = request.json or {}
        required = ['cod_documento', 'cod_ubicacion', 'cod_articulo', 'num_linea', 'unidades']
        for field in required:
            if data.get(field) is None:
                return jsonify({"error": f"{field} es requerido"}), 400

        current_user = g.operador if hasattr(g, 'operador') else {}
        result = PreparacionService.cargar_mercancia(
            operador_context=current_user,
            cod_documento=int(data['cod_documento']),
            cod_ubicacion=int(data['cod_ubicacion']),
            cod_articulo=int(data['cod_articulo']),
            num_linea=int(data['num_linea']),
            unidades=float(data['unidades']),
            fecha_caducidad=data.get('fecha_caducidad'),
            numero_lote=data.get('numero_lote'),
            cod_tipo_dato_maestro=data.get('cod_tipo_dato_maestro'),
            cod_dato_maestro=data.get('cod_dato_maestro'),
        )
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
