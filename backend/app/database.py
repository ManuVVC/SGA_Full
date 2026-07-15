import oracledb
from flask import current_app


db = None


class OracleDB:
    def __init__(self):
        self.pool = None

    def init_app(self, app):
        from .config import Config

        Config.validate()

        # Activar el Modo Thick (requerido para conectar con base de datos Oracle 10g)
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

    def get_connection(self):
        if self.pool is None:
            raise RuntimeError("Oracle pool is not initialized")
        return self.pool.acquire()


db = OracleDB()
