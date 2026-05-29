import logging
from ..database import OracleDatabase

logger = logging.getLogger(__name__)


class StockRepository:
    @staticmethod
    def get_stock_por_articulo(cod_articulo: str) -> list:
        """
        Consulta el stock desglosado por ubicación para un artículo específico.
        Soporta búsquedas tanto por la clave numérica interna (CODARTICULO) 
        como por el código visible de la aplicación (CODARTICULOAPLICACION).
        
        Usa LEFT JOIN defensivo en TMST_ARTICULOS para evitar pérdida de datos si 
        el artículo tiene stock pero no está completamente configurado en el maestro.
        """
        if not cod_articulo:
            return []

        connection = None
        cursor = None
        try:
            connection = OracleDatabase.get_connection()
            cursor = connection.cursor()

            # Consulta que obtiene la ubicación, lote, stock (cantidad) y nombre
            query = """
                SELECT S.CODUBICACION, 
                       (SELECT NLOT.NUMEROLOTE 
                        FROM VSYS_UBICACIONESARTICULO UA
                        LEFT JOIN TMST_NUMEROSLOTESPROVEEDORES NLOT ON NLOT.CODNUMEROLOTE = UA.CODNUMEROLOTE
                        WHERE UA.CODARTICULO = S.CODARTICULO 
                          AND UA.CODUBICACION = S.CODUBICACION 
                          AND ROWNUM = 1) AS LOTE,
                       S.STOCK AS CANTIDAD, 
                       A.NOMBREARTICULO
                FROM VSYS_STOCKARTICULOPORUBICACION S
                LEFT JOIN TMST_ARTICULOS A ON S.CODARTICULO = A.CODARTICULO
                WHERE S.CODARTICULO = :cod_art
                   OR UPPER(A.CODARTICULOAPLICACION) = UPPER(:cod_art)
            """
            
            logger.info(f"Consultando stock en base de datos para artículo: '{cod_articulo}'")
            
            # En Oracle, si pasamos un valor alfanumérico a un NUMBER sin control, puede fallar.
            # Convertimos cod_articulo a entero si es puramente numérico para mayor robustez en la comparación
            cod_param = cod_articulo
            if cod_articulo.isdigit():
                cod_param = int(cod_articulo)
                
            cursor.execute(query, cod_art=cod_param)
            rows = cursor.fetchall()

            # Mapeo dinámico a diccionarios limpios
            columns = [col[0].upper() for col in cursor.description]
            stock_list = []
            for row in rows:
                row_dict = dict(zip(columns, row))
                
                # Tratamiento de nulos de forma segura
                stock_list.append({
                    "CODUBICACION": row_dict.get("CODUBICACION"),
                    "LOTE": row_dict.get("LOTE") if row_dict.get("LOTE") is not None else "SIN LOTE",
                    "CANTIDAD": int(row_dict.get("CANTIDAD")) if row_dict.get("CANTIDAD") is not None else 0,
                    "NOMBREARTICULO": row_dict.get("NOMBREARTICULO") if row_dict.get("NOMBREARTICULO") is not None else "ARTÍCULO DESCONOCIDO"
                })

            logger.info(f"Consulta de stock exitosa. Ubicaciones encontradas: {len(stock_list)}")
            return stock_list

        except Exception as e:
            logger.error(f"Error en repositorio de stock para artículo '{cod_articulo}': {e}", exc_info=True)
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
    def get_stock_por_ean(ean_leido: str) -> list:
        """
        Consulta el stock de un artículo a partir de su código de barras (EAN).
        Realiza la resolución en una única consulta utilizando una subconsulta en 
        GSM.TMST_CODFACTURACION y un JOIN con TMST_ARTICULOS.
        
        Debe retornar una lista de diccionarios con el stock por ubicación.
        Si el EAN no existe en el sistema, retorna una lista vacía.
        """
        if not ean_leido:
            return []

        connection = None
        cursor = None
        try:
            connection = OracleDatabase.get_connection()
            cursor = connection.cursor()

            # Consulta SQL optimizada en un solo paso
            query = """
                SELECT S.CODUBICACION, 
                       (SELECT NLOT.NUMEROLOTE 
                        FROM VSYS_UBICACIONESARTICULO UA
                        LEFT JOIN TMST_NUMEROSLOTESPROVEEDORES NLOT ON NLOT.CODNUMEROLOTE = UA.CODNUMEROLOTE
                        WHERE UA.CODARTICULO = S.CODARTICULO 
                          AND UA.CODUBICACION = S.CODUBICACION 
                          AND ROWNUM = 1) AS LOTE,
                       S.STOCK AS CANTIDAD, 
                       A.NOMBREARTICULO,
                       A.CODARTICULOAPLICACION
                FROM VSYS_STOCKARTICULOPORUBICACION S
                JOIN TMST_ARTICULOS A ON S.CODARTICULO = A.CODARTICULO
                WHERE S.CODARTICULO = (
                    SELECT CODARTICULO 
                    FROM GSM.TMST_CODFACTURACION 
                    WHERE UPPER(CODFACTURACION) = UPPER(:ean_leido)
                )
            """
            
            logger.info(f"Consultando stock por EAN: '{ean_leido}'")
            cursor.execute(query, ean_leido=ean_leido)
            rows = cursor.fetchall()

            # Mapeo dinámico a lista de diccionarios
            columns = [col[0].upper() for col in cursor.description]
            stock_list = []
            for row in rows:
                row_dict = dict(zip(columns, row))
                stock_list.append({
                    "CODUBICACION": row_dict.get("CODUBICACION"),
                    "LOTE": row_dict.get("LOTE") if row_dict.get("LOTE") is not None else "SIN LOTE",
                    "CANTIDAD": int(row_dict.get("CANTIDAD")) if row_dict.get("CANTIDAD") is not None else 0,
                    "NOMBREARTICULO": row_dict.get("NOMBREARTICULO") if row_dict.get("NOMBREARTICULO") is not None else "ARTÍCULO DESCONOCIDO",
                    "CODARTICULOAPLICACION": row_dict.get("CODARTICULOAPLICACION") if row_dict.get("CODARTICULOAPLICACION") is not None else "DESCONOCIDO"
                })

            logger.info(f"Consulta por EAN finalizada. Filas: {len(stock_list)}")
            return stock_list

        except Exception as e:
            logger.error(f"Error en repositorio al buscar por EAN '{ean_leido}': {e}", exc_info=True)
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

