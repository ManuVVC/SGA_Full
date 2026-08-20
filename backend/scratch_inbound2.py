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
    
    # Ver estructura de TMST_DOCUMENTOSPROVEEDORES
    print("--- TMST_DOCUMENTOSPROVEEDORES ---")
    cursor.execute("SELECT column_name, data_type FROM all_tab_columns WHERE table_name = 'TMST_DOCUMENTOSPROVEEDORES'")
    cols_prov = [c[0] for c in cursor.fetchall()]
    print(cols_prov)
    
    # Ver algunos registros
    cursor.execute("SELECT * FROM TMST_DOCUMENTOSPROVEEDORES WHERE ROWNUM <= 3")
    print(cursor.fetchall())
    
    # Ver estructura de TMST_DOCUMENTOSCLIENTES
    print("\n--- TMST_DOCUMENTOSCLIENTES ---")
    cursor.execute("SELECT column_name, data_type FROM all_tab_columns WHERE table_name = 'TMST_DOCUMENTOSCLIENTES'")
    cols_cli = [c[0] for c in cursor.fetchall()]
    print(cols_cli)
    
    # Ver algunos registros
    cursor.execute("SELECT * FROM TMST_DOCUMENTOSCLIENTES WHERE ROWNUM <= 3")
    print(cursor.fetchall())
    
    # Ver estados
    print("\n--- TSYS_ESTADOSDOCUMENTO ---")
    cursor.execute("SELECT * FROM TSYS_ESTADOSDOCUMENTO")
    print(cursor.fetchall())
    
except Exception as e:
    print(e)
