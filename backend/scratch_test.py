from app import create_app
from app.database import OracleDatabase

app = create_app()
with app.app_context():
    with OracleDatabase.get_cursor() as cursor:
        cursor.execute("""
            SELECT DISTINCT SUBSTR(NOMBRECORTO, 4, 2) AS PASILLO
            FROM GSM.TMST_UBICACIONES 
            WHERE NOMBRECORTO LIKE '10-%'
            ORDER BY PASILLO
        """)
        print("PASILLOS:")
        for row in cursor.fetchall():
            print(row[0])
            
        cursor.execute("""
            SELECT NOMBRECORTO 
            FROM (
                SELECT NOMBRECORTO 
                FROM GSM.TMST_UBICACIONES 
                WHERE NOMBRECORTO LIKE '10-%'
            )
            WHERE ROWNUM <= 10
        """)
        print("MUESTRA:")
        for row in cursor.fetchall():
            print(row[0])
