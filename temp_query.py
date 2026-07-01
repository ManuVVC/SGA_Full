import oracledb
import os
from dotenv import load_dotenv

load_dotenv()
try:
    oracledb.init_oracle_client()
    conn = oracledb.connect(
        user=os.environ.get('ORACLE_USER'),
        password=os.environ.get('ORACLE_PASSWORD'),
        dsn=os.environ.get('ORACLE_DSN')
    )
    cursor = conn.cursor()
    query = """
    select p.codparametro,pa.valor,p.nombreparametro,p.informacionparametro 
    from tsys_parametros p 
    inner join tsys_parametrosxambito pa on pa.codparametro=p.codparametro 
    where p.codparametro in (1687,1693,1702,1745,1750)
    """
    cursor.execute(query)
    for row in cursor.fetchall():
        print(row)
except Exception as e:
    print('Error:', e)
