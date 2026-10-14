from app import create_app
from app.database import OracleDatabase

app = create_app()
with app.app_context():
    with OracleDatabase.get_cursor() as cursor:
        cursor.execute("""
            SELECT DISTINCT SUBSTR(NOMBRECORTO, 7, 2) AS COLUMNA
            FROM GSM.TMST_UBICACIONES 
            WHERE NOMBRECORTO LIKE '10-%'
            ORDER BY COLUMNA
        """)
        print("COLUMNAS:")
        for row in cursor.fetchall():
            print(row[0])
