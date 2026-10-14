
from app import create_app
from app.database import OracleDatabase
app = create_app()
with app.app_context():
    res = OracleDatabase.execute_query('SELECT CODFILTRO, DESCRIPCION FROM GSM.TMST_FILTROS WHERE CODDEFFILTRO = 110')
    for r in res:
        print(f"- CODFILTRO: {r['CODFILTRO']} | DESCRIPCION: '{r['DESCRIPCION']}'")

