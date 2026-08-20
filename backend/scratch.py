import os
import oracledb
import json

oracledb.init_oracle_client(lib_dir="/opt/oracle/instantclient_19_19")

try:
    conn = oracledb.connect(
        user=os.environ.get('ORACLE_USER'),
        password=os.environ.get('ORACLE_PASSWORD'),
        dsn=os.environ.get('ORACLE_DSN')
    )
    cursor = conn.cursor()
    
    views_to_check = ['VGM_PENDIENTERECIBIR', 'VGM_PENDIENTESERVIR', 'VGM_STOCK']
    for v in views_to_check:
        cursor.execute(f"SELECT column_name, data_type FROM all_tab_columns WHERE table_name = '{v}'")
        print(f"\n--- {v} ---")
        for c in cursor.fetchall():
            print(f"{c[0]}: {c[1]}")
            
except Exception as e:
    print(e)
