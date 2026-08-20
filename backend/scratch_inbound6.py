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
    
    cursor.execute("SELECT column_name FROM all_tab_columns WHERE table_name = 'VMST_DOCUMENTOSPROVEEDOR'")
    print("Cols:", [c[0] for c in cursor.fetchall()])

    cursor.execute("SELECT * FROM VMST_DOCUMENTOSPROVEEDOR WHERE ROWNUM <= 1")
    print("Data:", cursor.fetchall())

except Exception as e:
    print(e)
