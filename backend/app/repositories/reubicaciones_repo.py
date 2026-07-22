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
                SELECT U.CODUBICACION, U.NOMBRECORTO, NVL(T.PRM_TRAZABILIDAD, 0), NVL(T.PRM_CADUCIDAD, 0), U.CODTIPODATOMAESTRO, U.CODDATOMAESTRO,
                       NVL(U.BLOQUEOENTRADA, 0), NVL(U.BLOQUEOSALIDA, 0), NVL(U.PRM_UBICARDOCUMENTOS, 0)
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
                    "PRM_CADUCIDAD": row[3],
                    "CODTIPODATOMAESTRO": row[4],
                    "CODDATOMAESTRO": row[5],
                    "BLOQUEOENTRADA": row[6],
                    "BLOQUEOSALIDA": row[7],
                    "PRM_UBICARDOCS": row[8]
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
    def get_ubicacion_by_nombre_corto(nombre_corto: str):
        """
        Busca una ubicación por su nombre corto en la vista GSM.VMST_UBICACIONES.
        """
        try:
            conn = db.get_connection()
            cursor = conn.cursor()
            query = """
                SELECT U.CODUBICACION, U.NOMBRECORTO, NVL(T.PRM_TRAZABILIDAD, 0), NVL(T.PRM_CADUCIDAD, 0), U.CODTIPODATOMAESTRO, U.CODDATOMAESTRO,
                       NVL(U.BLOQUEOENTRADA, 0), NVL(U.BLOQUEOSALIDA, 0), NVL(U.PRM_UBICARDOCUMENTOS, 0)
                FROM GSM.VMST_UBICACIONES U
                LEFT JOIN GSM.TSYS_TIPOSHUECOS T ON U.CODTIPOHUECO = T.CODTIPOHUECO
                WHERE UPPER(U.NOMBRECORTO) = UPPER(:1)
            """
            cursor.execute(query, [str(nombre_corto)])
            row = cursor.fetchone()
            if row:
                return {
                    "CODUBICACION": row[0],
                    "UBICACION": row[1],
                    "PRM_TRAZABILIDAD": row[2],
                    "PRM_CADUCIDAD": row[3],
                    "CODTIPODATOMAESTRO": row[4],
                    "CODDATOMAESTRO": row[5],
                    "BLOQUEOENTRADA": row[6],
                    "BLOQUEOSALIDA": row[7],
                    "PRM_UBICARDOCS": row[8]
                }
            return None
        except Exception as e:
            logger.error(f"Error al buscar ubicación por nombre corto {nombre_corto}: {e}")
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
                    SELECT U.CODUBICACION, U.NOMBRECORTO, U.POSICION, NVL(T.PRM_TRAZABILIDAD, 0), NVL(T.PRM_CADUCIDAD, 0), U.CODTIPODATOMAESTRO, U.CODDATOMAESTRO,
                           NVL(U.BLOQUEOENTRADA, 0), NVL(U.BLOQUEOSALIDA, 0), NVL(U.PRM_UBICARDOCUMENTOS, 0)
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
                        "PRM_CADUCIDAD": ub[4],
                        "CODTIPODATOMAESTRO": ub[5],
                        "CODDATOMAESTRO": ub[6],
                        "BLOQUEOENTRADA": ub[7],
                        "BLOQUEOSALIDA": ub[8],
                        "PRM_UBICARDOCS": ub[9]
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
            
            # Fase 1: Búsqueda exacta
            query_exact = """
                SELECT DISTINCT C.CODARTICULO, C.FACTORCONVERSION, NVL(A.PRM_TRAZABILIDAD, 0), NVL(A.GESTIONARCADUCIDAD, 0), A.CODARTICULOAPLICACION, A.NOMBREARTICULO
                FROM GSM.TMST_CODFACTURACION C
                JOIN GSM.TMST_ARTICULOS A ON C.CODARTICULO = A.CODARTICULO
                WHERE C.CODFACTURACION = :1
            """
            cursor.execute(query_exact, [ean])
            rows = cursor.fetchall()

            # Fase 2: Si no hay coincidencia, tiene un cero inicial y longitud > 1, omitimos primer cero y buscamos LIKE
            if not rows and ean.startswith('0') and len(ean) > 1:
                ean_recortado = ean[1:]
                logger.info(f"EAN '{ean}' no encontrado de forma exacta en reubicaciones. Probando coincidencia parcial (eliminando primer cero): '%{ean_recortado}'")
                query_like = """
                    SELECT DISTINCT C.CODARTICULO, C.FACTORCONVERSION, NVL(A.PRM_TRAZABILIDAD, 0), NVL(A.GESTIONARCADUCIDAD, 0), A.CODARTICULOAPLICACION, A.NOMBREARTICULO
                    FROM GSM.TMST_CODFACTURACION C
                    JOIN GSM.TMST_ARTICULOS A ON C.CODARTICULO = A.CODARTICULO
                    WHERE C.CODFACTURACION LIKE '%' || :1
                """
                cursor.execute(query_like, [ean_recortado])
                rows = cursor.fetchall()

            if not rows:
                return None

            # Control de ambigüedad: si hay múltiples artículos distintos, lanzar error
            if len(rows) > 1:
                raise ValueError("Coincidencia de EAN ambigua")

            row = rows[0]
            return {
                "CODARTICULO": row[0],
                "UNIDADES": row[1],
                "PRM_TRAZABILIDAD": row[2],
                "GESTIONARCADUCIDAD": row[3],
                "CODARTICULOAPLICACION": row[4],
                "NOMBREARTICULO": row[5]
            }
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
                SELECT A.CODARTICULO, NVL(A.PRM_TRAZABILIDAD, 0), NVL(A.GESTIONARCADUCIDAD, 0), A.CODARTICULOAPLICACION, A.NOMBREARTICULO
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
                    "GESTIONARCADUCIDAD": row[2],
                    "CODARTICULOAPLICACION": row[3],
                    "NOMBREARTICULO": row[4]
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
                SELECT CODARTICULO, NOMBREARTICULO, NVL(PRM_TRAZABILIDAD, 0), NVL(GESTIONARCADUCIDAD, 0) 
                FROM TMST_ARTICULOS 
                WHERE UPPER(NOMBREARTICULO) LIKE UPPER(:1)
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
                SELECT UA.CODNUMEROLOTE, NLP.NUMEROLOTE, NVL(UA.FECHACADUCIDAD, NLP.FECHACADUCIDAD) AS FECHACADUCIDAD, SUM(UA.STOCK) as STOCK_TOTAL
                FROM TMST_UBICACIONESARTICULO UA
                LEFT JOIN TMST_NUMEROSLOTESPROVEEDORES NLP ON UA.CODNUMEROLOTE = NLP.CODNUMEROLOTE
                WHERE UA.CODUBICACION = :1 AND UA.CODARTICULO = :2 AND UA.STOCK > 0
                GROUP BY UA.CODNUMEROLOTE, NLP.NUMEROLOTE, NVL(UA.FECHACADUCIDAD, NLP.FECHACADUCIDAD)
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
    def get_stock_master_data(cod_ubicacion: int, cod_articulo: int, cod_numero_lote: int = None):
        """
        Obtiene el tipo de dato maestro y dato maestro del stock de la ubicación.
        """
        try:
            conn = db.get_connection()
            cursor = conn.cursor()
            if cod_numero_lote:
                query = "SELECT MAX(CODTIPODATOMAESTRO), MAX(CODDATOMAESTRO) FROM TMST_UBICACIONESARTICULO WHERE CODUBICACION = :1 AND CODARTICULO = :2 AND CODNUMEROLOTE = :3"
                cursor.execute(query, [cod_ubicacion, cod_articulo, cod_numero_lote])
            else:
                query = "SELECT MAX(CODTIPODATOMAESTRO), MAX(CODDATOMAESTRO) FROM TMST_UBICACIONESARTICULO WHERE CODUBICACION = :1 AND CODARTICULO = :2"
                cursor.execute(query, [cod_ubicacion, cod_articulo])
                
            row = cursor.fetchone()
            if row:
                return {"CODTIPODATOMAESTRO": row[0], "CODDATOMAESTRO": row[1]}
            return None
        except Exception as e:
            logger.error(f"Error al obtener master data del stock: {e}")
            return None
        finally:
            if 'cursor' in locals():
                cursor.close()
            if 'conn' in locals():
                conn.close()

    @staticmethod
    def grabar_reubicacion(cod_terminal: int, cod_operador: int, cod_ubicacion_origen: int, 
                           cod_articulo: int, cantidad: int, cod_ubicacion_destino: int,
                           cod_numero_lote: int = None, fecha_caducidad = None,
                           tipo_dato_maestro_ori: int = None, dato_maestro_ori: int = None,
                           tipo_dato_maestro_dest: int = None, dato_maestro_dest: int = None):
        """
        Llama al procedimiento SPREU_REUBICARUBICARTICULO de la base de datos.
        """
        import datetime
        try:
            conn = db.get_connection()
            cursor = conn.cursor()
            
            fecha_cad_obj = None
            if fecha_caducidad:
                if isinstance(fecha_caducidad, str):
                    fecha_cad_obj = datetime.datetime.strptime(fecha_caducidad, '%Y-%m-%d')
                else:
                    fecha_cad_obj = fecha_caducidad
                    
            kwargs = {
                'P_CODTERMINAL': cod_terminal,
                'P_CODUBICACIONORIGEN': cod_ubicacion_origen,
                'P_CODARTICULO': cod_articulo,
                'P_CANTIDAD': cantidad,
                'P_CODUBICACIONDESTINO': cod_ubicacion_destino,
                'P_CODOPERADOR': cod_operador,
                'P_CODNUMEROLOTE': cod_numero_lote,
                'P_FECHACADUCIDAD': fecha_cad_obj,
                'P_CODCONCEPTOESTADISTICO': 1,
                'P_CODTIPODATOMAESTROORI': tipo_dato_maestro_ori,
                'P_CODDATOMAESTROORI': dato_maestro_ori,
                'P_CODTIPODATOMAESTRODEST': tipo_dato_maestro_dest,
                'P_CODDATOMAESTRODEST': dato_maestro_dest
            }
            
            ret_val = cursor.callfunc('GSM.SPREU_REUBICARUBICARTICULO', int, keywordParameters=kwargs)
            
            conn.commit()
            return ret_val
        except Exception as e:
            logger.error(f"Error al grabar reubicación: {e}")
            raise
        finally:
            if 'cursor' in locals():
                cursor.close()
            if 'conn' in locals():
                conn.close()

    @staticmethod
    def get_palet_by_sscc(sscc: str):
        """
        Busca la información de un palet por su matrícula (SSCC).
        """
        try:
            conn = db.get_connection()
            cursor = conn.cursor()
            query = """
                SELECT P.CODPALET, P.SSCC, P.CODARTICULO, A.NOMBREARTICULO, P.UNIDADES, 
                       P.CODNUMEROLOTE, NLP.NUMEROLOTE, P.FECHACADUCIDAD, 
                       P.CODTIPODATOMAESTRO, P.CODDATOMAESTRO
                FROM GSM.TMST_PALETS P
                JOIN GSM.TMST_ARTICULOS A ON P.CODARTICULO = A.CODARTICULO
                LEFT JOIN GSM.TMST_NUMEROSLOTESPROVEEDORES NLP ON P.CODNUMEROLOTE = NLP.CODNUMEROLOTE
                WHERE P.SSCC = :1
            """
            cursor.execute(query, [sscc])
            row = cursor.fetchone()
            if row:
                return {
                    "CODPALET": row[0],
                    "SSCC": row[1],
                    "CODARTICULO": row[2],
                    "DESCRIPCION": row[3],
                    "UNIDADES": row[4],
                    "CODNUMEROLOTE": row[5],
                    "NUMEROLOTE": row[6],
                    "FECHACADUCIDAD": row[7].strftime('%Y-%m-%d') if row[7] else None,
                    "CODTIPODATOMAESTRO": row[8],
                    "CODDATOMAESTRO": row[9]
                }
            return None
        except Exception as e:
            logger.error(f"Error al buscar palet por SSCC {sscc}: {e}")
            raise
        finally:
            if 'cursor' in locals():
                cursor.close()
            if 'conn' in locals():
                conn.close()

    @staticmethod
    def grabar_reubicacion_palet(cod_terminal: int, cod_operador: int, cod_palet: int, 
                                 cod_ubicacion_destino: int, tipo_dato_maestro_dest: int = None, 
                                 dato_maestro_dest: int = None):
        """
        Llama al procedimiento SPREU_REUBICARPALET de la base de datos.
        """
        try:
            conn = db.get_connection()
            cursor = conn.cursor()
            
            query = '''
            BEGIN
                :ret := SPREU_REUBICARPALET(
                    p_CodTerminal => :p_CodTerminal,
                    p_CodPalet => :p_CodPalet,
                    p_CodUbicacionDestino => :p_CodUbicacionDestino,
                    p_CodOperador => :p_CodOperador,
                    p_CodConceptoEstadistico => 1,
                    p_CodTipoDatoMaestroDest => :p_CodTipoDatoMaestroDest,
                    p_CodDatoMaestroDest => :p_CodDatoMaestroDest
                );
            END;
            '''
            ret_val = cursor.var(int)
            
            cursor.execute(query, {
                'ret': ret_val,
                'p_CodTerminal': cod_terminal,
                'p_CodPalet': cod_palet,
                'p_CodUbicacionDestino': cod_ubicacion_destino,
                'p_CodOperador': cod_operador,
                'p_CodTipoDatoMaestroDest': tipo_dato_maestro_dest,
                'p_CodDatoMaestroDest': dato_maestro_dest
            })
            
            conn.commit()
            return ret_val.getvalue()
        except Exception as e:
            logger.error(f"Error al grabar reubicación de palet: {e}")
            raise
        finally:
            if 'cursor' in locals():
                cursor.close()
            if 'conn' in locals():
                conn.close()
