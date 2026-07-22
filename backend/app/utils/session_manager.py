import datetime
import logging

logger = logging.getLogger(__name__)


class SessionManager:
    _instance = None

    def __new__(cls, *args, **kwargs):
        if not cls._instance:
            cls._instance = super(SessionManager, cls).__new__(cls, *args, **kwargs)
            cls._instance._sessions_by_token = {}
            cls._instance._sessions_by_terminal = {}
        return cls._instance

    def register_session(self, token: str, cod_terminal: str, cod_operador: str, ip_address: str = ""):
        """
        Registra una nueva sesión para un terminal.
        Si el terminal ya tenía una sesión activa, esta se invalida.
        """
        now = datetime.datetime.now(datetime.timezone.utc)

        # 1. Si el terminal ya tiene una sesión activa, invalidar el token anterior
        if cod_terminal in self._sessions_by_terminal:
            old_token = self._sessions_by_terminal[cod_terminal]
            if old_token in self._sessions_by_token:
                old_session = self._sessions_by_token[old_token]
                logger.info(
                    f"[SGA][SessionManager] Invalidando sesión anterior en terminal '{cod_terminal}' "
                    f"(Operador anterior: '{old_session['cod_operador']}') por inicio de sesión concurrente."
                )
                del self._sessions_by_token[old_token]

        # 2. Registrar la nueva sesión
        self._sessions_by_token[token] = {
            "cod_terminal": cod_terminal,
            "cod_operador": cod_operador,
            "ip_address": ip_address,
            "login_time": now,
            "last_activity": now,
        }
        self._sessions_by_terminal[cod_terminal] = token
        logger.info(
            f"[SGA][SessionManager] Nueva sesión registrada: Terminal '{cod_terminal}', "
            f"Operario '{cod_operador}', IP '{ip_address}'."
        )

    def validate_session(self, token: str, timeout_minutes: int) -> tuple[bool, str]:
        """
        Valida si una sesión está activa y no ha expirado por inactividad.
        Actualiza el timestamp de last_activity si es válida.
        Retorna: (es_valida, motivo_error)
        """
        if token not in self._sessions_by_token:
            # Si el token no está registrado pero es un JWT válido firmado,
            # asumimos que fue invalidado (por reinicio de servidor o por sesión concurrente)
            return False, "session_invalidated"

        session = self._sessions_by_token[token]
        now = datetime.datetime.now(datetime.timezone.utc)
        last_activity = session["last_activity"]

        # Calcular tiempo transcurrido en minutos
        elapsed = (now - last_activity).total_seconds() / 60.0
        if elapsed > timeout_minutes:
            logger.info(
                f"[SGA][SessionManager] Sesión expirada por inactividad en terminal '{session['cod_terminal']}' "
                f"({elapsed:.1f} min > {timeout_minutes} min)."
            )
            self.remove_session(token)
            return False, "session_expired"

        # Actualizar marca de tiempo de última actividad
        session["last_activity"] = now
        return True, ""

    def remove_session(self, token: str):
        """
        Elimina una sesión activa por su token (logout o expiración).
        """
        if token in self._sessions_by_token:
            session = self._sessions_by_token[token]
            cod_terminal = session["cod_terminal"]

            # Limpiar el índice por terminal si el token coincide con el activo
            if self._sessions_by_terminal.get(cod_terminal) == token:
                del self._sessions_by_terminal[cod_terminal]

            del self._sessions_by_token[token]
            logger.info(f"[SGA][SessionManager] Sesión eliminada para el terminal '{cod_terminal}'.")

    def remove_session_by_terminal(self, cod_terminal: str):
        """
        Elimina la sesión activa de un terminal específico.
        """
        if cod_terminal in self._sessions_by_terminal:
            token = self._sessions_by_terminal[cod_terminal]
            self.remove_session(token)

    def get_active_sessions(self) -> list:
        """
        Retorna un snapshot de todas las sesiones activas con sus metadatos:
        terminal, operador, IP, hora de login y minutos de inactividad.
        """
        now = datetime.datetime.now(datetime.timezone.utc)
        result = []
        for session in self._sessions_by_token.values():
            elapsed = (now - session["last_activity"]).total_seconds() / 60.0
            result.append({
                "cod_terminal": session["cod_terminal"],
                "cod_operador": session["cod_operador"],
                "ip_address": session.get("ip_address", ""),
                "login_time": session["login_time"].isoformat(),
                "last_activity": session["last_activity"].isoformat(),
                "inactividad_minutos": round(elapsed, 1),
            })
        # Ordenar por terminal para facilitar la lectura
        result.sort(key=lambda x: x["cod_terminal"])
        return result


# Exportar instancia singleton
session_manager = SessionManager()
