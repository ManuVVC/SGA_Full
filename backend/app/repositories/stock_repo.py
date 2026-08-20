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
        """
        if not cod_articulo:
            return None

        try:
            is_numeric = cod_articulo.isdigit()
            if is_numeric:
                query = """
                    SELECT CODARTICULO, CODARTICULOAPLICACION, NOMBREARTICULO, CODREALFABRICANTE 
                    FROM GSM.TMST_ARTICULOS 
                    WHERE UPPER(CODARTICULOAPLICACION) = UPPER(:cod_articulo) 
                       OR CODARTICULO = :cod_articulo_num
                """
                row_dict = OracleDatabase.execute_query(query, cod_articulo=cod_articulo, cod_articulo_num=int(cod_articulo), fetch_all=False)
            else:
                query = """
                    SELECT CODARTICULO, CODARTICULOAPLICACION, NOMBREARTICULO, CODREALFABRICANTE 
                    FROM GSM.TMST_ARTICULOS 
                    WHERE UPPER(CODARTICULOAPLICACION) = UPPER(:cod_articulo)
                """
                row_dict = OracleDatabase.execute_query(query, cod_articulo=cod_articulo, fetch_all=False)

            if not row_dict:
                from ..utils.parametros import is_parametro_activo
                if is_parametro_activo(1690):
                    query_fab = """
                        SELECT CODARTICULO, CODARTICULOAPLICACION, NOMBREARTICULO, CODREALFABRICANTE 
                        FROM GSM.TMST_ARTICULOS 
                        WHERE UPPER(CODREALFABRICANTE) = UPPER(:cod_articulo)
                    """
                    row_dict = OracleDatabase.execute_query(query_fab, cod_articulo=cod_articulo, fetch_all=False)

            if not row_dict:
                logger.info(f"Artículo con código '{cod_articulo}' no encontrado.")
                return None

            articulo = {
                "CODARTICULO": row_dict.get("CODARTICULO"),
                "CODARTICULOAPLICACION": row_dict.get("CODARTICULOAPLICACION"),
                "NOMBREARTICULO": row_dict.get("NOMBREARTICULO"),
                "CODREALFABRICANTE": row_dict.get("CODREALFABRICANTE")
            }
            logger.info(f"Artículo '{cod_articulo}' encontrado. ID interno: {articulo['CODARTICULO']}.")
            return articulo

        except Exception as e:
            logger.error(f"Error al buscar el artículo '{cod_articulo}': {e}", exc_info=True)
            raise e

    @staticmethod
    def get_stock_por_articulo(cod_articulo_int: int) -> list:
        """
        Obtiene el stock detallado por ubicación para un artículo específico.
        """
        try:
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
            rows = OracleDatabase.execute_query(query, {"cod_art": cod_articulo_int}, as_dict=True)
            stock_list = []
            
            for row_dict in rows:
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

    @staticmethod
    def actualizar_configuracion_ubicacion(cod_ubicacion: int, bloqueo_entrada: int, bloqueo_salida: int, ubicar_docs: int) -> bool:
        try:
            query = """
                UPDATE GSM.TMST_UBICACIONES 
                SET BLOQUEOENTRADA = :1, 
                    BLOQUEOSALIDA = :2, 
                    PRM_UBICARDOCUMENTOS = :3 
                WHERE CODUBICACION = :4
            """
            rows_affected = OracleDatabase.execute_non_query(query, [bloqueo_entrada, bloqueo_salida, ubicar_docs, cod_ubicacion])
            return rows_affected > 0
        except Exception as e:
            logger.error(f"Error al actualizar la configuracion de ubicacion ID {cod_ubicacion}: {e}", exc_info=True)
            raise e

    @staticmethod
    def get_stock_por_ubicacion(cod_ubicacion: int) -> list:
        """
        Obtiene el stock de una ubicación específica.
        """
        try:
            query = """
                SELECT 
                    A.CODARTICULOAPLICACION AS COD_INTERNO,
                    A.NOMBREARTICULO AS NOMBRE,
                    L.NUMEROLOTE AS LOTE,
                    UA.Stock AS STOCK,
                    UA.FechaCaducidad AS FECHA_CADUCIDAD
                FROM GSM.VSYS_UBICACIONESARTICULO UA
                LEFT JOIN GSM.TMST_ARTICULOS A ON UA.CodArticulo = A.CodArticulo
                LEFT JOIN GSM.TMST_NUMEROSLOTESPROVEEDORES L ON UA.CodNumeroLote = L.CODNUMEROLOTE
                WHERE UA.CodUbicacion = :cod_ubic AND UA.Stock > 0
                ORDER BY A.NOMBREARTICULO ASC, UA.FechaCaducidad ASC
            """
            rows = OracleDatabase.execute_query(query, {"cod_ubic": cod_ubicacion}, as_dict=True)
            stock_list = []
            
            for row_dict in rows:
                f_cad = row_dict.get("FECHA_CADUCIDAD")
                if hasattr(f_cad, "strftime"):
                    f_cad_str = f_cad.strftime("%Y-%m-%d")
                else:
                    f_cad_str = str(f_cad) if f_cad else None

                stock_list.append({
                    "cod_interno": row_dict.get("COD_INTERNO"),
                    "nombre": row_dict.get("NOMBRE"),
                    "lote": row_dict.get("LOTE"),
                    "stock": float(row_dict.get("STOCK")) if row_dict.get("STOCK") is not None else 0.0,
                    "fecha_caducidad": f_cad_str
                })

            return stock_list

        except Exception as e:
            logger.error(f"Error al obtener stock de la ubicacion ID {cod_ubicacion}: {e}", exc_info=True)
            raise e

    @staticmethod
    def get_articulo_por_ean(ean_leido: str) -> dict or None:
        if not ean_leido:
            return None

        try:
            query_exact = """
                SELECT DISTINCT A.CODARTICULO, A.CODARTICULOAPLICACION, A.NOMBREARTICULO, A.CODREALFABRICANTE 
                FROM GSM.TMST_ARTICULOS A
                INNER JOIN GSM.TMST_CODFACTURACION C ON A.CODARTICULO = C.CODARTICULO
                WHERE UPPER(C.CODFACTURACION) = UPPER(:ean)
            """
            rows = OracleDatabase.execute_query(query_exact, {"ean": ean_leido}, as_dict=True)

            if not rows and ean_leido.startswith('0') and len(ean_leido) > 1:
                ean_recortado = ean_leido[1:]
                logger.info(f"EAN '{ean_leido}' no encontrado de forma exacta. Probando coincidencia parcial (eliminando primer cero): '%{ean_recortado}'")
                query_like = """
                    SELECT DISTINCT A.CODARTICULO, A.CODARTICULOAPLICACION, A.NOMBREARTICULO, A.CODREALFABRICANTE 
                    FROM GSM.TMST_ARTICULOS A
                    INNER JOIN GSM.TMST_CODFACTURACION C ON A.CODARTICULO = C.CODARTICULO
                    WHERE UPPER(C.CODFACTURACION) LIKE '%' || UPPER(:ean_sin_cero)
                """
                rows = OracleDatabase.execute_query(query_like, {"ean_sin_cero": ean_recortado}, as_dict=True)

            if not rows:
                from ..utils.parametros import is_parametro_activo
                if is_parametro_activo(1690):
                    logger.info(f"EAN '{ean_leido}' no encontrado en TMST_CODFACTURACION. Probando por CODREALFABRICANTE (parámetro 1690 activo).")
                    query_fab = """
                        SELECT CODARTICULO, CODARTICULOAPLICACION, NOMBREARTICULO, CODREALFABRICANTE 
                        FROM GSM.TMST_ARTICULOS 
                        WHERE UPPER(CODREALFABRICANTE) = UPPER(:ean)
                    """
                    rows = OracleDatabase.execute_query(query_fab, {"ean": ean_leido}, as_dict=True)

            if not rows:
                logger.info(f"Artículo con EAN '{ean_leido}' no encontrado.")
                return None

            if len(rows) > 1:
                raise ValueError("Coincidencia de EAN ambigua")

            row_dict = rows[0]
            return {
                "CODARTICULO": row_dict.get("CODARTICULO"),
                "CODARTICULOAPLICACION": row_dict.get("CODARTICULOAPLICACION"),
                "NOMBREARTICULO": row_dict.get("NOMBREARTICULO"),
                "CODREALFABRICANTE": row_dict.get("CODREALFABRICANTE")
            }

        except Exception as e:
            logger.error(f"Error al buscar el EAN '{ean_leido}': {e}", exc_info=True)
            raise e

    @staticmethod
    def search_articulos(search_type: str, query: str) -> list:
        if not query:
            return []

        try:
            query_processed = query
            if search_type in ("codfacturacion", ""):
                if query.startswith('0') and len(query) > 1:
                    query_processed = query[1:]

            from ..utils.parametros import is_parametro_activo
            param_1690_activo = is_parametro_activo(1690)

            base_sql = """
                SELECT DISTINCT 
                    A.CODARTICULO, 
                    A.CODARTICULOAPLICACION, 
                    A.NOMBREARTICULO,
                    A.CODREALFABRICANTE,
                    A.PRM_TRAZABILIDAD,
                    A.GESTIONARCADUCIDAD,
                    NVL(A.MARGENCADUCIDAD, 0) AS MARGENCADUCIDAD,
                    (SELECT MAX(FACTORCONVERSION) FROM GSM.TMST_CODFACTURACION C2 WHERE C2.CODARTICULO = A.CODARTICULO AND UPPER(C2.CODFACTURACION) LIKE '%' || UPPER(:q)) AS FACTOR_EAN,
                    (SELECT MAX(FECHADESCATALOGACION) FROM GSM.TMST_CODFACTURACION C3 WHERE C3.CODARTICULO = A.CODARTICULO AND UPPER(C3.CODFACTURACION) LIKE '%' || UPPER(:q)) AS FECHADESCATALOGACION
                FROM GSM.TMST_ARTICULOS A
                LEFT JOIN GSM.TMST_CODFACTURACION C ON A.CODARTICULO = C.CODARTICULO
            """
            params = {"q": query_processed}
            
            if search_type == "codfacturacion":
                sql = base_sql + " WHERE UPPER(C.CODFACTURACION) LIKE '%' || UPPER(:q)"
            elif search_type == "codarticuloaplicacion":
                sql = base_sql + " WHERE UPPER(A.CODARTICULOAPLICACION) LIKE UPPER(:q_like)"
                params["q_like"] = f"%{query}%"
            elif search_type == "nombrearticulo":
                sql = base_sql + " WHERE UPPER(A.NOMBREARTICULO) LIKE UPPER(:q_like)"
                params["q_like"] = f"%{query}%"
            elif search_type in ("codrealfabricante", "fabricante"):
                if not param_1690_activo:
                    return []
                sql = base_sql + " WHERE UPPER(A.CODREALFABRICANTE) LIKE UPPER(:q_like)"
                params["q_like"] = f"%{query}%"
            else:
                if param_1690_activo:
                    sql = base_sql + """
                        WHERE UPPER(C.CODFACTURACION) LIKE '%' || UPPER(:q)
                           OR UPPER(A.CODARTICULOAPLICACION) LIKE UPPER(:q_like)
                           OR UPPER(A.NOMBREARTICULO) LIKE UPPER(:q_like)
                           OR UPPER(A.CODREALFABRICANTE) LIKE UPPER(:q_like)
                    """
                else:
                    sql = base_sql + """
                        WHERE UPPER(C.CODFACTURACION) LIKE '%' || UPPER(:q)
                           OR UPPER(A.CODARTICULOAPLICACION) LIKE UPPER(:q_like)
                           OR UPPER(A.NOMBREARTICULO) LIKE UPPER(:q_like)
                    """
                params["q_like"] = f"%{query}%"

            sql += " ORDER BY A.NOMBREARTICULO ASC"

            rows = OracleDatabase.execute_query(sql, params, as_dict=True)

            if not rows and search_type in ("codfacturacion", "codarticuloaplicacion") and param_1690_activo:
                logger.info(f"Sin resultados en search_articulos para type='{search_type}'. Probando fallback por CODREALFABRICANTE.")
                sql_fab = base_sql + " WHERE UPPER(A.CODREALFABRICANTE) LIKE UPPER(:q_like) ORDER BY A.NOMBREARTICULO ASC"
                rows = OracleDatabase.execute_query(sql_fab, {"q": query_processed, "q_like": f"%{query}%"}, as_dict=True)

            articulos = []
            
            for row_dict in rows:
                articulos.append({
                    "CODARTICULO": row_dict.get("CODARTICULO"),
                    "CODARTICULOAPLICACION": row_dict.get("CODARTICULOAPLICACION"),
                    "NOMBREARTICULO": row_dict.get("NOMBREARTICULO"),
                    "CODREALFABRICANTE": row_dict.get("CODREALFABRICANTE"),
                    "FACTORCONVERSION": row_dict.get("FACTOR_EAN") or 1,
                    "PRM_TRAZABILIDAD": row_dict.get("PRM_TRAZABILIDAD", 0),
                    "GESTIONARCADUCIDAD": row_dict.get("GESTIONARCADUCIDAD", 0),
                    "MARGENCADUCIDAD": row_dict.get("MARGENCADUCIDAD", 0),
                    "FECHADESCATALOGACION": row_dict.get("FECHADESCATALOGACION")
                })

            return articulos

        except Exception as e:
            logger.error(f"Error al buscar artículos con query '{query}': {e}", exc_info=True)
            raise e

    @staticmethod
    def get_eans_por_articulo(cod_articulo_int: int) -> list:
        try:
            query = """
                SELECT CODFACTURACION, FACTORCONVERSION 
                FROM GSM.TMST_CODFACTURACION 
                WHERE CODARTICULO = :cod_art
                ORDER BY FACTORCONVERSION ASC
            """
            rows = OracleDatabase.execute_query(query, {"cod_art": cod_articulo_int}, as_dict=True)
            return [{
                "ean": r.get("CODFACTURACION"),
                "factor": r.get("FACTORCONVERSION")
            } for r in rows]
        except Exception as e:
            logger.error(f"Error al obtener EANs del artículo {cod_articulo_int}: {e}", exc_info=True)
            raise e

