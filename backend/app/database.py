import logging
import oracledb
from contextlib import contextmanager
from flask import current_app

logger = logging.getLogger(__name__)
db = None


class OracleDatabase:
    _instance = None

    def __new__(cls, *args, **kwargs):
        if not cls._instance:
            cls._instance = super(OracleDatabase, cls).__new__(cls, *args, **kwargs)
        return cls._instance

    def __init__(self):
        if not hasattr(self, "pool"):
            self.pool = None

    def init_app(self, app):
        from .config import Config

        Config.validate()

        # Activar el Modo Thick (requerido para conectar con base de datos Oracle 10g/11g)
        client_path = app.config.get("ORACLE_CLIENT_PATH")
        try:
            if client_path:
                oracledb.init_oracle_client(lib_dir=client_path)
            else:
                oracledb.init_oracle_client()
        except Exception as e:
            app.logger.warning(f"Aviso de inicialización del cliente de Oracle: {e}")

        self.pool = oracledb.create_pool(
            user=app.config["ORACLE_USER"],
            password=app.config["ORACLE_PASSWORD"],
            dsn=app.config["ORACLE_DSN"],
            min=app.config["ORACLE_MIN"],
            max=app.config["ORACLE_MAX"],
            increment=1,
        )

    @classmethod
    def get_connection(cls):
        instance = cls()
        if instance.pool is None:
            raise RuntimeError("Oracle pool is not initialized")
            
        connection = instance.pool.acquire()
        
        # Envolver la conexión si el log de auditoría está activado
        if current_app and current_app.config.get("AUDIT_LOG_ENABLED"):
            from .utils.db_logger import AuditConnection
            return AuditConnection(connection)
            
        return connection

    @classmethod
    @contextmanager
    def get_cursor(cls, commit=False):
        """Gestor de contexto que abre conexión y cursor, y los cierra automáticamente al finalizar."""
        connection = None
        cursor = None
        try:
            connection = cls.get_connection()
            cursor = connection.cursor()
            yield cursor
            if commit:
                connection.commit()
        except Exception as e:
            if connection and commit:
                try:
                    connection.rollback()
                except Exception:
                    pass
            raise e
        finally:
            if cursor:
                try:
                    cursor.close()
                except Exception:
                    pass
            if connection:
                try:
                    connection.close()
                except Exception:
                    pass

    @classmethod
    def execute_query(cls, sql, params=None, as_dict=True, fetch_all=True, **kwargs):
        """Ejecuta una consulta SELECT y formatea automáticamente los resultados, liberando los recursos."""
        with cls.get_cursor() as cursor:
            if params is not None:
                cursor.execute(sql, params)
            elif kwargs:
                cursor.execute(sql, **kwargs)
            else:
                cursor.execute(sql)

            if not as_dict:
                return cursor.fetchall() if fetch_all else cursor.fetchone()

            columns = [col[0].upper() for col in cursor.description] if cursor.description else []
            if fetch_all:
                return [dict(zip(columns, row)) for row in cursor.fetchall()]
            else:
                row = cursor.fetchone()
                return dict(zip(columns, row)) if row else None

    @classmethod
    def execute_non_query(cls, sql, params=None, commit=True, **kwargs):
        """Ejecuta una consulta INSERT, UPDATE o DELETE con gestión automática de transacciones."""
        with cls.get_cursor(commit=commit) as cursor:
            if params is not None:
                cursor.execute(sql, params)
            elif kwargs:
                cursor.execute(sql, **kwargs)
            else:
                cursor.execute(sql)
            return cursor.rowcount

    @classmethod
    def call_procedure(cls, proc_name, parameters=None, commit=True):
        """Ejecuta un procedimiento almacenado con gestión automática de conexión y transacción."""
        with cls.get_cursor(commit=commit) as cursor:
            if parameters is None:
                return cursor.callproc(proc_name)
            else:
                return cursor.callproc(proc_name, parameters)


db = OracleDatabase()
OracleDB = OracleDatabase  # Alias para compatibilidad hacia atrás

