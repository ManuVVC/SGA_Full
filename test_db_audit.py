import os
from app import create_app
from app.database import db

# Aseguramos que la variable de auditoría está activa
os.environ['AUDIT_LOG_ENABLED'] = 'True'

app = create_app()

with app.app_context():
    print("Obteniendo conexión de BD...")
    try:
        conn = db.get_connection()
        cursor = conn.cursor()
        print("Ejecutando consulta de prueba...")
        cursor.execute("SELECT 1 FROM DUAL")
        res = cursor.fetchone()
        print("Resultado:", res)
        print("¡Ejecución exitosa!")
    except Exception as e:
        print("Error:", e)

    print("Verificando existencia del log...")
    log_path = os.path.join(app.root_path, '..', 'log', 'db_audit.log')
    if os.path.exists(log_path):
        print(f"Log de auditoría encontrado en: {log_path}")
        with open(log_path, 'r', encoding='utf-8') as f:
            print("--- CONTENIDO DEL LOG ---")
            print(f.read())
            print("-------------------------")
    else:
        print("No se encontró el archivo de log en", log_path)
