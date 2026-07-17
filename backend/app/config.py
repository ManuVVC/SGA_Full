import os
from dotenv import load_dotenv


load_dotenv()


class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "change-me")
    ORACLE_USER = os.getenv("ORACLE_USER")
    ORACLE_PASSWORD = os.getenv("ORACLE_PASSWORD")
    ORACLE_DSN = os.getenv("ORACLE_DSN")
    ORACLE_MIN = int(os.getenv("ORACLE_MIN", "1"))
    ORACLE_MAX = int(os.getenv("ORACLE_MAX", "5"))
    ORACLE_CLIENT_PATH = os.getenv("ORACLE_CLIENT_PATH")
    AUDIT_LOG_ENABLED = os.getenv("AUDIT_LOG_ENABLED", "False").lower() in ("true", "1", "t", "yes")
    SESSION_TIMEOUT_MINUTES = int(os.getenv("SESSION_TIMEOUT_MINUTES", "30"))


    @staticmethod
    def validate():
        missing = [
            key
            for key in ("ORACLE_USER", "ORACLE_PASSWORD", "ORACLE_DSN")
            if not os.getenv(key)
        ]
        if missing:
            raise RuntimeError(f"Missing required environment variables: {', '.join(missing)}")


Config.validate()
