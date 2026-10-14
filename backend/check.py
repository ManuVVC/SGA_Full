import sys
sys.path.append('/app')
from app import create_app
from app.database import OracleDatabase
app = create_app()
with app.app_context():
    try:
        q = '''
        SELECT DISTINCT v.CODARTICULO, v.NOMBREARTICULO, d.CODTIPOUNIDAD, d.VOLUMEN, d.ALTURA, d.ANCHURA, d.PROFUNDIDAD
        FROM GSM.VMST_UBICACIONESARTICULO v
        LEFT JOIN GSM.TMST_ARTICULODIMENSIONES d ON v.CODARTICULO = d.CODARTICULO
        WHERE v.NOMBREARTICULO LIKE '%UNICORNIO%'
        '''
        res = OracleDatabase.execute_query(q)
        for r in res:
            print(r)
    except Exception as e:
        print(e)
