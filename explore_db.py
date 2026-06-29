import os
from app import create_app
from app.database import db

os.environ['AUDIT_LOG_ENABLED'] = 'False'
app = create_app()

with app.app_context():
    try:
        conn = db.get_connection()
        cursor = conn.cursor()
        
        # Check triggers for TMST_CODDOCUMENTOS
        cursor.execute("SELECT trigger_name FROM all_triggers WHERE table_name = 'TMST_CODDOCUMENTOS'")
        triggers = cursor.fetchall()
        print("Triggers TMST_CODDOCUMENTOS:", triggers)
        
    except Exception as e:
        print("Error:", e)
    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'conn' in locals():
            conn.close()
