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
        try:
            query = """
                SELECT DC.CODOPERADOR, DC.CODTERMINAL, CD.CODESTADODOCUMENTO 
                FROM TMST_CODDOCUMENTOS CD
                LEFT JOIN TMST_DOCUMENTOSCLIENTES DC ON CD.CODDOCUMENTO = DC.CODDOCUMENTO
                WHERE CD.CODDOCUMENTO = :1
            """
            row = OracleDatabase.execute_query(query, [cod_documento], fetch_all=False)
            if row:
                return {
                    "CODOPERADOR": row.get("CODOPERADOR"),
                    "CODTERMINAL": row.get("CODTERMINAL"),
                    "CODESTADO": row.get("CODESTADODOCUMENTO")
                }
            return None
        except Exception as e:
            logger.error(f"Error consultando documento {cod_documento}: {e}", exc_info=True)
            raise e

    @staticmethod
    def get_documentos_aparcados(cod_operador: int, cod_terminal: int, permisos: dict) -> list:
        """
        Devuelve la lista de documentos en estado aparcado (CODESTADODOCUMENTO = 7),
        controlando los permisos para ver documentos de otros operadores o terminales.
        """
        try:
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
                
            rows = OracleDatabase.execute_query(query, params, as_dict=False)
            return [{
                "cod_documento": r[0],
                "num_documento": r[1],
                "razon_social": r[2] or '',
                "nombre_comercial": r[3] or '',
                "num_lineas": r[4] or 0
            } for r in rows]
        except Exception as e:
            logger.error(f"Error consultando aparcados: {e}", exc_info=True)
            raise e

    @staticmethod
    def get_documentos_en_preparacion(cod_operador: int, cod_terminal: int) -> list:
        """
        Devuelve la lista de documentos en preparación (CODESTADODOCUMENTO = 3)
        para un operador y terminal específicos.
        """
        try:
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
            rows = OracleDatabase.execute_query(query, {
                "cod_operador": cod_operador,
                "cod_terminal": cod_terminal
            }, as_dict=False)
            return [{
                "cod_documento": r[0],
                "num_documento": r[1],
                "razon_social": r[2] or '',
                "nombre_comercial": r[3] or '',
                "num_lineas": r[4] or 0,
                "gestiona_bultos": r[5] or 0
            } for r in rows]
        except Exception as e:
            logger.error(f"Error consultando en preparacion: {e}", exc_info=True)
            raise e

    @staticmethod
    def finalizar_documento(cod_documento: int, despreciar_restos: int, num_bultos: int = None) -> int:
        """
        Finaliza la preparación de un documento cliente (estado 3 -> siguiente estado).
        Actualiza el NUMBULTOS si se indica.
        Llama a GSM.SPPRP_ENDPREPARACIONDOC.
        """
        try:
            with OracleDatabase.get_cursor(commit=True) as cursor:
                if num_bultos is not None and num_bultos >= 0:
                    update_query = "UPDATE TMST_DOCUMENTOSCLIENTES SET NUMBULTOS = :num_bultos WHERE CODDOCUMENTO = :cod_documento"
                    cursor.execute(update_query, {"num_bultos": num_bultos, "cod_documento": cod_documento})
                    
                return cursor.callfunc('GSM.SPPRP_ENDPREPARACIONDOC', int, [cod_documento, None, despreciar_restos])
        except Exception as e:
            logger.error(f"Error al finalizar preparacion: {e}", exc_info=True)
            raise Exception(f"No se pudo finalizar el documento: {str(e)}")

    @staticmethod
    def get_lineas_documento(cod_documento: int) -> list:
        """
        Devuelve las líneas de un documento cliente.
        """
        try:
            query = """
                SELECT CODARTICULO, NOMBREARTICULO, CANTSOLICITADA, CANTPREPARADA
                FROM TMST_LINEASDOCUMENTOCLIENTE
                WHERE CODDOCUMENTO = :1
                ORDER BY NUMLINEA ASC
            """
            rows = OracleDatabase.execute_query(query, [cod_documento], as_dict=False)
            return [{
                "cod_articulo": r[0],
                "nombre": r[1] or '',
                "cant_solicitada": r[2] or 0,
                "cant_preparada": r[3] or 0
            } for r in rows]
        except Exception as e:
            logger.error(f"Error consultando lineas del documento {cod_documento}: {e}", exc_info=True)
            raise e

    @staticmethod
    def aparcar_documento(cod_documento: int, cod_operador: int) -> int:
        try:
            with OracleDatabase.get_cursor(commit=True) as cursor:
                return cursor.callfunc('GSM.GSM_DOCUMENTOS.SPPRP_APARCARPREPARACIONDOC', int, [cod_documento, cod_operador])
        except Exception as e:
            logger.error(f"Error al aparcar documento {cod_documento}: {e}", exc_info=True)
            raise e

    @staticmethod
    def recuperar_documento(cod_documento: int, cod_terminal: int) -> int:
        try:
            with OracleDatabase.get_cursor(commit=True) as cursor:
                return cursor.callfunc('GSM.GSM_DOCUMENTOS.SPPRP_RECUPERARADOCAPARCADO', int, [cod_documento, cod_terminal])
        except Exception as e:
            logger.error(f"Error al recuperar documento {cod_documento}: {e}", exc_info=True)
            raise e
