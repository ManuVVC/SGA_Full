
from app import create_app
from app.database import OracleDatabase
app = create_app()
with app.app_context():
    def_cols = OracleDatabase.execute_query("SELECT COLUMN_NAME FROM ALL_TAB_COLUMNS WHERE TABLE_NAME = 'TSYS_DEFINICIONCAMPOSFILTRO' ORDER BY COLUMN_ID")
    print('TSYS_DEFINICIONCAMPOSFILTRO:', [r['COLUMN_NAME'] for r in def_cols])
    data1 = OracleDatabase.execute_query('SELECT * FROM GSM.TSYS_TIPOSCAMPOFILTRO')
    print('TSYS_TIPOSCAMPOFILTRO:', data1)
    data2 = OracleDatabase.execute_query('SELECT * FROM GSM.TSYS_TIPOSCOMPARACIONFILTRO')
    print('TSYS_TIPOSCOMPARACIONFILTRO:', data2)
    
    data3 = OracleDatabase.execute_query('SELECT * FROM GSM.TSYS_DEFINICIONCAMPOSFILTRO WHERE CODDEFFILTRO = 110')
    print('TSYS_DEFINICIONCAMPOSFILTRO (110):', data3)

