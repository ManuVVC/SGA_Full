import re

with open('app/routes/admin_routes.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace get_pasillos_totales
content = re.sub(r'@admin_bp\.route\("/inventario/pasillos".*?(?=@admin_bp|$)', '', content, flags=re.DOTALL)

# Replace get_pasillo_detalle
content = re.sub(r'@admin_bp\.route\("/inventario/pasillo_detalle".*?(?=@admin_bp|$)', '', content, flags=re.DOTALL)


content += '''
@admin_bp.route("/inventario/pasillos", methods=["GET"])
def get_pasillos_totales():
    from app.database import OracleDatabase
    almacen = request.args.get("almacen", "10") # Por defecto 10
    try:
        with OracleDatabase.get_cursor() as cursor:
            # Pasillo está en caracteres 4 y 5: 10-01-...
            query = """
            SELECT 
                SUBSTR(u.NOMBRECORTO, 4, 2) AS PASILLO,
                COUNT(DISTINCT u.CODUBICACION) AS TOTAL_UBICACIONES,
                COUNT(DISTINCT v.NOMBRECORTO) AS OCUPADAS,
                NVL(SUM(v.STOCK), 0) AS TOTAL_STOCK,
                NVL(SUM(v.CAJAS), 0) AS TOTAL_CAJAS
            FROM GSM.TMST_UBICACIONES u
            LEFT JOIN (
                SELECT NOMBRECORTO, STOCK, CAJAS 
                FROM GSM.VMST_UBICACIONESARTICULO
                WHERE CODALMACEN = :almacen_v
            ) v ON u.NOMBRECORTO = v.NOMBRECORTO
            WHERE u.NOMBRECORTO LIKE :almacen || '-%'
            GROUP BY SUBSTR(u.NOMBRECORTO, 4, 2)
            ORDER BY PASILLO
            """
            cursor.execute(query, {"almacen": str(almacen), "almacen_v": str(almacen)})
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
            WHERE u.NOMBRECORTO LIKE :almacen || '-' || :pasillo || '-%'
            GROUP BY u.NOMBRECORTO
            """
            cursor.execute(query, {"almacen": str(almacen), "almacen_v": str(almacen), "pasillo": str(pasillo)})
            
            data = []
            for r in cursor.fetchall():
                nombre = r[0]
                parts = nombre.split('-')
                
                # Format: 10-01-04-1-3
                # parts: 0=10, 1=01, 2=04, 3=1, 4=3
                
                columna = 0
                altura = 0
                posicion = 0
                
                if len(parts) >= 5:
                    try:
                        columna = int(parts[2])
                        altura = int(parts[3])
                        posicion = int(parts[4])
                    except ValueError:
                        pass
                elif len(parts) >= 4:
                    try:
                        columna = int(parts[2])
                        altura = int(parts[3])
                    except ValueError:
                        pass
                
                data.append({
                    "nombre": nombre,
                    "columna": columna,
                    "altura": altura,
                    "posicion": posicion,
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
