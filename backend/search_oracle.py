from app.database import OracleDatabase
from app import create_app

app = create_app()
with app.app_context():
    c = OracleDatabase.get_connection().cursor()
    
    print("=== TMST_LINEASDOCUMENTOCLIENTE ===")
    c.execute("SELECT * FROM GSM.TMST_LINEASDOCUMENTOCLIENTE WHERE ROWNUM <= 1")
    cols = [col[0] for col in c.description]
    print("Columns:", cols)
