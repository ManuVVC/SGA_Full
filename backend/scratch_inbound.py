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
    
    # Buscar vistas relacionadas con entradas / documentos pendientes
    cursor.execute("SELECT object_name, object_type FROM all_objects WHERE owner='GSM' AND (object_name LIKE '%DOC%' OR object_name LIKE '%ENTRADA%' OR object_name LIKE '%PROVEE%' OR object_name LIKE '%CLIENTE%') AND object_type IN ('TABLE', 'VIEW')")
    objs = cursor.fetchall()
    
    print("--- Tablas/Vistas relacionadas ---")
    for o in objs:
        print(f"{o[0]} ({o[1]})")

except Exception as e:
    print(e)
