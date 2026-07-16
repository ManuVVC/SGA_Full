import logging
from ..database import OracleDatabase

logger = logging.getLogger(__name__)

class AuthRepository:
    @staticmethod
    def get_operador_por_codigo(cod_operador: str) -> dict or None:
        """
        Consulta un operador en la tabla GSM.TMST_OPERADORES por su código.
        
        Retorna un diccionario con los datos del operador y sus permisos booleanos,
        o None si el operador no existe.
        """
        if not cod_operador:
            return None

        connection = None
        cursor = None
        try:
            # Obtener conexión del pool gestionado
            connection = OracleDatabase.get_connection()
            cursor = connection.cursor()

            # Consulta parametrizada para evitar inyección SQL
            query = "SELECT * FROM GSM.TMST_OPERADORES WHERE UPPER(CODOPERADOR) = UPPER(:cod_operador)"
            cursor.execute(query, cod_operador=cod_operador)
            
            row = cursor.fetchone()
            if not row:
                logger.info(f"Operador con código '{cod_operador}' no encontrado en la base de datos.")
                return None

            # Mapear columnas a sus respectivos valores dinámicamente
            columns = [col[0].upper() for col in cursor.description]
            row_dict = dict(zip(columns, row))

            # Extraer y mapear dinámicamente los permisos booleanos (columnas que inician con PRM_)
            permisos = {}
            for col_name, value in row_dict.items():
                if col_name.startswith("PRM_"):
                    # En Oracle, las booleanas suelen guardarse como NUMBER (1=True, 0=False o NULL=False)
                    permisos[col_name] = bool(value) if value is not None else False

            # Retornar objeto del operador estructurado
            operador = {
                "CODOPERADOR": row_dict.get("CODOPERADOR"),
                "NOMBRE": row_dict.get("NOMBRE"),
                "PASSWORD": row_dict.get("PASSWORD"),
                "CODGRUPOOPERADOR": row_dict.get("CODGRUPOOPERADOR"),
                "CODUSUARIOPERFIL": row_dict.get("CODUSUARIOPERFIL"),
                "permisos": permisos
            }

            logger.info(f"Operador '{cod_operador}' cargado con éxito con {len(permisos)} permisos.")
            return operador

        except Exception as e:
            logger.error(f"Error de base de datos al obtener operador '{cod_operador}': {e}", exc_info=True)
            raise e

        finally:
            if cursor:
                try:
                    cursor.close()
                except Exception:
                    pass
            if connection:
                try:
                    connection.close()  # Devuelve la conexión al pool
                except Exception:
                    pass
