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

    query = """
    SELECT 
        d.FECHADOCUMENTO, 
        d.NUMDOCUMENTO, 
        d.CODPROVEEDOR as CODENTIDAD, 
        d.NOMBRECOMERCIAL, 
        d.NUMLINEAS,
        d.DESCRIPCIONESTADO AS ESTADO, 
        tm.DESCRIPCION AS TIPOMOVIMIENTO,
        d.CODTIPODOCUMENTO
    FROM VMST_DOCUMENTOSPROVEEDOR d
    LEFT JOIN TMST_TIPOMOVIMIENTO tm ON d.CODTIPOMOVIMIENTO = tm.CODTIPOMOVIMIENTO
    WHERE UPPER(d.DESCRIPCIONESTADO) NOT LIKE '%HISTÓRICO%' AND UPPER(d.DESCRIPCIONESTADO) NOT LIKE '%BORRADO%'
    AND d.CODTIPODOCUMENTO IN (2, 3)
    
    UNION ALL
    
    SELECT 
        c.FECHADOCUMENTO, 
        c.NUMDOCUMENTO, 
        c.CODCLIENTE as CODENTIDAD, 
        c.NOMBRECOMERCIAL, 
        c.NUMLINEAS,
        c.DESCESTADO AS ESTADO, 
        tm.DESCRIPCION AS TIPOMOVIMIENTO,
        c.CODTIPODOCUMENTO
    FROM VMST_DOCUMENTOSCLIENTES c
    LEFT JOIN TMST_TIPOMOVIMIENTO tm ON c.CODTIPOMOVIMIENTO = tm.CODTIPOMOVIMIENTO
    WHERE UPPER(c.DESCESTADO) NOT LIKE '%HISTÓRICO%' AND UPPER(c.DESCESTADO) NOT LIKE '%BORRADO%'
    AND c.CODTIPODOCUMENTO = 7
    """
    
    cursor.execute(query)
    for r in cursor.fetchall()[:10]:
        print(r)

except Exception as e:
    print(e)
