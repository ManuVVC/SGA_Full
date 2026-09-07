import sys
import os
from werkzeug.security import generate_password_hash

# Aseguramos que el directorio raíz del backend esté en el sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import create_app
from app.database import db

def migrar_passwords():
    app = create_app()
    with app.app_context():
        # Obtenemos los operadores cuya contraseña no es NULL y no tiene formato de hash de werkzeug (pbkdf2:*)
        sql_select = "SELECT CODOPERADOR, PASSWORD FROM TMST_OPERADORES WHERE PASSWORD IS NOT NULL AND PASSWORD NOT LIKE 'pbkdf2:%'"
        try:
            operadores = db.execute_query(sql_select)
            print(f"Iniciando migración. Se encontraron {len(operadores)} contraseñas planas.")

            migrados = 0
            for op in operadores:
                cod = op['CODOPERADOR']
                plain_password = op['PASSWORD']
                
                # Generamos el hash
                hashed_password = generate_password_hash(plain_password)
                
                # Actualizamos la contraseña en base de datos
                sql_update = "UPDATE TMST_OPERADORES SET PASSWORD = :pwd WHERE CODOPERADOR = :cod"
                db.execute_non_query(sql_update, {'pwd': hashed_password, 'cod': cod})
                print(f" - Operador {cod} actualizado correctamente.")
                migrados += 1
                
            print(f"Migración completada. Total migrados: {migrados}")
        except Exception as e:
            print(f"Error durante la migración: {e}")

if __name__ == '__main__':
    migrar_passwords()
