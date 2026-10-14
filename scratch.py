import re

with open('backend/app/routes/admin_routes.py', 'r', encoding='utf-8') as f:
    content = f.read()

content = re.sub(r'@admin_bp\.route\("/inventario/pasillos".*', '', content, flags=re.DOTALL)
content += '''
@admin_bp.route("/inventario/pasillos", methods=["GET"])
def get_pasillos_totales():
    from app.database import OracleDatabase
    almacen = request.args.get("almacen", "10") # Por defecto 10
    try:
        with OracleDatabase.get_cursor() as cursor:
            # Extraemos el pasillo del NOMBRECORTO (ej. 10-01-04-1-1 -> 04)
            # El pasillo est en los caracteres 7 y 8, el almacen al inicio.
            query = """
            SELECT SUBSTR(NOMBRECORTO, 7, 2) AS PASILLO, COUNT(*) AS TOTAL_UBICACIONES
            FROM GSM.TMST_UBICACIONES
            WHERE NOMBRECORTO LIKE :almacen || '-%'
            GROUP BY SUBSTR(NOMBRECORTO, 7, 2)
            """
            cursor.execute(query, {"almacen": str(almacen)})
            data = [{"pasillo": r[0], "total": r[1]} for r in cursor.fetchall()]
        return jsonify({"status": "success", "data": data}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500
'''

with open('backend/app/routes/admin_routes.py', 'w', encoding='utf-8') as f:
    f.write(content)
