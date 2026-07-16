import logging
from ..database import OracleDatabase

logger = logging.getLogger(__name__)

class TerminalRepository:
    @staticmethod
    def get_info_terminal_por_ip(ip_address: str) -> dict or None:
        """
        Consulta la vista GSM.VMST_TERMINALES para obtener información
        del terminal según su dirección IP.
        """
        connection = None
        cursor = None
        try:
            connection = OracleDatabase.get_connection()
            cursor = connection.cursor()

            query = """
                SELECT *
                FROM GSM.VMST_TERMINALES
                WHERE IP = :ip_address
            """
            cursor.execute(query, ip_address=ip_address)
            
            row = cursor.fetchone()
            if not row:
                logger.info(f"Terminal con IP '{ip_address}' no encontrado en la base de datos.")
                return None

            columns = [col[0].upper() for col in cursor.description]
            row_dict = dict(zip(columns, row))

            permisos = {}
            for col_name, value in row_dict.items():
                if col_name.startswith("PRM_"):
                    permisos[col_name] = bool(value) if value is not None else False

            terminal_info = {
                "CODTERMINAL": row_dict.get("CODTERMINAL"),
                "DESCRIPCION": row_dict.get("DESCRIPCION"),
                "CODOPERADOR": row_dict.get("CODOPERADOR"),
                "NOMBREOPERADOR": row_dict.get("NOMBREOPERADOR"),
                "permisos": permisos
            }

            logger.info(f"Terminal '{terminal_info['CODTERMINAL']}' encontrado para la IP '{ip_address}' con {len(permisos)} permisos.")
            return terminal_info

        except Exception as e:
            logger.error(f"Error de base de datos al obtener terminal por IP '{ip_address}': {e}", exc_info=True)
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

    @staticmethod
    def actualizar_ultimo_operario(cod_terminal: str, cod_operador: str) -> None:
        """
        Actualiza el código del último operador logueado en el terminal dado.
        """
        if not cod_terminal or not cod_operador:
            return

        connection = None
        cursor = None
        try:
            connection = OracleDatabase.get_connection()
            cursor = connection.cursor()

            query = """
                UPDATE GSM.TMST_TERMINALES 
                SET CODOPERADOR = :cod_operador 
                WHERE CODTERMINAL = :cod_terminal
            """
            cursor.execute(query, cod_operador=cod_operador, cod_terminal=cod_terminal)
            connection.commit()
            logger.info(f"Último operario actualizado a '{cod_operador}' para el terminal '{cod_terminal}'.")

        except Exception as e:
            logger.error(f"Error de base de datos al actualizar último operario en terminal '{cod_terminal}': {e}", exc_info=True)
            if connection:
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
