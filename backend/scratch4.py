from app import create_app
from app.database import OracleDatabase

app = create_app()
with app.app_context():
    with OracleDatabase.get_cursor() as cursor:
        cursor.execute("""
            SELECT 
                u.NOMBRECORTO,
                SUBSTR(u.NOMBRECORTO, 10, 1) AS MODULO,
                SUBSTR(u.NOMBRECORTO, 12, 1) AS NIVEL,
                NVL(v.STOCK, 0) AS STOCK,
                NVL(v.CAJAS, 0) AS CAJAS,
                v.DESCRIPCION AS ARTICULO
            FROM GSM.TMST_UBICACIONES u
            LEFT JOIN GSM.VMST_UBICACIONESARTICULO v ON u.NOMBRECORTO = v.NOMBRECORTO
            WHERE u.NOMBRECORTO LIKE '10-01-04-%'
            ORDER BY u.NOMBRECORTO
        """)
        results = cursor.fetchall()
        for row in results[:10]:
            print(row)
