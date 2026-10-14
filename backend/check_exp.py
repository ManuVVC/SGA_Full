from app import create_app
from app.database import OracleDatabase
import datetime

app = create_app()
with app.app_context():
    with OracleDatabase.get_cursor() as cursor:
        cursor.execute("""
            SELECT CODARTICULOAPLICACION, NOMBREARTICULO, FECHACADUCIDAD 
            FROM GSM.VMST_UBICACIONESARTICULO 
            WHERE FECHACADUCIDAD IS NOT NULL 
            AND ROWNUM <= 5
        """)
        for row in cursor.fetchall():
            print(row)
