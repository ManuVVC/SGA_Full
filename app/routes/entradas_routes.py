from flask import Blueprint, request, jsonify
from app.services.entradas_service import EntradasService
from app.utils.decorators import token_required

entradas_bp = Blueprint('entradas', __name__)

@entradas_bp.route('/parametros', methods=['GET'])
@token_required
def get_parametros_entrada():
    res = EntradasService.get_parametros_entrada()
    return jsonify(res), 200 if res['status'] == 'success' else 400

@entradas_bp.route('/articulo-info/<ean>', methods=['GET'])
@token_required
def get_articulo_info(ean):
    res = EntradasService.get_articulo_info(ean)
    return jsonify(res), 200 if res['status'] == 'success' else 400

@entradas_bp.route('/muelles', methods=['GET'])
@token_required
def get_muelles():
    res = EntradasService.get_muelles()
    return jsonify(res), 200 if res['status'] == 'success' else 400

@entradas_bp.route('/albaranes-en-curso', methods=['GET'])
@token_required
def get_albaranes_en_curso():
    codmuelle = request.args.get('codmuelle')
    res = EntradasService.get_albaranes_en_curso(codmuelle)
    return jsonify(res), 200 if res['status'] == 'success' else 400

@entradas_bp.route('/proveedores-pendientes', methods=['GET'])
@token_required
def get_proveedores_pendientes():
    res = EntradasService.get_proveedores()
    return jsonify(res), 200 if res['status'] == 'success' else 400

@entradas_bp.route('/pedidos-pendientes', methods=['GET'])
@token_required
def get_pedidos_pendientes():
    codproveedor = request.args.get('codproveedor')
    if not codproveedor:
        return jsonify({"status": "error", "message": "Falta parámetro codproveedor"}), 400
    res = EntradasService.get_pedidos(codproveedor)
    return jsonify(res), 200 if res['status'] == 'success' else 400

@entradas_bp.route('/crear-albaran', methods=['POST'])
@token_required
def crear_albaran():
    data = request.json
    res = EntradasService.crear_albaran(data)
    return jsonify(res), 200 if res['status'] == 'success' else 400

@entradas_bp.route('/grabar-linea', methods=['POST'])
@token_required
def grabar_linea():
    from flask import g
    data = request.json or {}
    if hasattr(g, 'operador') and g.operador:
        data['CODOPERADOR'] = g.operador.get('cod_operador', 1)
        data['CODTERMINAL'] = g.operador.get('terminal', 1)
    res = EntradasService.grabar_linea(data)
    return jsonify(res), 200 if res['status'] == 'success' else 400

@entradas_bp.route('/finalizar', methods=['POST'])
@token_required
def finalizar_entrada():
    data = request.json
    coddocumento = data.get('CODDOCUMENTO')
    res = EntradasService.finalizar_entrada(coddocumento)
    return jsonify(res), 200 if res['status'] == 'success' else 400

@entradas_bp.route('/lineas-grabadas/<int:coddocumento>', methods=['GET'])
@token_required
def get_lineas_grabadas(coddocumento):
    res = EntradasService.get_lineas_grabadas(coddocumento)
    return jsonify(res), 200 if res['status'] == 'success' else 400

@entradas_bp.route('/detalle-linea/<int:codlinea>', methods=['GET'])
@token_required
def get_detalle_linea(codlinea):
    res = EntradasService.get_detalle_linea(codlinea)
    return jsonify(res), 200 if res['status'] == 'success' else 400

@entradas_bp.route('/lineas-pendientes/<int:coddocumento_albaran>', methods=['GET'])
@token_required
def get_lineas_pendientes(coddocumento_albaran):
    res = EntradasService.get_lineas_pendientes(coddocumento_albaran)
    return jsonify(res), 200 if res['status'] == 'success' else 400
