import os
from app.database import db

def run():
    db.init_pool()
    conn = db.get_connection()
    cur = conn.cursor()
    cur.execute("SELECT column_name, data_type FROM all_tab_columns WHERE table_name = 'TMST_CODFACTURACION'")
    print([row for row in cur.fetchall()])
    db.close_pool()

if __name__ == "__main__":
    run()
