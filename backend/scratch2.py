import re

with open('app/routes/admin_routes.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Quitar cualquier ocurrencia previa de get_pasillos_totales
content = re.sub(r'@admin_bp\.route\("/inventario/pasillos".*?(?=@admin_bp|$)', '', content, flags=re.DOTALL)
content = re.sub(r'def get_pasillos_totales\(\):.*?(?=@admin_bp|$)', '', content, flags=re.DOTALL)

# Añadir el endpoint nuevo al final
content += '''
@admin_bp.route("/inventario/pasillos", methods=["GET"])
def get_pasillos_totales():
    from app.database import OracleDatabase
    almacen = request.args.get("almacen", "10") # Por defecto 10
    try:
        with OracleDatabase.get_cursor() as cursor:
            query = """
            SELECT 
                SUBSTR(u.NOMBRECORTO, 7, 2) AS PASILLO,
                COUNT(DISTINCT u.CODUBICACION) AS TOTAL_UBICACIONES,
                COUNT(DISTINCT v.NOMBRECORTO) AS OCUPADAS,
                NVL(SUM(v.STOCK), 0) AS TOTAL_STOCK,
                NVL(SUM(v.CAJAS), 0) AS TOTAL_CAJAS
            FROM GSM.TMST_UBICACIONES u
            LEFT JOIN (
                SELECT NOMBRECORTO, STOCK, CAJAS 
                FROM GSM.VMST_UBICACIONESARTICULO
            ) v ON u.NOMBRECORTO = v.NOMBRECORTO
            WHERE u.NOMBRECORTO LIKE :almacen || '-%'
            GROUP BY SUBSTR(u.NOMBRECORTO, 7, 2)
            ORDER BY PASILLO
            """
            cursor.execute(query, {"almacen": str(almacen)})
            data = [{
                "pasillo": r[0], 
                "total": r[1],
                "ocupadas": r[2],
                "total_stock": r[3],
                "total_cajas": r[4],
                "porcentaje": (r[2] / r[1] * 100) if r[1] > 0 else 0
            } for r in cursor.fetchall()]
        return jsonify({"status": "success", "data": data}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500
'''

# Limpiar espacios en blanco extra
content = content.strip() + '\n'

with open('app/routes/admin_routes.py', 'w', encoding='utf-8') as f:
    f.write(content)
