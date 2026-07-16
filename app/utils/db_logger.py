import os
import logging
from logging.handlers import RotatingFileHandler

def setup_audit_logger(app):
    """
    Configura el logger para auditoría de base de datos si AUDIT_LOG_ENABLED es True.
    Los logs se guardarán en la carpeta 'log' en la raíz del proyecto.
    """
    if not app.config.get("AUDIT_LOG_ENABLED"):
        return

    log_dir = os.path.join(app.root_path, '..', 'log')
    os.makedirs(log_dir, exist_ok=True)
    
    log_file = os.path.join(log_dir, 'db_audit.log')
    
    logger = logging.getLogger("db_audit")
    logger.setLevel(logging.INFO)
    
    # Evitar duplicar handlers si la app se recarga
    if not logger.handlers:
        handler = RotatingFileHandler(log_file, maxBytes=10*1024*1024, backupCount=5, encoding='utf-8')
        formatter = logging.Formatter('%(asctime)s - %(levelname)s - %(message)s')
        handler.setFormatter(formatter)
        logger.addHandler(handler)


class AuditCursor:
    """Wrapper para oracledb.Cursor que registra las consultas ejecutadas."""
    def __init__(self, cursor):
        self._cursor = cursor
        self._logger = logging.getLogger("db_audit")

    def execute(self, statement, parameters=None, **kwargs):
        self._logger.info(f"EXECUTE | SQL: {statement} | PARAMS: {parameters} | KWARGS: {kwargs}")
        if parameters is None:
            return self._cursor.execute(statement, **kwargs)
        return self._cursor.execute(statement, parameters, **kwargs)

    def executemany(self, statement, parameters, **kwargs):
        self._logger.info(f"EXECUTEMANY | SQL: {statement} | PARAMS COUNT: {len(parameters) if parameters else 0} | KWARGS: {kwargs}")
        return self._cursor.executemany(statement, parameters, **kwargs)
        
    def __getattr__(self, item):
        return getattr(self._cursor, item)

    def __enter__(self):
        self._cursor.__enter__()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        return self._cursor.__exit__(exc_type, exc_val, exc_tb)
        
    def __iter__(self):
        return iter(self._cursor)


class AuditConnection:
    """Wrapper para oracledb.Connection que intercepta la creación de cursores."""
    def __init__(self, connection):
        self._connection = connection

    def cursor(self, *args, **kwargs):
        cursor = self._connection.cursor(*args, **kwargs)
        return AuditCursor(cursor)

    def __getattr__(self, item):
        return getattr(self._connection, item)

    def __enter__(self):
        self._connection.__enter__()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        return self._connection.__exit__(exc_type, exc_val, exc_tb)
