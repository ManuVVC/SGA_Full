import re

with open('app/routes/admin_routes.py', 'r', encoding='utf-8') as f:
    content = f.read()

new_endpoint = '''
@admin_bp.route("/inventario/caducidades", methods=["GET"])
def get_caducidades():
    from app.database import OracleDatabase
    almacen = request.args.get("almacen", "10")
    meses = request.args.get("meses", "1")
    
    try:
        meses = int(meses)
    except ValueError:
        meses = 1
        
    try:
        with OracleDatabase.get_cursor() as cursor:
            query = """
            SELECT 
                NOMBRECORTO as UBICACION,
                CODARTICULOAPLICACION as CODARTICULO,
                NOMBREARTICULO,
                NVL(NUMEROLOTE, CODNUMEROLOTE) AS LOTE,
                STOCK,
                CAJAS,
                FECHACADUCIDAD
            FROM GSM.VMST_UBICACIONESARTICULO
            WHERE CODALMACEN = :almacen
              AND FECHACADUCIDAD IS NOT NULL
              AND FECHACADUCIDAD <= ADD_MONTHS(SYSDATE, :meses)
              AND STOCK > 0
            ORDER BY FECHACADUCIDAD ASC
            """
            cursor.execute(query, {"almacen": str(almacen), "meses": meses})
            
            cols = [col[0].lower() for col in cursor.description]
            data = [dict(zip(cols, row)) for row in cursor.fetchall()]
            
            # Format dates
            for r in data:
                r["ubicacion"] = r.get("ubicacion") or ""
                r["codarticulo"] = r.get("codarticulo") or ""
                r["nombrearticulo"] = r.get("nombrearticulo") or ""
                r["lote"] = r.get("lote") or ""
                if r.get("fechacaducidad"):
                    r["fechacaducidad"] = r["fechacaducidad"].strftime("%Y-%m-%d")
                    
        return jsonify({"status": "success", "data": data}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500
'''

content = content.strip() + '\n' + new_endpoint

with open('app/routes/admin_routes.py', 'w', encoding='utf-8') as f:
    f.write(content)
