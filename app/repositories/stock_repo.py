import logging
from datetime import datetime
from ..database import OracleDatabase

logger = logging.getLogger(__name__)

class StockRepository:
    @staticmethod
    def get_articulo_por_codigo(cod_articulo: str) -> dict or None:
        """
        Busca un artículo en la tabla GSM.TMST_ARTICULOS.
        Soporta búsqueda por CODARTICULOAPLICACION (código alfanumérico)
        y por CODARTICULO (código numérico interno).
        
        Retorna un diccionario con los datos básicos del artículo o None si no existe.
        """
        if not cod_articulo:
            return None

        connection = None
        cursor = None
        try:
            connection = OracleDatabase.get_connection()
            cursor = connection.cursor()

            # Determinar si la búsqueda es numérica para incluir CODARTICULO
            is_numeric = cod_articulo.isdigit()
            if is_numeric:
                query = """
                    SELECT CODARTICULO, CODARTICULOAPLICACION, NOMBREARTICULO 
                    FROM GSM.TMST_ARTICULOS 
                    WHERE UPPER(CODARTICULOAPLICACION) = UPPER(:cod_articulo) 
                       OR CODARTICULO = :cod_articulo_num
                """
                cursor.execute(query, cod_articulo=cod_articulo, cod_articulo_num=int(cod_articulo))
            else:
                query = """
                    SELECT CODARTICULO, CODARTICULOAPLICACION, NOMBREARTICULO 
                    FROM GSM.TMST_ARTICULOS 
                    WHERE UPPER(CODARTICULOAPLICACION) = UPPER(:cod_articulo)
                """
                cursor.execute(query, cod_articulo=cod_articulo)

            row = cursor.fetchone()
            if not row:
                logger.info(f"Artículo con código '{cod_articulo}' no encontrado.")
                return None

            columns = [col[0].upper() for col in cursor.description]
            row_dict = dict(zip(columns, row))

            articulo = {
                "CODARTICULO": row_dict.get("CODARTICULO"),
                "CODARTICULOAPLICACION": row_dict.get("CODARTICULOAPLICACION"),
                "NOMBREARTICULO": row_dict.get("NOMBREARTICULO")
            }
            logger.info(f"Artículo '{cod_articulo}' encontrado. ID interno: {articulo['CODARTICULO']}.")
            return articulo

        except Exception as e:
            logger.error(f"Error al buscar el artículo '{cod_articulo}': {e}", exc_info=True)
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
    def get_stock_por_articulo(cod_articulo_int: int) -> list:
        """
        Obtiene el stock detallado por ubicación para un artículo específico.
        Hace JOIN entre VSYS_STOCKARTICULOPORUBICACION, TMST_UBICACIONES, 
        VSYS_UBICACIONESARTICULO y TMST_NUMEROSLOTESPROVEEDORES.
        
        Filtra por el ID interno del artículo (cod_articulo_int).
        Retorna una lista de diccionarios con la información de ubicación y stock.
        """
        connection = None
        cursor = None
        try:
            connection = OracleDatabase.get_connection()
            cursor = connection.cursor()

            # Consulta eficiente retornando solo los campos requeridos
            query = """
                SELECT 
                    S.CodUbicacion AS COD_UBICACION,
                    U.CODETIQUETA AS ETIQUETA,
                    L.NUMEROLOTE AS LOTE,
                    S.Stock AS CANTIDAD,
                    S.FechaCaducidad AS FECHA_CADUCIDAD
                FROM GSM.VSYS_STOCKARTICULOPORUBICACION S
                INNER JOIN GSM.TMST_ARTICULOS A ON S.CodArticulo = A.CodArticulo
                LEFT JOIN GSM.TMST_UBICACIONES U ON S.CodUbicacion = U.CodUbicacion
                LEFT JOIN GSM.VSYS_UBICACIONESARTICULO UA ON S.CodArticulo = UA.CodArticulo 
                     AND S.CodUbicacion = UA.CodUbicacion 
                     AND S.NumeroOrden = UA.NumeroOrden
                LEFT JOIN GSM.TMST_NUMEROSLOTESPROVEEDORES L ON UA.CodNumeroLote = L.CODNUMEROLOTE
                WHERE S.CodArticulo = :cod_art AND S.Stock > 0
                ORDER BY S.FechaCaducidad ASC, U.CODETIQUETA ASC
            """
            cursor.execute(query, cod_art=cod_articulo_int)
            rows = cursor.fetchall()
            
            columns = [col[0].upper() for col in cursor.description]
            stock_list = []
            
            for row in rows:
                row_dict = dict(zip(columns, row))
                # Formatear la fecha de caducidad para evitar problemas de serialización JSON
                f_cad = row_dict.get("FECHA_CADUCIDAD")
                if isinstance(f_cad, datetime):
                    f_cad_str = f_cad.strftime("%Y-%m-%d")
                elif hasattr(f_cad, "strftime"):
                    f_cad_str = f_cad.strftime("%Y-%m-%d")
                else:
                    f_cad_str = str(f_cad) if f_cad else None

                stock_list.append({
                    "cod_ubicacion": row_dict.get("COD_UBICACION"),
                    "etiqueta": row_dict.get("ETIQUETA"),
                    "lote": row_dict.get("LOTE"),
                    "cantidad": float(row_dict.get("CANTIDAD")) if row_dict.get("CANTIDAD") is not None else 0.0,
                    "fecha_caducidad": f_cad_str
                })

            logger.info(f"Se encontraron {len(stock_list)} ubicaciones con stock para el artículo ID: {cod_articulo_int}.")
            return stock_list

        except Exception as e:
            logger.error(f"Error al obtener stock del artículo ID {cod_articulo_int}: {e}", exc_info=True)
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
