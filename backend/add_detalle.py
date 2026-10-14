import re

with open('app/routes/admin_routes.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace previous get_pasillo_detalle if exists
content = re.sub(r'@admin_bp\.route\("/inventario/pasillo_detalle".*?(?=@admin_bp|$)', '', content, flags=re.DOTALL)
content = re.sub(r'def get_pasillo_detalle\(\):.*?(?=@admin_bp|$)', '', content, flags=re.DOTALL)


content += '''
@admin_bp.route("/inventario/pasillo_detalle", methods=["GET"])
def get_pasillo_detalle():
    from app.database import OracleDatabase
    almacen = request.args.get("almacen", "10")
    pasillo = request.args.get("pasillo")
    if not pasillo:
        return jsonify({"status": "error", "message": "pasillo is required"}), 400

    try:
        with OracleDatabase.get_cursor() as cursor:
            query = """
            SELECT 
                u.NOMBRECORTO,
                NVL(SUM(v.STOCK), 0) AS TOTAL_STOCK,
                NVL(SUM(v.CAJAS), 0) AS TOTAL_CAJAS,
                COUNT(DISTINCT v.CODARTICULO) AS SKUS
            FROM GSM.TMST_UBICACIONES u
            LEFT JOIN (
                SELECT NOMBRECORTO, STOCK, CAJAS, CODARTICULO
                FROM GSM.VMST_UBICACIONESARTICULO
                WHERE CODALMACEN = :almacen_v
            ) v ON u.NOMBRECORTO = v.NOMBRECORTO
            WHERE u.NOMBRECORTO LIKE :almacen || '-%-' || :pasillo || '-%'
            GROUP BY u.NOMBRECORTO
            """
            cursor.execute(query, {"almacen": str(almacen), "almacen_v": str(almacen), "pasillo": str(pasillo)})
            
            data = []
            for r in cursor.fetchall():
                nombre = r[0]
                parts = nombre.split('-')
                if len(parts) >= 5:
                    try:
                        zona = parts[1]
                        modulo = int(parts[3])
                        nivel = int(parts[4])
                    except ValueError:
                        zona = "00"
                        modulo = 0
                        nivel = 0
                else:
                    zona = "00"
                    modulo = 0
                    nivel = 0
                
                data.append({
                    "nombre": nombre,
                    "zona": zona,
                    "modulo": modulo,
                    "nivel": nivel,
                    "stock": r[1],
                    "cajas": r[2],
                    "skus": r[3],
                    "ocupada": r[1] > 0
                })

        return jsonify({"status": "success", "data": data}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500
'''

content = content.strip() + '\n'

with open('app/routes/admin_routes.py', 'w', encoding='utf-8') as f:
    f.write(content)
