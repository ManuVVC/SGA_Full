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
    cursor.execute("SELECT TABLE_NAME FROM ALL_TABLES WHERE OWNER='GSM' AND TABLE_NAME LIKE '%DETALLELINEAALB%'")
    print('Tables DETALLE:', cursor.fetchall())
    
    cursor.execute("SELECT TABLE_NAME FROM ALL_TABLES WHERE OWNER='GSM' AND TABLE_NAME LIKE '%LOTESPROV%'")
    print('Tables LOTES:', cursor.fetchall())
except Exception as e:
    print('Error:', e)
