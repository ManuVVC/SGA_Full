import os
from app import create_app
from app.database import db

os.environ['AUDIT_LOG_ENABLED'] = 'False'
app = create_app()

with app.app_context():
    try:
        conn = db.get_connection()
        cursor = conn.cursor()
        
        cursor.execute("SELECT argument_name, data_type FROM all_arguments WHERE object_name = 'SPREU_REUBICARPALET'")
        args = cursor.fetchall()
        print("SPREU_REUBICARPALET args:", args)
        
    except Exception as e:
        print("Error:", e)
    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'conn' in locals():
            conn.close()
