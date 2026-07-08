import logging
from ..database import db

logger = logging.getLogger(__name__)

class UtilidadesRepo:

    @staticmethod
    def get_ean_info(ean: str):
        query = """
            SELECT 
                C.CODFACTURACION AS EAN,
                A.CODARTICULO,
                A.CODARTICULOAPLICACION,
                A.NOMBREARTICULO,
                C.FACTORCONVERSION
            FROM GSM.TMST_CODFACTURACION C
            INNER JOIN GSM.TMST_ARTICULOS A ON C.CODARTICULO = A.CODARTICULO
            WHERE UPPER(C.CODFACTURACION) = UPPER(:1)
        """
        conn = None
        try:
            conn = db.get_connection()
            cursor = conn.cursor()
            cursor.execute(query, [ean])
            row = cursor.fetchone()
            if row:
                return {
                    "EAN": row[0],
                    "CODARTICULO": row[1],
                    "CODARTICULOAPLICACION": row[2],
                    "NOMBREARTICULO": row[3],
                    "FACTORCONVERSION": row[4]
                }
            return None
        except Exception as e:
            logger.error(f"Error en get_ean_info para {ean}: {e}", exc_info=True)
            raise e
        finally:
            if conn:
                try:
                    db.pool.release(conn)
                except Exception as ex:
                    logger.warning(f"No se pudo liberar conexión en get_ean_info: {ex}")

    @staticmethod
    def insert_ean(ean: str, cod_articulo: int, factor: int):
        query = """
            INSERT INTO GSM.TMST_CODFACTURACION (
                CODFACTURACION,
                CODARTICULO,
                FACTORCONVERSION,
                CODTIPOUNIDAD,
                CODFORMATO,
                CODTIPOFACTURACION
            ) VALUES (
                :1, :2, :3, 1, 0, 1
            )
        """
        conn = None
        try:
            conn = db.get_connection()
            cursor = conn.cursor()
            cursor.execute(query, [ean, cod_articulo, factor])
            conn.commit()
            return True
        except Exception as e:
            if conn:
                conn.rollback()
            logger.error(f"Error en insert_ean para {ean}: {e}", exc_info=True)
            raise e
        finally:
            if conn:
                try:
                    db.pool.release(conn)
                except Exception as ex:
                    logger.warning(f"No se pudo liberar conexión en insert_ean: {ex}")

    @staticmethod
    def update_ean(ean: str, cod_articulo: int, factor: int):
        query = """
            UPDATE GSM.TMST_CODFACTURACION
            SET CODARTICULO = :1,
                FACTORCONVERSION = :2
            WHERE UPPER(CODFACTURACION) = UPPER(:3)
        """
        conn = None
        try:
            conn = db.get_connection()
            cursor = conn.cursor()
            cursor.execute(query, [cod_articulo, factor, ean])
            conn.commit()
            return cursor.rowcount > 0
        except Exception as e:
            if conn:
                conn.rollback()
            logger.error(f"Error en update_ean para {ean}: {e}", exc_info=True)
            raise e
        finally:
            if conn:
                try:
                    db.pool.release(conn)
                except Exception as ex:
                    logger.warning(f"No se pudo liberar conexión en update_ean: {ex}")
