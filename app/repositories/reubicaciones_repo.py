import logging
from ..database import db

logger = logging.getLogger(__name__)

class ReubicacionesRepository:
    
    @staticmethod
    def get_ubicacion_by_codigo(cod_ubicacion: str):
        """
        Busca una ubicación por su ID en la vista GSM.VMST_UBICACIONES.
        """
        try:
            conn = db.get_connection()
            cursor = conn.cursor()
            query = """
                SELECT U.CODUBICACION, U.NOMBRECORTO, NVL(T.PRM_TRAZABILIDAD, 0), NVL(T.PRM_CADUCIDAD, 0)
                FROM GSM.VMST_UBICACIONES U
                LEFT JOIN GSM.TSYS_TIPOSHUECOS T ON U.CODTIPOHUECO = T.CODTIPOHUECO
                WHERE U.CODUBICACION = :1
            """
            cursor.execute(query, [str(cod_ubicacion)])
            row = cursor.fetchone()
            if row:
                return {
                    "CODUBICACION": row[0],
                    "UBICACION": row[1],
                    "PRM_TRAZABILIDAD": row[2],
                    "PRM_CADUCIDAD": row[3]
                }
            return None
        except Exception as e:
            logger.error(f"Error al buscar ubicación {cod_ubicacion}: {e}")
            raise
        finally:
            if 'cursor' in locals():
                cursor.close()
            if 'conn' in locals():
                conn.close()

    @staticmethod
    def get_ubicaciones_by_etiqueta(etiqueta: str):
        """
        Busca ubicaciones a partir del texto (etiqueta) en GSM.VMST_HUECOS y luego GSM.VMST_UBICACIONES.
        """
        try:
            conn = db.get_connection()
            cursor = conn.cursor()
            
            # Buscar el CodHueco a partir de la etiqueta
            query_huecos = "SELECT CODHUECO FROM GSM.VMST_HUECOS WHERE CODETIQUETA = :1"
            cursor.execute(query_huecos, [etiqueta])
            huecos = cursor.fetchall()
            
            if not huecos:
                return []
                
            resultados = []
            for hueco in huecos:
                cod_hueco = hueco[0]
                query_ubic = """
                    SELECT U.CODUBICACION, U.NOMBRECORTO, U.POSICION, NVL(T.PRM_TRAZABILIDAD, 0), NVL(T.PRM_CADUCIDAD, 0)
                    FROM GSM.VMST_UBICACIONES U
                    LEFT JOIN GSM.TSYS_TIPOSHUECOS T ON U.CODTIPOHUECO = T.CODTIPOHUECO
                    WHERE U.CODHUECO = :1
                """
                cursor.execute(query_ubic, [cod_hueco])
                ubicaciones = cursor.fetchall()
                for ub in ubicaciones:
                    resultados.append({
                        "CODUBICACION": ub[0],
                        "UBICACION": ub[1],
                        "POSICION": ub[2],
                        "PRM_TRAZABILIDAD": ub[3],
                        "PRM_CADUCIDAD": ub[4]
                    })
                    
            return resultados
        except Exception as e:
            logger.error(f"Error al buscar etiqueta {etiqueta}: {e}")
            raise
        finally:
            if 'cursor' in locals():
                cursor.close()
            if 'conn' in locals():
                conn.close()

    @staticmethod
    def get_articulo_por_ean(ean: str):
        """
        Busca un artículo a partir de su EAN en TMST_CODFACTURACION.
        Retorna CodArticulo y las Unidades (factor de conversión).
        """
        try:
            conn = db.get_connection()
            cursor = conn.cursor()
            query = """
                SELECT C.CODARTICULO, C.FACTORCONVERSION, NVL(A.PRM_TRAZABILIDAD, 0), NVL(A.GESTIONARCADUCIDAD, 0)
                FROM GSM.TMST_CODFACTURACION C
                JOIN GSM.TMST_ARTICULOS A ON C.CODARTICULO = A.CODARTICULO
                WHERE C.CODFACTURACION = :1
            """
            cursor.execute(query, [ean])
            row = cursor.fetchone()
            if row:
                return {
                    "CODARTICULO": row[0],
                    "UNIDADES": row[1],
                    "PRM_TRAZABILIDAD": row[2],
                    "GESTIONARCADUCIDAD": row[3]
                }
            return None
        except Exception as e:
            logger.error(f"Error al buscar articulo por EAN {ean}: {e}")
            raise
        finally:
            if 'cursor' in locals():
                cursor.close()
            if 'conn' in locals():
                conn.close()
                
    @staticmethod
    def get_articulo_por_codigo_interno(codigo: str):
        """
        Utiliza GSM_ARTICULOS.SPGET_CODARTICULO para validar código interno.
        """
        try:
            conn = db.get_connection()
            cursor = conn.cursor()
            # SPGET_CODARTICULO devuelve CODARTICULO
            query = """
                SELECT A.CODARTICULO, NVL(A.PRM_TRAZABILIDAD, 0), NVL(A.GESTIONARCADUCIDAD, 0)
                FROM DUAL
                JOIN GSM.TMST_ARTICULOS A ON A.CODARTICULO = GSM_ARTICULOS.SPGET_CODARTICULO(:1)
            """
            cursor.execute(query, [codigo])
            row = cursor.fetchone()
            if row and row[0]:
                return {
                    "CODARTICULO": row[0],
                    "UNIDADES": 1,
                    "PRM_TRAZABILIDAD": row[1],
                    "GESTIONARCADUCIDAD": row[2]
                }
            return None
        except Exception as e:
            logger.error(f"Error al buscar articulo por código interno {codigo}: {e}")
            raise
        finally:
            if 'cursor' in locals():
                cursor.close()
            if 'conn' in locals():
                conn.close()

    @staticmethod
    def get_articulo_por_descripcion(descripcion: str):
        """
        Busca en TMST_ARTICULOS por descripción (LIKE).
        """
        try:
            conn = db.get_connection()
            cursor = conn.cursor()
            query = """
                SELECT CODARTICULO, DESCRIPCION, NVL(PRM_TRAZABILIDAD, 0), NVL(GESTIONARCADUCIDAD, 0) 
                FROM TMST_ARTICULOS 
                WHERE UPPER(DESCRIPCION) LIKE UPPER(:1)
            """
            cursor.execute(query, [f"%{descripcion}%"])
            rows = cursor.fetchall()
            resultados = []
            for row in rows:
                resultados.append({
                    "CODARTICULO": row[0],
                    "DESCRIPCION": row[1],
                    "UNIDADES": 1,
                    "PRM_TRAZABILIDAD": row[2],
                    "GESTIONARCADUCIDAD": row[3]
                })
            return resultados
        except Exception as e:
            logger.error(f"Error al buscar articulo por descripcion {descripcion}: {e}")
            raise
        finally:
            if 'cursor' in locals():
                cursor.close()
            if 'conn' in locals():
                conn.close()

    @staticmethod
    def get_stock_ubicacion_articulo(cod_ubicacion: int, cod_articulo: int):
        """
        Consulta el stock actual de un artículo en una ubicación en TMST_UBICACIONESARTICULO.
        """
        try:
            conn = db.get_connection()
            cursor = conn.cursor()
            query = "SELECT NVL(SUM(STOCK), 0) FROM TMST_UBICACIONESARTICULO WHERE CODUBICACION = :1 AND CODARTICULO = :2"
            cursor.execute(query, [cod_ubicacion, cod_articulo])
            row = cursor.fetchone()
            return row[0] if row else 0
        except Exception as e:
            logger.error(f"Error al consultar stock: {e}")
            raise
        finally:
            if 'cursor' in locals():
                cursor.close()
            if 'conn' in locals():
                conn.close()

    @staticmethod
    def get_lotes_disponibles(cod_ubicacion: int, cod_articulo: int):
        """
        Retorna los lotes disponibles en una ubicación origen para un artículo concreto.
        """
        try:
            conn = db.get_connection()
            cursor = conn.cursor()
            query = """
                SELECT UA.CODNUMEROLOTE, NLP.NUMEROLOTE, NLP.FECHACADUCIDAD, SUM(UA.STOCK) as STOCK_TOTAL
                FROM TMST_UBICACIONESARTICULO UA
                LEFT JOIN TMST_NUMEROSLOTESPROVEEDORES NLP ON UA.CODNUMEROLOTE = NLP.CODNUMEROLOTE
                WHERE UA.CODUBICACION = :1 AND UA.CODARTICULO = :2 AND UA.STOCK > 0
                GROUP BY UA.CODNUMEROLOTE, NLP.NUMEROLOTE, NLP.FECHACADUCIDAD
            """
            cursor.execute(query, [cod_ubicacion, cod_articulo])
            rows = cursor.fetchall()
            resultados = []
            for row in rows:
                resultados.append({
                    "CODNUMEROLOTE": row[0],
                    "NUMEROLOTE": row[1],
                    "FECHACADUCIDAD": row[2].strftime('%Y-%m-%d') if row[2] else None,
                    "STOCK": row[3]
                })
            return resultados
        except Exception as e:
            logger.error(f"Error al obtener lotes disponibles: {e}")
            raise
        finally:
            if 'cursor' in locals():
                cursor.close()
            if 'conn' in locals():
                conn.close()

    @staticmethod
    def grabar_reubicacion(cod_terminal: int, cod_operador: int, cod_ubicacion_origen: int, 
                           cod_articulo: int, cantidad: int, cod_ubicacion_destino: int,
                           cod_numero_lote: int = None, fecha_caducidad = None):
        """
        Llama al procedimiento SPREU_REUBICARUBICARTICULO de la base de datos.
        """
        try:
            conn = db.get_connection()
            cursor = conn.cursor()
            
            # Formato de la consulta para llamar a una funcion
            query = '''
            BEGIN
                :ret := SPREU_REUBICARUBICARTICULO(
                    p_CodTerminal => :p_CodTerminal,
                    p_CodUbicacionOrigen => :p_CodUbicacionOrigen,
                    p_CodArticulo => :p_CodArticulo,
                    p_Cantidad => :p_Cantidad,
                    p_CodUbicacionDestino => :p_CodUbicacionDestino,
                    p_CodOperador => :p_CodOperador,
                    p_CodNumeroLote => :p_CodNumeroLote,
                    p_FechaCaducidad => TO_DATE(:p_FechaCaducidad, 'YYYY-MM-DD')
                );
            END;
            '''
            # Definir la variable de retorno
            ret_val = cursor.var(int)
            
            cursor.execute(query, {
                'ret': ret_val,
                'p_CodTerminal': cod_terminal,
                'p_CodUbicacionOrigen': cod_ubicacion_origen,
                'p_CodArticulo': cod_articulo,
                'p_Cantidad': cantidad,
                'p_CodUbicacionDestino': cod_ubicacion_destino,
                'p_CodOperador': cod_operador,
                'p_CodNumeroLote': cod_numero_lote,
                'p_FechaCaducidad': fecha_caducidad
            })
            
            conn.commit()
            return ret_val.getvalue()
        except Exception as e:
            logger.error(f"Error al grabar reubicación: {e}")
            raise
        finally:
            if 'cursor' in locals():
                cursor.close()
            if 'conn' in locals():
                conn.close()
