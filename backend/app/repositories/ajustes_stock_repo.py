import logging
import oracledb
from datetime import datetime
from ..database import OracleDatabase

logger = logging.getLogger(__name__)

class StockAjustesRepository:

    @staticmethod
    def get_conceptos():
        """Obtiene la lista de conceptos de ajuste de stock."""
        connection = None
        cursor = None
        try:
            connection = OracleDatabase.get_connection()
            cursor = connection.cursor()
            
            query = """
                SELECT CODCONCEPTO, NOMBRE, NOMBRECORTO, PRM_DESCONTARSTOCK, PRM_GENERARVARIACION
                FROM GSM.TMST_CONCEPTOSAJUSTESTOCK
                ORDER BY NOMBRE
            """
            cursor.execute(query)
            
            columns = [col[0].upper() for col in cursor.description]
            conceptos = [dict(zip(columns, row)) for row in cursor.fetchall()]
            
            return conceptos
            
        except Exception as e:
            logger.error(f"Error en get_conceptos: {e}", exc_info=True)
            return []
        finally:
            if cursor: cursor.close()
            if connection: connection.close()

    @staticmethod
    def get_lotes_articulo_ubicacion(cod_ubicacion, cod_articulo):
        """Obtiene lotes y fechas de un artículo en una ubicación específica."""
        connection = None
        cursor = None
        try:
            connection = OracleDatabase.get_connection()
            cursor = connection.cursor()
            
            query = """
                SELECT DISTINCT 
                    L.NUMEROLOTE, 
                    UA.FECHACADUCIDAD
                FROM GSM.VSYS_UBICACIONESARTICULO UA
                LEFT JOIN GSM.TMST_NUMEROSLOTESPROVEEDORES L ON UA.CodNumeroLote = L.CODNUMEROLOTE
                WHERE UA.CodUbicacion = :cod_ubicacion 
                  AND UA.CodArticulo = :cod_articulo
            """
            cursor.execute(query, cod_ubicacion=cod_ubicacion, cod_articulo=cod_articulo)
            
            columns = [col[0].upper() for col in cursor.description]
            lotes = [dict(zip(columns, row)) for row in cursor.fetchall()]
            
            return lotes
            
        except Exception as e:
            logger.error(f"Error en get_lotes_articulo_ubicacion: {e}", exc_info=True)
            return []
        finally:
            if cursor: cursor.close()
            if connection: connection.close()

    @staticmethod
    def ejecutar_ajuste(datos: dict):
        """Llama al procedimiento almacenado SPEST_AJUSTESDESTOCK."""
        connection = None
        cursor = None
        try:
            connection = OracleDatabase.get_connection()
            cursor = connection.cursor()

            fecha_obj = datos.get('fecha_caducidad')

            # Buscar maestro data
            query_maestro = """
                SELECT CODTIPODATOMAESTRO, CODDATOMAESTRO
                FROM TMST_UBICACIONESARTICULO
                WHERE CODUBICACION = :1 AND CODARTICULO = :2
                  AND ROWNUM = 1
            """
            cursor.execute(query_maestro, [datos.get('cod_ubicacion'), datos.get('cod_articulo')])
            row_maestro = cursor.fetchone()
            
            if row_maestro:
                cod_tipo_dato_maestro = row_maestro[0]
                cod_dato_maestro = row_maestro[1]
            else:
                query_maestro_ubi = """
                    SELECT CODTIPODATOMAESTRO, CODDATOMAESTRO
                    FROM TMST_UBICACIONES
                    WHERE CODUBICACION = :1
                """
                cursor.execute(query_maestro_ubi, [datos.get('cod_ubicacion')])
                row_maestro_ubi = cursor.fetchone()
                if row_maestro_ubi:
                    cod_tipo_dato_maestro = row_maestro_ubi[0]
                    cod_dato_maestro = row_maestro_ubi[1]
                else:
                    cod_tipo_dato_maestro = None
                    cod_dato_maestro = None

            kwargs = {
                "P_CODTERMINAL": datos.get('cod_terminal', 0),
                "P_CODOPERADOR": datos.get('cod_operador', 0),
                "P_CODARTICULO": datos.get('cod_articulo'),
                "P_CODCONCEPTO": datos.get('cod_concepto'),
                "P_CANTIDAD": datos.get('cantidad', 0),
                "P_CANTSEGUNDAUNIDAD": datos.get('cant_segunda_unidad', 0),
                "P_FECHACADUCIDAD": fecha_obj,
                "P_NUMEROLOTE": datos.get('lote'),
                "P_CODUBICACION": datos.get('cod_ubicacion'),
                "P_CODDOCUMENTO": datos.get('cod_documento', -1),
                "P_CADCODNUMEROSDESERIE": datos.get('numeros_serie', None),
                "P_CODTIPODATOMAESTRO": cod_tipo_dato_maestro,
                "P_CODDATOMAESTRO": cod_dato_maestro
            }

            result_code = cursor.callfunc("GSM.SPEST_AJUSTESDESTOCK", int, keywordParameters=kwargs)
            
            # If 0 is an error returned by Oracle
            if result_code == 0:
                error_msg = f"El procedimiento SPEST_AJUSTESDESTOCK devolvió 0. Parametros enviados: {kwargs}"
                logger.error(error_msg)
                raise Exception(error_msg)
                
            connection.commit()
            return result_code

        except Exception as e:
            logger.error(f"Error en ejecutar_ajuste: {e}", exc_info=True)
            if connection:
                connection.rollback()
            raise e
        finally:
            if cursor: cursor.close()
            if connection: connection.close()
