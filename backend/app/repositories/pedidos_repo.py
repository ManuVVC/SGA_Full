import logging
from ..database import OracleDatabase

logger = logging.getLogger(__name__)

class PedidosRepository:
    
    @staticmethod
    def get_documento_estado(cod_documento: int) -> dict:
        """
        Devuelve información sobre el estado del documento, 
        operador que lo preparaba, y su terminal, si aplica.
        """
        connection = None
        cursor = None
        try:
            connection = OracleDatabase.get_connection()
            cursor = connection.cursor()
            
            # Buscar el estado y operador/terminal
            query = """
                SELECT DC.CODOPERADOR, DC.CODTERMINAL, CD.CODESTADODOCUMENTO 
                FROM TMST_CODDOCUMENTOS CD
                LEFT JOIN TMST_DOCUMENTOSCLIENTES DC ON CD.CODDOCUMENTO = DC.CODDOCUMENTO
                WHERE CD.CODDOCUMENTO = :1
            """
            cursor.execute(query, [cod_documento])
            row = cursor.fetchone()
            
            if row:
                return {
                    "CODOPERADOR": row[0],
                    "CODTERMINAL": row[1],
                    "CODESTADO": row[2]
                }
            return None
        except Exception as e:
            logger.error(f"Error consultando documento {cod_documento}: {e}", exc_info=True)
            raise e
        finally:
            if cursor: cursor.close()
            if connection: connection.close()

    @staticmethod
    def get_documentos_aparcados(cod_operador: int, cod_terminal: int, permisos: dict) -> list:
        """
        Devuelve la lista de documentos en estado aparcado (CODESTADODOCUMENTO = 7),
        controlando los permisos para ver documentos de otros operadores o terminales.
        """
        connection = None
        cursor = None
        try:
            connection = OracleDatabase.get_connection()
            cursor = connection.cursor()
            
            # CODESTADODOCUMENTO 7 = Aparcado
            query = """
                SELECT CODDOCUMENTO, NUMDOCUMENTO, RAZONSOCIAL, NOMBRECOMERCIAL, NUMLINEAS
                FROM VMST_DOCCLIENTESVISIBLES
                WHERE CODESTADODOCUMENTO = 7
            """
            
            params = {}
            
            if not permisos.get("PRM_RECUPERARDOCOTROOPERARIO"):
                query += " AND CODOPERADOR = :cod_operador"
                params["cod_operador"] = cod_operador
                
            if not permisos.get("PRM_RECUPERARDOCOTROTERMINAL"):
                query += " AND CODTERMINAL = :cod_terminal"
                params["cod_terminal"] = cod_terminal
                
            cursor.execute(query, params)
            rows = cursor.fetchall()
            
            aparcados = []
            for row in rows:
                aparcados.append({
                    "cod_documento": row[0],
                    "num_documento": row[1],
                    "razon_social": row[2] or '',
                    "nombre_comercial": row[3] or '',
                    "num_lineas": row[4] or 0
                })
            return aparcados
        except Exception as e:
            logger.error(f"Error consultando aparcados: {e}", exc_info=True)
            raise e
        finally:
            if cursor: cursor.close()
            if connection: connection.close()

    @staticmethod
    def get_documentos_en_preparacion(cod_operador: int, cod_terminal: int) -> list:
        """
        Devuelve la lista de documentos en preparación (CODESTADODOCUMENTO = 3)
        para un operador y terminal específicos.
        """
        connection = None
        cursor = None
        try:
            connection = OracleDatabase.get_connection()
            cursor = connection.cursor()
            
            query = """
                SELECT v.CODDOCUMENTO, v.NUMDOCUMENTO, v.RAZONSOCIAL, v.NOMBRECOMERCIAL, v.NUMLINEAS,
                    CASE 
                        WHEN COALESCE((SELECT VALOR FROM TSYS_PARAMETROSXAMBITO WHERE CODPARAMETRO = 1737 AND CODUSUARIOPERFIL = 0), '0') = '0' 
                        THEN t.PRM_GESTIONARBULTOS 
                        ELSE c.PRM_GESTIONARBULTOS 
                    END AS GESTIONA_BULTOS
                FROM VMST_DOCCLIENTESVISIBLES v
                LEFT JOIN TMST_TIPOMOVIMIENTO t ON t.CODTIPOMOVIMIENTO = v.CODTIPOMOVIMIENTO
                LEFT JOIN TMST_CLIENTES c ON c.CODCLIENTE = v.CODCLIENTE
                WHERE v.CODESTADODOCUMENTO = 3
                  AND v.CODOPERADOR = :cod_operador
                  AND v.CODTERMINAL = :cod_terminal
            """
            
            cursor.execute(query, {
                "cod_operador": cod_operador,
                "cod_terminal": cod_terminal
            })
            
            rows = cursor.fetchall()
            
            preparacion = []
            for row in rows:
                preparacion.append({
                    "cod_documento": row[0],
                    "num_documento": row[1],
                    "razon_social": row[2] or '',
                    "nombre_comercial": row[3] or '',
                    "num_lineas": row[4] or 0,
                    "gestiona_bultos": row[5] or 0
                })
            return preparacion
        except Exception as e:
            logger.error(f"Error consultando en preparacion: {e}", exc_info=True)
            raise e
        finally:
            if cursor: cursor.close()
            if connection: connection.close()

    @staticmethod
    def finalizar_documento(cod_documento: int, despreciar_restos: int, num_bultos: int = None) -> int:
        """
        Finaliza la preparación de un documento cliente (estado 3 -> siguiente estado).
        Actualiza el NUMBULTOS si se indica.
        Llama a GSM.SPPRP_ENDPREPARACIONDOC.
        Retorna NUMBER
        """
        connection = None
        cursor = None
        try:
            connection = OracleDatabase.get_connection()
            cursor = connection.cursor()
            
            if num_bultos is not None and num_bultos >= 0:
                update_query = "UPDATE TMST_DOCUMENTOSCLIENTES SET NUMBULTOS = :num_bultos WHERE CODDOCUMENTO = :cod_documento"
                cursor.execute(update_query, {"num_bultos": num_bultos, "cod_documento": cod_documento})
                
            # SPPRP_ENDPREPARACIONDOC: P_CODDOCUMENTO (NUMBER), P_UBICACIONESDESTINO (VARCHAR2), P_DESPRECIARRESTOS (NUMBER)
            result = cursor.callfunc('GSM.SPPRP_ENDPREPARACIONDOC', int, [cod_documento, None, despreciar_restos])
            
            connection.commit()
            return result
        except Exception as e:
            logger.error(f"Error al finalizar preparacion: {e}", exc_info=True)
            if connection: connection.rollback()
            raise Exception(f"No se pudo finalizar el documento: {str(e)}")
        finally:
            if cursor: cursor.close()
            if connection: connection.close()

    @staticmethod
    def get_lineas_documento(cod_documento: int) -> list:
        """
        Devuelve las líneas de un documento cliente.
        """
        connection = None
        cursor = None
        try:
            connection = OracleDatabase.get_connection()
            cursor = connection.cursor()
            
            query = """
                SELECT CODARTICULO, NOMBREARTICULO, CANTSOLICITADA, CANTPREPARADA
                FROM TMST_LINEASDOCUMENTOCLIENTE
                WHERE CODDOCUMENTO = :1
                ORDER BY NUMLINEA ASC
            """
            cursor.execute(query, [cod_documento])
            rows = cursor.fetchall()
            
            lineas = []
            for row in rows:
                lineas.append({
                    "cod_articulo": row[0],
                    "nombre": row[1] or '',
                    "cant_solicitada": row[2] or 0,
                    "cant_preparada": row[3] or 0
                })
            return lineas
        except Exception as e:
            logger.error(f"Error consultando lineas del documento {cod_documento}: {e}", exc_info=True)
            raise e
        finally:
            if cursor: cursor.close()
            if connection: connection.close()

    @staticmethod
    def aparcar_documento(cod_documento: int, cod_operador: int) -> int:
        connection = None
        cursor = None
        try:
            connection = OracleDatabase.get_connection()
            cursor = connection.cursor()
            
            # SPPRP_APARCARPREPARACIONDOC: IN P_CODDOCUMENTO, IN P_CODOPERADOR. Retorna NUMBER.
            result = cursor.callfunc('GSM.GSM_DOCUMENTOS.SPPRP_APARCARPREPARACIONDOC', int, [cod_documento, cod_operador])
            connection.commit()
            return result
        except Exception as e:
            logger.error(f"Error al aparcar documento {cod_documento}: {e}", exc_info=True)
            if connection: connection.rollback()
            raise e
        finally:
            if cursor: cursor.close()
            if connection: connection.close()

    @staticmethod
    def recuperar_documento(cod_documento: int, cod_terminal: int) -> int:
        connection = None
        cursor = None
        try:
            connection = OracleDatabase.get_connection()
            cursor = connection.cursor()
            
            # SPPRP_RECUPERARADOCAPARCADO: IN P_CODDOCUMENTO, IN P_CODTERMINAL. Retorna NUMBER.
            result = cursor.callfunc('GSM.GSM_DOCUMENTOS.SPPRP_RECUPERARADOCAPARCADO', int, [cod_documento, cod_terminal])
            connection.commit()
            return result
        except Exception as e:
            logger.error(f"Error al recuperar documento {cod_documento}: {e}", exc_info=True)
            if connection: connection.rollback()
            raise e
        finally:
            if cursor: cursor.close()
            if connection: connection.close()
