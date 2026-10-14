
from app import create_app
from app.database import OracleDatabase
app = create_app()
with app.app_context():
    data = OracleDatabase.execute_query("SELECT TABLE_NAME FROM ALL_TABLES WHERE TABLE_NAME LIKE '%FILTRO%'")
    print([r['TABLE_NAME'] for r in data])

