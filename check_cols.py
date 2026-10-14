from app import create_app
from app.database import OracleDatabase

app = create_app()
with app.app_context():
    with OracleDatabase.get_cursor() as cursor:
        cursor.execute("SELECT * FROM GSM.VMST_UBICACIONESARTICULO WHERE ROWNUM = 1")
        columns = [col[0] for col in cursor.description]
        print(columns)
        
        cursor.execute("SELECT * FROM GSM.TMST_ARTICULOS WHERE ROWNUM = 1")
        columns2 = [col[0] for col in cursor.description]
        print("TMST_ARTICULOS:", columns2)
