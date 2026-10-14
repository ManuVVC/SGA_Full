
from app import create_app
from app.database import OracleDatabase
app = create_app()
with app.app_context():
    data = OracleDatabase.execute_query('SELECT * FROM GSM.TMST_CAMPOSFILTRO WHERE ROWNUM <= 10')
    print('TMST_CAMPOSFILTRO:', data)

