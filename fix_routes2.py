import re

with open('backend/app/routes/admin_routes.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace get_pasillo_detalle
content = re.sub(r'@admin_bp\.route\("/inventario/pasillo_detalle".*?(?=@admin_bp|$)', '', content, flags=re.DOTALL)

new_route = '''@admin_bp.route("/inventario/pasillo_detalle", methods=["GET"])
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
                v.STOCK,
                v.CAJAS,
                v.CODARTICULO,
                v.DESCRIPCION
            FROM GSM.TMST_UBICACIONES u
            LEFT JOIN (
                SELECT NOMBRECORTO, STOCK, CAJAS, CODARTICULO, DESCRIPCION
                FROM GSM.VMST_UBICACIONESARTICULO
                WHERE CODALMACEN = :almacen_v
            ) v ON u.NOMBRECORTO = v.NOMBRECORTO
            WHERE u.NOMBRECORTO LIKE :almacen || '-' || :pasillo || '-%'
            """
            cursor.execute(query, {"almacen": str(almacen), "almacen_v": str(almacen), "pasillo": str(pasillo)})
            
            # Group by NOMBRECORTO in Python
            ubicaciones_map = {}
            for r in cursor.fetchall():
                nombre = r[0]
                stock = r[1] or 0
                cajas = r[2] or 0
                cod_articulo = r[3]
                descripcion = r[4] or "Desconocido"

                if nombre not in ubicaciones_map:
                    ubicaciones_map[nombre] = {
                        "stock_total": 0,
                        "cajas_total": 0,
                        "articulos": []
                    }
                
                if cod_articulo:
                    ubicaciones_map[nombre]["stock_total"] += stock
                    ubicaciones_map[nombre]["cajas_total"] += cajas
                    ubicaciones_map[nombre]["articulos"].append({
                        "codigo": cod_articulo,
                        "descripcion": descripcion,
                        "stock": stock,
                        "cajas": cajas
                    })

            data = []
            for nombre, ubi_data in ubicaciones_map.items():
                parts = nombre.split('-')
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
                
                # Consolidate articles by code (if duplicates exist)
                art_dict = {}
                for art in ubi_data["articulos"]:
                    cod = art["codigo"]
                    if cod not in art_dict:
                        art_dict[cod] = art.copy()
                    else:
                        art_dict[cod]["stock"] += art["stock"]
                        art_dict[cod]["cajas"] += art["cajas"]
                
                articulos_list = list(art_dict.values())
                
                data.append({
                    "nombre": nombre,
                    "columna": columna,
                    "altura": altura,
                    "posicion": posicion,
                    "stock": ubi_data["stock_total"],
                    "cajas": ubi_data["cajas_total"],
                    "skus": len(articulos_list),
                    "ocupada": ubi_data["stock_total"] > 0,
                    "articulos": articulos_list
                })

        return jsonify({"status": "success", "data": data}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500
'''

content = content.strip() + '\n' + new_route

with open('backend/app/routes/admin_routes.py', 'w', encoding='utf-8') as f:
    f.write(content)
