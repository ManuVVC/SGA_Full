from app import create_app
from app.database import db
app = create_app()
with app.app_context():
    conn = db.get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT COLUMN_NAME FROM ALL_TAB_COLUMNS WHERE TABLE_NAME = 'TMST_PROVEEDORES' AND COLUMN_NAME LIKE 'PRM_%'")
    print(cursor.fetchall())
