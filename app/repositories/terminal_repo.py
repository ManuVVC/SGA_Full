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
                SELECT CodTerminal, Descripcion, CodOperador, NombreOperador, Prm_Bloqueado
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

            terminal_info = {
                "CODTERMINAL": row_dict.get("CODTERMINAL"),
                "DESCRIPCION": row_dict.get("DESCRIPCION"),
                "CODOPERADOR": row_dict.get("CODOPERADOR"),
                "NOMBREOPERADOR": row_dict.get("NOMBREOPERADOR"),
                "PRM_BLOQUEADO": row_dict.get("PRM_BLOQUEADO")
            }

            logger.info(f"Terminal '{terminal_info['CODTERMINAL']}' encontrado para la IP '{ip_address}'.")
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
