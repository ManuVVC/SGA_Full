import os
import oracledb

oracledb.init_oracle_client(lib_dir="/opt/oracle/instantclient_19_19")

try:
    conn = oracledb.connect(
        user=os.environ.get('ORACLE_USER'),
        password=os.environ.get('ORACLE_PASSWORD'),
        dsn=os.environ.get('ORACLE_DSN')
    )
    cursor = conn.cursor()
    
    cursor.execute("SELECT column_name, data_type FROM all_tab_columns WHERE table_name = 'TMST_TIPOMOVIMIENTO'")
    for c in cursor.fetchall():
        print(f"{c[0]}: {c[1]}")
        
    print("---")
    
    cursor.execute("SELECT * FROM TMST_TIPOMOVIMIENTO WHERE ROWNUM <= 10")
    for r in cursor.fetchall():
        print(r)

except Exception as e:
    print(e)
