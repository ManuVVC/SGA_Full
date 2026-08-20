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
    
    cursor.execute("SELECT column_name FROM all_tab_columns WHERE table_name = 'TMST_DOCUMENTOS'")
    print("TMST_DOCUMENTOS:", [c[0] for c in cursor.fetchall()])

    query = """
    SELECT 
        d.FECHADOCUMENTO, 
        d.NUMDOCUMENTO, 
        dp.CODPROVEEDOR, 
        p.NOMBRECOMERCIAL, 
        e.DESCRIPCION AS ESTADO, 
        tm.DESCRIPCION AS TIPOMOVIMIENTO,
        'PROVEEDOR' as TIPO_ENTIDAD,
        d.CODTIPODOCUMENTO
    FROM TMST_DOCUMENTOS d
    JOIN TMST_DOCUMENTOSPROVEEDORES dp ON d.CODDOCUMENTO = dp.CODDOCUMENTO
    LEFT JOIN TMST_PROVEEDORES p ON dp.CODPROVEEDOR = p.CODPROVEEDOR
    LEFT JOIN TSYS_ESTADOSDOCUMENTO e ON d.CODESTADO = e.CODESTADODOCUMENTO
    LEFT JOIN TMST_TIPOMOVIMIENTO tm ON d.CODTIPOMOVIMIENTO = tm.CODTIPOMOVIMIENTO
    WHERE UPPER(e.DESCRIPCION) NOT LIKE '%HISTÓRICO%' AND UPPER(e.DESCRIPCION) NOT LIKE '%BORRADO%'
    AND ROWNUM <= 5
    """
    print("\n--- QUERY PROVEEDOR ---")
    cursor.execute(query)
    for r in cursor.fetchall():
        print(r)
        
except Exception as e:
    print(e)
