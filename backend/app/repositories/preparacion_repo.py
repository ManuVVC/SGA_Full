import logging
from app.database import OracleDatabase
import oracledb

logger = logging.getLogger(__name__)


class PreparacionRepository:

    @staticmethod
    def obtener_documento_para_preparar(cod_terminal: int) -> int:
        """
        Llama a SPGET_DOCUMENTOPARAPREPARAR y devuelve el cod_documento asignado.
        Retorna -1 si no hay documentos disponibles.
        """
        connection = None
        cursor = None
        try:
            connection = OracleDatabase.get_connection()
            cursor = connection.cursor()
            result = cursor.callfunc('GSM.SPGET_DOCUMENTOPARAPREPARAR', oracledb.NUMBER, [cod_terminal])
            connection.commit()
            return int(result) if result is not None else -1
        except Exception as e:
            logger.error(f"Error en SPGET_DOCUMENTOPARAPREPARAR: {e}", exc_info=True)
            if connection:
                connection.rollback()
            raise Exception(f"Error al obtener documento para preparar: {str(e)}")
        finally:
            if cursor:
                cursor.close()
            if connection:
                connection.close()

    @staticmethod
    def get_cabecera_documento(cod_documento: int) -> dict:
        """
        Obtiene la cabecera del documento de VMST_DOCCLIENTESVISIBLES
        y el total de cajas/volumen teórico.
        """
        connection = None
        cursor = None
        try:
            connection = OracleDatabase.get_connection()
            cursor = connection.cursor()

            cursor.execute("""
                SELECT CODDOCUMENTO, NUMDOCUMENTO, RAZONSOCIAL, NOMBRECOMERCIAL,
                       OBSERVACIONES, NUMLINEAS, CODCLIENTEAPLICACION, PARTICION
                FROM VMST_DOCCLIENTESVISIBLES
                WHERE CODDOCUMENTO = :cod_doc
            """, {"cod_doc": cod_documento})
            row = cursor.fetchone()
            if not row:
                raise Exception(f"Documento {cod_documento} no encontrado")

            try:
                total_cajas = cursor.callfunc('GSM.SPPRP_TOTALCAJASPARAPREPARAR', oracledb.NUMBER, [cod_documento])
            except Exception:
                total_cajas = 0

            try:
                volumen = cursor.callfunc('GSM.SPPRP_TOTALVOLUMENPARAPREPARAR', oracledb.NUMBER, [cod_documento])
            except Exception:
                volumen = 0

            return {
                "cod_documento":    row[0],
                "num_documento":    row[1],
                "razon_social":     row[2] if row[2] is not None else '',
                "nombre_comercial": row[3] if row[3] is not None else '',
                "observaciones":    row[4] if row[4] is not None else '',
                "num_lineas":       row[5] if row[5] is not None else 0,
                "cod_cliente":      row[6],
                "particion":        row[7] if row[7] is not None else '',
                "total_cajas":      float(total_cajas) if total_cajas else 0,
                "volumen":          float(volumen) if volumen else 0,
            }
        except Exception as e:
            logger.error(f"Error en get_cabecera_documento: {e}", exc_info=True)
            raise Exception(f"Error al obtener cabecera del documento: {str(e)}")
        finally:
            if cursor:
                cursor.close()
            if connection:
                connection.close()

    @staticmethod
    def get_permisos_preparacion(cod_operador: int) -> dict:
        """
        Obtiene los parámetros PRM_SOLICITAR* y PRM_PUEDESERVIRMAS del operario.
        Valores: -1 = activo, 0 = desactivado.
        """
        connection = None
        cursor = None
        try:
            connection = OracleDatabase.get_connection()
            cursor = connection.cursor()
            cursor.execute("""
                SELECT PRM_SOLICITARUBICACIONORIGEN,
                       PRM_SOLICITARARTICULO,
                       PRM_SOLICITARCANTIDAD,
                       PRM_PUEDESERVIRMAS
                FROM TMST_OPERADORES
                WHERE CODOPERADOR = :cod_op
            """, {"cod_op": cod_operador})
            row = cursor.fetchone()
            if not row:
                return {"solicitar_ubicacion": 0, "solicitar_articulo": 0,
                        "solicitar_cantidad": -1, "puede_servir_mas": 0}
            return {
                "solicitar_ubicacion": int(row[0]) if row[0] is not None else 0,
                "solicitar_articulo":  int(row[1]) if row[1] is not None else 0,
                "solicitar_cantidad":  int(row[2]) if row[2] is not None else -1,
                "puede_servir_mas":    int(row[3]) if row[3] is not None else 0,
            }
        except Exception as e:
            logger.error(f"Error en get_permisos_preparacion: {e}", exc_info=True)
            raise Exception(f"Error al obtener permisos de preparación: {str(e)}")
        finally:
            if cursor:
                cursor.close()
            if connection:
                connection.close()

    @staticmethod
    def validar_ubicacion(cod_hueco: str, cod_ubicacion_esperada: int = None) -> dict:
        """
        Valida que el texto escaneado corresponda a una ubicación.
        Si se pasa cod_ubicacion_esperada, se verifica si el texto coincide con 
        la etiqueta de la ubicación esperada o su hueco padre.
        """
        connection = None
        cursor = None
        try:
            connection = OracleDatabase.get_connection()
            cursor = connection.cursor()
            
            if cod_ubicacion_esperada:
                # Verificar si el escaneo coincide con la ubicación esperada o su hueco
                cursor.execute("""
                    SELECT U.CODUBICACION, U.CODHUECO, U.DESCRIPCION
                    FROM TMST_UBICACIONES U
                    LEFT JOIN TMST_HUECOS H ON U.CODHUECO = H.CODHUECO
                    WHERE U.CODUBICACION = :ubic_esperada
                      AND (UPPER(TO_CHAR(U.CODHUECO)) = UPPER(:cod_hueco)
                       OR UPPER(U.CODETIQUETA) = UPPER(:cod_hueco)
                       OR UPPER(U.NOMBRECORTO) = UPPER(:cod_hueco)
                       OR UPPER(H.CODETIQUETA) = UPPER(:cod_hueco)
                       OR UPPER(H.NOMBRECORTO) = UPPER(:cod_hueco))
                """, {"ubic_esperada": cod_ubicacion_esperada, "cod_hueco": cod_hueco})
                row = cursor.fetchone()
                if row:
                    return {
                        "valida":        True,
                        "codubicacion":  row[0],
                        "codhueco":      row[1] or '',
                        "descripcion":   row[2] or '',
                    }
                    
            # Si no hay esperada o no coincidió, buscar libremente
            cursor.execute("""
                SELECT U.CODUBICACION, U.CODHUECO, U.DESCRIPCION
                FROM TMST_UBICACIONES U
                LEFT JOIN TMST_HUECOS H ON U.CODHUECO = H.CODHUECO
                WHERE (UPPER(TO_CHAR(U.CODHUECO)) = UPPER(:cod_hueco)
                   OR UPPER(U.CODETIQUETA) = UPPER(:cod_hueco)
                   OR UPPER(U.NOMBRECORTO) = UPPER(:cod_hueco)
                   OR UPPER(H.CODETIQUETA) = UPPER(:cod_hueco)
                   OR UPPER(H.NOMBRECORTO) = UPPER(:cod_hueco))
                  AND ROWNUM = 1
            """, {"cod_hueco": cod_hueco})
            row = cursor.fetchone()
            if not row:
                return {"valida": False, "codubicacion": None, "codhueco": cod_hueco, "descripcion": ""}
            return {
                "valida":        True,
                "codubicacion":  row[0],
                "codhueco":      row[1] or '',
                "descripcion":   row[2] or '',
            }
        except Exception as e:
            logger.error(f"Error en validar_ubicacion: {e}", exc_info=True)
            raise Exception(f"Error al validar ubicación: {str(e)}")
        finally:
            if cursor:
                cursor.close()
            if connection:
                connection.close()

    @staticmethod
    def get_stock_lotes(cod_ubicacion: int, cod_articulo: int) -> list:
        """
        Devuelve los lotes/caducidades disponibles de un artículo en una ubicación,
        filtrando caducados (FECHACADUCIDAD < HOY) y solo registros con STOCK > 0.
        Orden: FECHACADUCIDAD ASC NULLS LAST (FIFO por caducidad).
        """
        connection = None
        cursor = None
        try:
            connection = OracleDatabase.get_connection()
            cursor = connection.cursor()
            cursor.execute("""
                SELECT S.CODNUMEROLOTE,
                       L.NUMEROLOTE,
                       S.FECHACADUCIDAD,
                       S.STOCK,
                       S.CODTIPODATOMAESTRO,
                       S.CODDATOMAESTRO
                FROM VSYS_UBICACIONESARTICULO S
                LEFT JOIN GSM.TMST_NUMEROSLOTESPROVEEDORES L ON S.CODNUMEROLOTE = L.CODNUMEROLOTE
                WHERE S.CODUBICACION  = :cod_ubic
                  AND S.CODARTICULO   = :cod_art
                  AND S.STOCK > 0
                  AND (S.FECHACADUCIDAD IS NULL OR S.FECHACADUCIDAD >= TRUNC(SYSDATE))
                ORDER BY S.FECHACADUCIDAD ASC NULLS LAST
            """, {"cod_ubic": cod_ubicacion, "cod_art": cod_articulo})
            cols = [d[0].lower() for d in cursor.description]
            rows = cursor.fetchall()
            result = []
            for row in rows:
                d = dict(zip(cols, row))
                for k, v in d.items():
                    if hasattr(v, 'strftime'):
                        d[k] = v.strftime('%Y-%m-%d')
                result.append(d)
            return result
        except Exception as e:
            logger.error(f"Error en get_stock_lotes: {e}", exc_info=True)
            raise Exception(f"Error al obtener stock por lotes: {str(e)}")
        finally:
            if cursor:
                cursor.close()
            if connection:
                connection.close()

    @staticmethod
    def get_lineas_pendientes(cod_documento: int) -> list:
        """
        Devuelve todas las líneas pendientes del documento (cantsolicitada > cantpreparada + cantanulada)
        con info de trazabilidad/caducidad del artículo, para mostrar la lista de selección.
        """
        connection = None
        cursor = None
        try:
            connection = OracleDatabase.get_connection()
            cursor = connection.cursor()
            cursor.execute("""
                SELECT L.NUMLINEA,
                       L.CODARTICULO,
                       A.CODARTICULOAPLICACION,
                       L.NOMBREARTICULO,
                       A.DESCRIPCIONSECUNDARIA,
                       L.CANTSOLICITADA,
                       NVL(L.CANTPREPARADA, 0)   AS CANTPREPARADA,
                       NVL(L.CANTANULADA, 0)      AS CANTANULADA,
                       L.OBSERVACIONES,
                       A.PRM_TRAZABILIDAD,
                       A.GESTIONARCADUCIDAD,
                       A.MARGENCADUCIDAD,
                       L.CODDATOMAESTROORIGEN,
                       L.CODTIPODATOMAESTROORIGEN,
                       NVL(V.STOCKTOTAL, 0)      AS STOCKTOTAL
                FROM TMST_LINEASDOCUMENTOCLIENTE L
                INNER JOIN VMST_LINEASDOCUMENTOCLIENTE V ON L.CODLINEADOCUMENTOCLIENTE = V.CODLINEADOCUMENTOCLIENTE
                INNER JOIN TMST_ARTICULOS A ON A.CODARTICULO = L.CODARTICULO
                WHERE L.CODDOCUMENTO = :cod_doc
                  AND L.DESPRECIARPENDIENTE = 0
                  AND L.CANTSOLICITADA > (NVL(L.CANTPREPARADA, 0) + NVL(L.CANTANULADA, 0))
                ORDER BY L.NUMLINEA
            """, {"cod_doc": cod_documento})
            cols = [d[0].lower() for d in cursor.description]
            rows = cursor.fetchall()
            result = []
            for row in rows:
                d = dict(zip(cols, row))
                for k, v in d.items():
                    if hasattr(v, 'strftime'):
                        d[k] = v.strftime('%Y-%m-%d')
                result.append(d)
            return result
        except Exception as e:
            logger.error(f"Error en get_lineas_pendientes: {e}", exc_info=True)
            raise Exception(f"Error al obtener líneas pendientes: {str(e)}")
        finally:
            if cursor:
                cursor.close()
            if connection:
                connection.close()

    @staticmethod
    def get_num_lineas_pendientes(cod_documento: int) -> int:
        """
        Devuelve el número de líneas pendientes llamando a SPGET_NUMLINEASPENDIENTES.
        """
        connection = None
        cursor = None
        try:
            connection = OracleDatabase.get_connection()
            cursor = connection.cursor()
            import oracledb
            num_lineas = cursor.callfunc('GSM.SPGET_NUMLINEASPENDIENTES', int, [cod_documento])
            return num_lineas if num_lineas is not None else 0
        except Exception as e:
            logger.error(f"Error en SPGET_NUMLINEASPENDIENTES: {e}", exc_info=True)
            raise Exception(f"Error al obtener número de líneas pendientes: {str(e)}")
        finally:
            if cursor:
                cursor.close()
            if connection:
                connection.close()

    @staticmethod
    def get_articulo_para_preparar(cod_documento: int, cod_ubicacion: int = 0,
                                   numero_orden: int = 0, tipo_avance: int = 0,
                                   cod_ubicacion_actual: int = 0, cod_articulo: int = 0,
                                   cant_solicitada: float = None) -> dict | None:
        """
        Llama a SPPRP_ARTICULOSPARAPREPARAR (que internamente llama a SPPRP_INSTMP_ARTPARAPREPARAR).
        tipo_avance: 0 = siguiente, 1 = anterior
        Devuelve None si no hay más líneas.
        NOTA: el REF CURSOR debe ser un cursor nativo de oracledb, no el AuditCursor wrapper.
        """
        connection = None
        cursor = None
        try:
            connection = OracleDatabase.get_connection()
            cursor = connection.cursor()

            # Si la conexión está envuelta en AuditConnection, necesitamos un cursor nativo
            # para pasarlo como parámetro OUT (REF CURSOR), ya que oracledb no acepta AuditCursor
            if hasattr(connection, 'raw_cursor'):
                ref_cursor = connection.raw_cursor()
            else:
                ref_cursor = connection.cursor()

            cursor.callproc('GSM.SPPRP_ARTICULOSPARAPREPARAR', [
                cod_documento,
                cod_ubicacion if cod_ubicacion else None,
                numero_orden,
                tipo_avance,
                cod_ubicacion_actual if cod_ubicacion_actual else 1,
                cod_articulo if cod_articulo else None,
                cant_solicitada if cant_solicitada else 999999999,
                ref_cursor
            ])

            if ref_cursor.description is None:
                return None

            cols = [d[0].lower() for d in ref_cursor.description]
            row = ref_cursor.fetchone()
            if not row:
                return None

            result = dict(zip(cols, row))
            for k, v in result.items():
                if hasattr(v, 'strftime'):
                    result[k] = v.strftime('%Y-%m-%d')

            if result.get('codubicacion'):
                try:
                    cursor.execute("SELECT NOMBRECORTO FROM TMST_UBICACIONES WHERE CODUBICACION = :1", [result['codubicacion']])
                    ubi_row = cursor.fetchone()
                    if ubi_row:
                        result['nombreubicacion'] = ubi_row[0]
                except Exception as ex:
                    logger.warning(f"No se pudo obtener nombrecorto de ubicacion: {ex}")

            return result
        except Exception as e:
            logger.error(f"Error en SPPRP_ARTICULOSPARAPREPARAR: {e}", exc_info=True)
            raise Exception(f"Error al obtener artículo para preparar: {str(e)}")
        finally:
            if cursor:
                cursor.close()
            if connection:
                connection.close()

    @staticmethod
    def get_info_articulo(cod_articulo: int) -> dict:
        """
        Obtiene flags de trazabilidad y caducidad del artículo.
        prm_trazabilidad != 0 => requiere lote
        gestionarcaducidad != 0 => requiere/muestra fecha caducidad
        """
        connection = None
        cursor = None
        try:
            connection = OracleDatabase.get_connection()
            cursor = connection.cursor()
            cursor.execute("""
                SELECT PRM_TRAZABILIDAD, GESTIONARCADUCIDAD, MARGENCADUCIDAD,
                       DIASLIMITEFECHACADUCIDAD
                FROM TMST_ARTICULOS
                WHERE CODARTICULO = :cod_art
            """, {"cod_art": cod_articulo})
            row = cursor.fetchone()
            if not row:
                return {"prm_trazabilidad": 0, "gestionar_caducidad": 0,
                        "margen_caducidad": 0, "dias_limite_caducidad": 0}
            return {
                "prm_trazabilidad":       int(row[0]) if row[0] is not None else 0,
                "gestionar_caducidad":    int(row[1]) if row[1] is not None else 0,
                "margen_caducidad":       int(row[2]) if row[2] is not None else 0,
                "dias_limite_caducidad":  int(row[3]) if row[3] is not None else 0,
            }
        except Exception as e:
            logger.error(f"Error en get_info_articulo: {e}", exc_info=True)
            raise Exception(f"Error al obtener info artículo: {str(e)}")
        finally:
            if cursor:
                cursor.close()
            if connection:
                connection.close()

    @staticmethod
    def get_unids_preparadas(cod_documento: int, num_linea: int, cod_ubicacion: int,
                             cod_articulo: int, fecha_caducidad, numero_lote: str,
                             cod_terminal: int) -> dict:
        """
        Llama a SPPRP_GET_UNIDSPREPDOCXUBIC para saber cuántas unidades ya hay
        preparadas en el terminal para esta combinación doc/línea/artículo/ubicación.
        Devuelve: unidades_preparadas, unidades_preparadas_misma_fecha,
                  peso_preparado, peso_preparado_misma_fecha
        """
        connection = None
        cursor = None
        try:
            connection = OracleDatabase.get_connection()
            cursor = connection.cursor()

            fecha_cad_val = None
            if fecha_caducidad:
                from datetime import datetime
                if isinstance(fecha_caducidad, str):
                    try:
                        fecha_cad_val = datetime.strptime(fecha_caducidad, '%Y-%m-%d').date()
                    except ValueError:
                        fecha_cad_val = None
                else:
                    fecha_cad_val = fecha_caducidad

            import oracledb
            p_unidades_preparadas          = cursor.var(oracledb.NUMBER)
            p_unidades_preparadas_misma    = cursor.var(oracledb.NUMBER)
            p_peso_preparado               = cursor.var(oracledb.NUMBER)
            p_peso_preparado_misma         = cursor.var(oracledb.NUMBER)

            cursor.callproc('GSM.SPPRP_GET_UNIDSPREPDOCXUBIC', [
                cod_documento,              # P_CODDOCUMENTO
                num_linea,                  # P_NUMLINEA
                cod_ubicacion,              # P_CODUBICACION
                cod_articulo,               # P_CODARTICULO
                fecha_cad_val,              # P_FECHACADUCIDAD
                numero_lote,                # P_NUMEROLOTE
                cod_terminal,               # P_CODTERMINAL
                p_unidades_preparadas,      # P_UNIDADESPREPARADAS (OUT)
                p_unidades_preparadas_misma,# P_UNIDADESPREPARADASMISMAFECHA (OUT)
                p_peso_preparado,           # P_PESOPREPEPARADO (OUT)
                p_peso_preparado_misma,     # P_PESOPREPARADOMISMAFECHA (OUT)
            ])

            return {
                "unidades_preparadas":           float(p_unidades_preparadas.getvalue() or 0),
                "unidades_preparadas_misma_fecha": float(p_unidades_preparadas_misma.getvalue() or 0),
                "peso_preparado":                float(p_peso_preparado.getvalue() or 0),
                "peso_preparado_misma_fecha":    float(p_peso_preparado_misma.getvalue() or 0),
            }
        except Exception as e:
            logger.error(f"Error en SPPRP_GET_UNIDSPREPDOCXUBIC: {e}", exc_info=True)
            raise Exception(f"Error al obtener unidades preparadas: {str(e)}")
        finally:
            if cursor:
                cursor.close()
            if connection:
                connection.close()

    @staticmethod
    def cargar_mercancia(cod_ubicacion_origen: int, cod_articulo: int,
                         fecha_caducidad, cod_terminal: int,
                         unidades: float, cod_documento: int, num_linea: int,
                         numero_lote: str = None, cod_tipo_dato_maestro: int = None,
                         cod_dato_maestro: int = None,
                         tipo_codigo_introducido: int = None,
                         cod_facturacion: str = None) -> None:
        """
        Registra la mercancía preparada de una línea llamando a SPPRP_CARGARMERCANCIATERMINAL.
        """
        connection = None
        cursor = None
        try:
            connection = OracleDatabase.get_connection()
            cursor = connection.cursor()
            
            fecha_cad_val = None
            if fecha_caducidad:
                from datetime import datetime
                if isinstance(fecha_caducidad, str):
                    try:
                        fecha_cad_val = datetime.strptime(fecha_caducidad, '%Y-%m-%d').date()
                    except ValueError:
                        fecha_cad_val = None
                else:
                    fecha_cad_val = fecha_caducidad

            # Buscar si el terminal ya tiene una ubicación asignada para esta operación y documento
            cod_ubic_terminal = None
            try:
                cursor.execute("""
                    SELECT CODUBICACION 
                    FROM TMST_UBICACIONESTERMINAL 
                    WHERE CODTERMINAL = :1 
                      AND CODOPERACIONTERMINAL = :2 
                      AND CODDOCUMENTO = :3
                """, [cod_terminal, 1, cod_documento])
                row_ubic = cursor.fetchone()
                if row_ubic:
                    cod_ubic_terminal = row_ubic[0]
            except Exception as ex:
                logger.warning(f"No se pudo obtener la ubicación del terminal: {ex}")

            cod_fact_val = cod_facturacion
            if not tipo_codigo_introducido or tipo_codigo_introducido == 0:
                tipo_codigo_introducido = 0
                if not cod_fact_val:
                    try:
                        cursor.execute("SELECT CODARTICULOAPLICACION FROM TMST_ARTICULOS WHERE CODARTICULO = :1", [cod_articulo])
                        row_art = cursor.fetchone()
                        if row_art and row_art[0]:
                            cod_fact_val = str(row_art[0])
                    except Exception as ex:
                        logger.warning(f"No se pudo obtener CODARTICULOAPLICACION para el interno: {ex}")

            cursor.callproc('GSM.SPPRP_CARGARMERCANCIATERMINAL', [
                cod_ubicacion_origen,       # P_CODUBICACIONORIGEN
                cod_articulo,               # P_CODARTICULO
                fecha_cad_val,              # P_FECHACADUCIDAD
                cod_terminal,               # P_CODTERMINAL
                1,                          # P_CODOPERACIONTERMINAL
                unidades,                   # P_UNIDADES
                0,                          # P_PESO
                None,                       # P_CODPALET
                cod_documento,              # P_CODDOCUMENTO
                num_linea,                  # P_NUMLINEA
                cod_fact_val,               # P_CODFACTURACION
                numero_lote,                # P_NUMEROLOTE
                None,                       # P_CODORDENREUBICACION
                '',                         # P_CADCODNUMEROSDESERIE
                cod_tipo_dato_maestro,      # P_CODTIPODATOMAESTRO
                cod_dato_maestro,           # P_CODDATOMAESTRO
                tipo_codigo_introducido,    # P_TIPOCODIGOINTRODUCIDO
                cod_ubic_terminal,          # P_CODUBICACIONTERMINAL
            ])

            # Obtener CODHUECO para registrar el recorrido en la preparación
            cod_hueco_origen = None
            try:
                cursor.execute("SELECT CODHUECO FROM TMST_UBICACIONES WHERE CODUBICACION = :1", [cod_ubicacion_origen])
                row_hueco = cursor.fetchone()
                if row_hueco:
                    cod_hueco_origen = row_hueco[0]
            except Exception as ex:
                logger.warning(f"No se pudo obtener CODHUECO para SPPRP_SAVERECORRIDOPREPARACION: {ex}")

            # Registrar recorrido en preparación de pedidos
            cursor.callproc('GSM.SPPRP_SAVERECORRIDOPREPARACION', [
                cod_documento,         # P_CODDOCUMENTO
                num_linea,             # P_NUMLINEA
                cod_terminal,          # P_CODTERMINAL
                cod_hueco_origen,      # P_CODHUECO
                cod_ubicacion_origen,  # P_CODUBICACION
                cod_articulo,          # P_CODARTICULO
                fecha_cad_val,         # P_FECHACADUCIDAD
                numero_lote,           # P_NUMEROLOTE
                unidades,              # P_CANTPREPARADA
                0,                     # P_PESO
                0,                     # P_CANTDEVUELTA
                '',                    # P_CADCODNUMEROSDESERIE
            ])

            # Actualizar la línea del documento cliente con la cantidad preparada total y datos de identificación
            if cod_documento and num_linea:
                cant_preparada_total = 0
                try:
                    cursor.execute("""
                        SELECT NVL(SUM(CantPreparada) - SUM(CantDevuelta), 0)
                        FROM TPRP_RecorridoPreparacionDoc
                        WHERE CodDocumento = :1 AND NumLinea = :2
                    """, [cod_documento, num_linea])
                    row_tot = cursor.fetchone()
                    if row_tot and row_tot[0] is not None:
                        cant_preparada_total = float(row_tot[0])
                except Exception as ex_tot:
                    logger.warning(f"No se pudo calcular la suma de CantPreparada en TPRP_RecorridoPreparacionDoc: {ex_tot}")

                cursor.execute("""
                    UPDATE TMST_LineasDocumentoCliente
                    SET CantPreparada = :cant_prep,
                        CantSegundaUnidadPreparada = NVL(CantSegundaUnidadPreparada, 0),
                        CodTipoUnidad = NVL(CodTipoUnidad, 1),
                        FactorConversionTipoUnidad = NVL(FactorConversionTipoUnidad, 1),
                        TipoConvFactConvSegunUnidadAlm = NVL(TipoConvFactConvSegunUnidadAlm, 0),
                        FactorConverSegunUnidadAlmacen = NVL(FactorConverSegunUnidadAlmacen, 0),
                        TipoCodigoIntroducido = :tipo_cod,
                        CodigoIntroducido = :cod_intro,
                        DespreciarPendiente = NVL(DespreciarPendiente, 0)
                    WHERE CodDocumento = :cod_doc AND NumLinea = :num_linea
                """, {
                    "cant_prep": cant_preparada_total,
                    "tipo_cod": tipo_codigo_introducido if tipo_codigo_introducido is not None else 0,
                    "cod_intro": cod_fact_val or '',
                    "cod_doc": cod_documento,
                    "num_linea": num_linea
                })

            connection.commit()
        except Exception as e:
            logger.error(f"Error en SPPRP_CARGARMERCANCIATERMINAL: {e}", exc_info=True)
            if connection:
                connection.rollback()
            raise Exception(f"Error al cargar mercancía: {str(e)}")
        finally:
            if cursor:
                cursor.close()
            if connection:
                connection.close()
