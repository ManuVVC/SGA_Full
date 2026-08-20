import os
from app import create_app
from app.database import OracleDatabase

app = create_app()

def run():
    with app.app_context():
        rows = OracleDatabase.execute_query("SELECT column_name, data_type FROM all_tab_columns WHERE table_name = 'TMST_CODFACTURACION'")
        print("Filas obtenidas usando OracleDatabase.execute_query:")
        for row in rows:
            print(" -", row)

if __name__ == "__main__":
    run()
