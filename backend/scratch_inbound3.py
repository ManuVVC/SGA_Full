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

    # Documentos Proveedores (Pedidos a proveedor y Entradas en curso)
    query = """
    SELECT 
        d.FECHADOCUMENTO, 
        d.NUMDOCUMENTO, 
        p.CODPROVEEDOR, 
        p.NOMBRECOMERCIAL, 
        (SELECT COUNT(*) FROM TMST_LINEASDOCUMENTOPROVEEDOR l WHERE l.CODDOCUMENTO = d.CODDOCUMENTO) as LINEAS,
        e.DESCRIPCION AS ESTADO, 
        tm.DESCRIPCION AS TIPOMOVIMIENTO,
        'PROVEEDOR' as TIPO_ENTIDAD,
        d.CODTIPODOCUMENTO
    FROM TMST_DOCUMENTOSPROVEEDORES d
    LEFT JOIN TMST_PROVEEDORES p ON d.CODPROVEEDOR = p.CODPROVEEDOR
    LEFT JOIN TSYS_ESTADOSDOCUMENTO e ON d.CODESTADO = e.CODESTADODOCUMENTO
    LEFT JOIN TMST_TIPOMOVIMIENTO tm ON d.CODTIPOMOVIMIENTO = tm.CODTIPOMOVIMIENTO
    WHERE UPPER(e.DESCRIPCION) NOT LIKE '%HISTÓRICO%' AND UPPER(e.DESCRIPCION) NOT LIKE '%BORRADO%'
    AND ROWNUM <= 5
    """
    print("-- Docs Proveedor --")
    cursor.execute(query)
    for r in cursor.fetchall():
        print(r)
        
    print("\n-- Devoluciones Cliente --")
    query_dev = """
    SELECT 
        d.FECHADOCUMENTO, 
        d.NUMDOCUMENTO, 
        c.CODCLIENTE, 
        c.NOMBRECOMERCIAL, 
        (SELECT COUNT(*) FROM TMST_LINEASDOCUMENTOCLIENTE l WHERE l.CODDOCUMENTO = d.CODDOCUMENTO) as LINEAS,
        e.DESCRIPCION AS ESTADO, 
        tm.DESCRIPCION AS TIPOMOVIMIENTO,
        'CLIENTE' as TIPO_ENTIDAD,
        d.CODTIPODOCUMENTO
    FROM TMST_DOCUMENTOSCLIENTES d
    LEFT JOIN TMST_CLIENTES c ON d.CODCLIENTE = c.CODCLIENTE
    LEFT JOIN TSYS_ESTADOSDOCUMENTO e ON d.CODESTADO = e.CODESTADODOCUMENTO
    LEFT JOIN TMST_TIPOMOVIMIENTO tm ON d.CODTIPOMOVIMIENTO = tm.CODTIPOMOVIMIENTO
    WHERE d.CODTIPODOCUMENTO = 7 -- Devolucion cliente
    AND UPPER(e.DESCRIPCION) NOT LIKE '%HISTÓRICO%' AND UPPER(e.DESCRIPCION) NOT LIKE '%BORRADO%'
    AND ROWNUM <= 5
    """
    cursor.execute(query_dev)
    for r in cursor.fetchall():
        print(r)

except Exception as e:
    print(e)
