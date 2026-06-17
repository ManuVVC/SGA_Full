import os
from app import create_app
from app.database import db

os.environ['AUDIT_LOG_ENABLED'] = 'False'
app = create_app()

with app.app_context():
    try:
        conn = db.get_connection()
        cursor = conn.cursor()
        
        q = "SELECT column_name, data_type FROM all_tab_columns WHERE owner = 'GSM' AND table_name = 'TMST_TERMINALES' AND column_name LIKE 'PRM_%'"
        cursor.execute(q)
        cols = cursor.fetchall()
        print("Columnas PRM_ en TMST_TERMINALES:")
        for c in cols:
            print(f"- {c[0]}")

    except Exception as e:
        print("Error:", e)
