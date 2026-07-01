import os
from app import create_app
from app.database import db

os.environ['AUDIT_LOG_ENABLED'] = 'False'
app = create_app()

with app.app_context():
    try:
        conn = db.get_connection()
        cursor = conn.cursor()
        
        # Check columns
        cursor.execute("SELECT column_name, data_type FROM all_tab_columns WHERE table_name = 'TMST_ARTICULOS' AND owner = 'GSM'")
        print("TMST_ARTICULOS:", cursor.fetchall())
        cursor.execute("SELECT column_name, data_type FROM all_tab_columns WHERE table_name = 'TMST_EANARTICULOS' AND owner = 'GSM'")
        print("TMST_EANARTICULOS:", cursor.fetchall())
        
    except Exception as e:
        print("Error:", e)
    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'conn' in locals():
            conn.close()
