import oracledb
from flask import current_app


db = None


class OracleDB:
    def __init__(self):
        self.pool = None

    def init_app(self, app):
        from .config import Config

        Config.validate()
        self.pool = oracledb.create_pool(
            user=app.config["ORACLE_USER"],
            password=app.config["ORACLE_PASSWORD"],
            dsn=app.config["ORACLE_DSN"],
            min=app.config["ORACLE_MIN"],
            max=app.config["ORACLE_MAX"],
            increment=1,
            threaded=True,
        )

    def get_connection(self):
        if self.pool is None:
            raise RuntimeError("Oracle pool is not initialized")
        return self.pool.acquire()


db = OracleDB()
