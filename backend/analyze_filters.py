import sys
import os
sys.path.insert(0, '/app')

from flask import Flask
from app.config import Config
from app.database import db, OracleDatabase

app = Flask(__name__)
app.config.from_object(Config)

# Inicializar cliente
db.init_app(app)

with app.app_context():
    tables = ['TMST_FILTROS', 'TMST_CAMPOSFILTRO', 'TSYS_DEFINICIONFILTROS', 'TSYS_DEFINICIONCAMPOSFILTRO']
    print("--- SCHEMAS ---")
    for table in tables:
        try:
            cols = OracleDatabase.execute_query(f"SELECT column_name, data_type FROM all_tab_columns WHERE table_name = '{table}' ORDER BY column_id", as_dict=False)
            print(f"Table: {table}")
            if cols:
                for col in cols:
                    print(f"  {col[0]} ({col[1]})")
            else:
                print("  Not found or no columns.")
        except Exception as e:
            print(f"Error describing {table}: {e}")
    
    print("\n--- FUNCTION SOURCE: GETCADENAFILTRO ---")
    try:
        lines = OracleDatabase.execute_query("SELECT text FROM all_source WHERE name = 'GETCADENAFILTRO' ORDER BY line", as_dict=False)
        if lines:
            for line in lines:
                print(line[0].rstrip())
        else:
            print("Function GETCADENAFILTRO not found.")
    except Exception as e:
        print(f"Error fetching function source: {e}")
