from app import create_app
from app.database import OracleDatabase

app = create_app()
with app.app_context():
    with OracleDatabase.get_cursor() as cursor:
        cursor.execute("""
            SELECT NOMBRECORTO FROM (
                SELECT NOMBRECORTO 
                FROM GSM.TMST_UBICACIONES 
                WHERE NOMBRECORTO LIKE '10-01-01-%' 
                ORDER BY LENGTH(NOMBRECORTO) DESC, NOMBRECORTO DESC
            ) WHERE ROWNUM <= 10
        """)
        results = cursor.fetchall()
        for row in results:
            print(row[0])
