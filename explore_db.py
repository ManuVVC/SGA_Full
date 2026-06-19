import os
from app import create_app
from app.database import db

os.environ['AUDIT_LOG_ENABLED'] = 'False'
app = create_app()

with app.app_context():
    try:
        conn = db.get_connection()
        cursor = conn.cursor()
        
        cursor.execute("SELECT column_name FROM all_tab_columns WHERE table_name = 'TMST_CODFACTURACION'")
        columns = cursor.fetchall()
        
        print("Columnas en TMST_CODFACTURACION:")
        for col in columns:
            print(f"- {col[0]}")
            
    except Exception as e:
        print("Error:", e)
    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'conn' in locals():
            conn.close()
