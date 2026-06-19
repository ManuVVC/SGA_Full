import os
from app import create_app
from app.database import db

os.environ['AUDIT_LOG_ENABLED'] = 'False'
app = create_app()

with app.app_context():
    try:
        conn = db.get_connection()
        cursor = conn.cursor()
        
        cursor.execute("SELECT column_name FROM all_tab_columns WHERE table_name = 'TSYS_TIPOSHUECOS' AND owner = 'GSM'")
        print("TSYS_TIPOSHUECOS (All columns):", [c[0] for c in cursor.fetchall()])
        
    except Exception as e:
        print("Error:", e)
    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'conn' in locals():
            conn.close()
