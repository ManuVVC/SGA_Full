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
                    UA.CodUbicacion AS COD_UBICACION,
                    U.CODETIQUETA AS ETIQUETA,
                    L.NUMEROLOTE AS LOTE,
                    UA.Stock AS CANTIDAD,
                    UA.FechaCaducidad AS FECHA_CADUCIDAD
                FROM GSM.VSYS_UBICACIONESARTICULO UA
                LEFT JOIN GSM.TMST_UBICACIONES U ON UA.CodUbicacion = U.CodUbicacion
                LEFT JOIN GSM.TMST_NUMEROSLOTESPROVEEDORES L ON UA.CodNumeroLote = L.CODNUMEROLOTE
                WHERE UA.CodArticulo = :cod_art AND UA.Stock > 0
                ORDER BY UA.FechaCaducidad ASC, U.CODETIQUETA ASC
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

    @staticmethod
    def get_articulo_por_ean(ean_leido: str) -> dict or None:
        if not ean_leido:
            return None

        connection = None
        cursor = None
        try:
            connection = OracleDatabase.get_connection()
            cursor = connection.cursor()

            query = """
                SELECT A.CODARTICULO, A.CODARTICULOAPLICACION, A.NOMBREARTICULO 
                FROM GSM.TMST_ARTICULOS A
                INNER JOIN GSM.TMST_CODFACTURACION C ON A.CODARTICULO = C.CODARTICULO
                WHERE UPPER(C.CODFACTURACION) = UPPER(:ean)
            """
            cursor.execute(query, ean=ean_leido)
            row = cursor.fetchone()
            if not row:
                logger.info(f"Artículo con EAN '{ean_leido}' no encontrado.")
                return None

            columns = [col[0].upper() for col in cursor.description]
            row_dict = dict(zip(columns, row))

            articulo = {
                "CODARTICULO": row_dict.get("CODARTICULO"),
                "CODARTICULOAPLICACION": row_dict.get("CODARTICULOAPLICACION"),
                "NOMBREARTICULO": row_dict.get("NOMBREARTICULO")
            }
            return articulo

        except Exception as e:
            logger.error(f"Error al buscar el EAN '{ean_leido}': {e}", exc_info=True)
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
    def search_articulos(query: str) -> list:
        """
        Busca artículos por coincidencia exacta de EAN en TMST_CODFACTURACION,
        coincidencia exacta/parcial de CODARTICULOAPLICACION, o coincidencia
        parcial en NOMBREARTICULO.
        """
        if not query:
            return []

        connection = None
        cursor = None
        try:
            connection = OracleDatabase.get_connection()
            cursor = connection.cursor()

            sql = """
                SELECT DISTINCT 
                    A.CODARTICULO, 
                    A.CODARTICULOAPLICACION, 
                    A.NOMBREARTICULO,
                    (SELECT MAX(FACTORCONVERSION) FROM GSM.TMST_CODFACTURACION C2 WHERE C2.CODARTICULO = A.CODARTICULO AND UPPER(C2.CODFACTURACION) = UPPER(:q)) AS FACTOR_EAN
                FROM GSM.TMST_ARTICULOS A
                LEFT JOIN GSM.TMST_CODFACTURACION C ON A.CODARTICULO = C.CODARTICULO
                WHERE UPPER(C.CODFACTURACION) = UPPER(:q)
                   OR UPPER(A.CODARTICULOAPLICACION) LIKE UPPER(:q_like)
                   OR UPPER(A.NOMBREARTICULO) LIKE UPPER(:q_like)
                ORDER BY A.NOMBREARTICULO ASC
            """
            cursor.execute(sql, q=query, q_like=f"%{query}%")
            rows = cursor.fetchall()
            
            columns = [col[0].upper() for col in cursor.description]
            articulos = []
            
            for row in rows:
                row_dict = dict(zip(columns, row))
                articulos.append({
                    "CODARTICULO": row_dict.get("CODARTICULO"),
                    "CODARTICULOAPLICACION": row_dict.get("CODARTICULOAPLICACION"),
                    "NOMBREARTICULO": row_dict.get("NOMBREARTICULO"),
                    "FACTORCONVERSION": row_dict.get("FACTOR_EAN") or 1
                })

            return articulos

        except Exception as e:
            logger.error(f"Error al buscar artículos con query '{query}': {e}", exc_info=True)
            raise e
        finally:
            if cursor:
                try: cursor.close()
                except: pass
            if connection:
                try: connection.close()
                except: pass

    @staticmethod
    def get_eans_por_articulo(cod_articulo_int: int) -> list:
        """
        Devuelve la lista de EANs (Códigos de Facturación) de un artículo y su factor de conversión.
        """
        connection = None
        cursor = None
        try:
            connection = OracleDatabase.get_connection()
            cursor = connection.cursor()

            query = """
                SELECT CODFACTURACION, FACTORCONVERSION 
                FROM GSM.TMST_CODFACTURACION 
                WHERE CODARTICULO = :cod_art
                ORDER BY FACTORCONVERSION ASC
            """
            cursor.execute(query, cod_art=cod_articulo_int)
            rows = cursor.fetchall()
            
            columns = [col[0].upper() for col in cursor.description]
            eans = []
            
            for row in rows:
                row_dict = dict(zip(columns, row))
                eans.append({
                    "ean": row_dict.get("CODFACTURACION"),
                    "factor": row_dict.get("FACTORCONVERSION")
                })
            
            return eans
            
        except Exception as e:
            logger.error(f"Error al obtener EANs del artículo {cod_articulo_int}: {e}", exc_info=True)
            raise e
        finally:
            if cursor:
                try: cursor.close()
                except: pass
            if connection:
                try: connection.close()
                except: pass

