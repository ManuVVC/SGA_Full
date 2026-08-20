from app.database import OracleDatabase
from app import create_app
app = create_app()
with app.app_context():
    c = OracleDatabase.get_connection().cursor()
    c.execute(" SELECT TABLE_NAME FROM ALL_TABLES WHERE OWNER=GSM AND TABLE_NAME LIKE %LOTE% \)
