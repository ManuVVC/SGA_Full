from app import create_app
from app.database import OracleDatabase

app = create_app()
with app.app_context():
    with OracleDatabase.get_cursor() as cursor:
        cursor.execute("""
            SELECT NOMBRECORTO 
            FROM GSM.TMST_UBICACIONES 
            WHERE NOMBRECORTO LIKE '10-01-04-%' AND ROWNUM <= 20
            ORDER BY NOMBRECORTO
        """)
        for row in cursor.fetchall():
            print(row[0])
