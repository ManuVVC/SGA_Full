import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'app'))
from app.utils.db import OracleDatabase

conn = OracleDatabase.get_connection()
c = conn.cursor()
c.execute("SELECT OBJECT_NAME FROM ALL_OBJECTS WHERE OBJECT_NAME LIKE '%UBICACIONES%ARTICULO%'")
print('UBICACIONES:', list(set([r[0] for r in c.fetchall()])))
c.execute("SELECT OBJECT_NAME FROM ALL_OBJECTS WHERE OBJECT_NAME LIKE '%RECORRIDO%'")
print('RECORRIDO:', list(set([r[0] for r in c.fetchall()])))
