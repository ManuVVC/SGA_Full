from flask import Blueprint, request, jsonify, g
from ..utils.decorators import token_required
from app.services.pedidos_service import PedidosService

pedidos_bp = Blueprint('pedidos', __name__)

@pedidos_bp.route('/aparcar', methods=['POST'])
@token_required
def aparcar_documento():
    try:
        data = request.json
        cod_documento = data.get('cod_documento')
        if not cod_documento:
            return jsonify({"error": "cod_documento es requerido"}), 400

        current_user = g.operador if hasattr(g, 'operador') else {}
        result = PedidosService.aparcar_documento(int(cod_documento), current_user)
        return jsonify(result), 200
    except PermissionError as pe:
        return jsonify({"error": str(pe)}), 403
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@pedidos_bp.route('/aparcados', methods=['GET'])
@token_required
def get_aparcados():
    try:
        current_user = g.operador if hasattr(g, 'operador') else {}
        result = PedidosService.get_documentos_aparcados(current_user)
        return jsonify({"success": True, "aparcados": result}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@pedidos_bp.route('/en_preparacion', methods=['GET'])
@token_required
def get_en_preparacion():
    try:
        current_user = g.operador if hasattr(g, 'operador') else {}
        result = PedidosService.get_documentos_en_preparacion(current_user)
        return jsonify({"success": True, "preparacion": result}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@pedidos_bp.route('/lineas/<int:cod_documento>', methods=['GET'])
@token_required
def get_lineas_documento(cod_documento):
    try:
        result = PedidosService.get_lineas_documento(cod_documento)
        return jsonify({"success": True, "lineas": result}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@pedidos_bp.route('/recuperar', methods=['POST'])
@token_required
def recuperar_documento():
    try:
        data = request.json
        cod_documento = data.get('cod_documento')

        if not cod_documento:
            return jsonify({"error": "cod_documento es requerido"}), 400

        current_user = g.operador if hasattr(g, 'operador') else {}
        cod_terminal = current_user.get('terminal', 1)
        
        result = PedidosService.recuperar_documento(int(cod_documento), current_user, int(cod_terminal))
        return jsonify(result), 200
    except PermissionError as pe:
        return jsonify({"error": str(pe)}), 403
    except Exception as e:
        return jsonify({"error": str(e)}), 500
