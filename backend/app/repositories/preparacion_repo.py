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
        try:
            with OracleDatabase.get_cursor(commit=True) as cursor:
                result = cursor.callfunc('GSM.SPGET_DOCUMENTOPARAPREPARAR', oracledb.NUMBER, [cod_terminal])
                return int(result) if result is not None else -1
        except Exception as e:
            logger.error(f"Error en SPGET_DOCUMENTOPARAPREPARAR: {e}", exc_info=True)
            raise Exception(f"Error al obtener documento para preparar: {str(e)}")

    @staticmethod
    def get_cabecera_documento(cod_documento: int) -> dict:
        """
        Obtiene la cabecera del documento de VMST_DOCCLIENTESVISIBLES
        y el total de cajas/volumen teórico.
        """
        try:
            with OracleDatabase.get_cursor() as cursor:
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

    @staticmethod
    def get_permisos_preparacion(cod_operador: int) -> dict:
        """
        Obtiene los parámetros PRM_SOLICITAR* y PRM_PUEDESERVIRMAS del operario.
        Valores: -1 = activo, 0 = desactivado.
        """
        try:
            with OracleDatabase.get_cursor() as cursor:
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

    @staticmethod
    def validar_ubicacion(cod_hueco: str, cod_ubicacion_esperada: int = None) -> dict:
        """
        Valida que el texto escaneado corresponda a una ubicación.
        Si se pasa cod_ubicacion_esperada, se verifica si el texto coincide con 
        la etiqueta de la ubicación esperada o su hueco padre.
        """
        try:
            with OracleDatabase.get_cursor() as cursor:
                if cod_ubicacion_esperada:
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

    @staticmethod
    def get_stock_lotes(cod_ubicacion: int, cod_articulo: int) -> list:
        """
        Devuelve los lotes/caducidades disponibles de un artículo en una ubicación,
        filtrando caducados (FECHACADUCIDAD < HOY) y solo registros con STOCK > 0.
        Orden: FECHACADUCIDAD ASC NULLS LAST (FIFO por caducidad).
        """
        try:
            with OracleDatabase.get_cursor() as cursor:
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

    @staticmethod
    def get_lineas_pendientes(cod_documento: int) -> list:
        """
        Devuelve todas las líneas pendientes del documento (cantsolicitada > cantpreparada + cantanulada)
        con info de trazabilidad/caducidad del artículo, para mostrar la lista de selección.
        """
        try:
            with OracleDatabase.get_cursor() as cursor:
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

    @staticmethod
    def get_num_lineas_pendientes(cod_documento: int) -> int:
        """
        Devuelve el número de líneas pendientes llamando a SPGET_NUMLINEASPENDIENTES.
        """
        try:
            with OracleDatabase.get_cursor() as cursor:
                num_lineas = cursor.callfunc('GSM.SPGET_NUMLINEASPENDIENTES', int, [cod_documento])
                return num_lineas if num_lineas is not None else 0
        except Exception as e:
            logger.error(f"Error en SPGET_NUMLINEASPENDIENTES: {e}", exc_info=True)
            raise Exception(f"Error al obtener número de líneas pendientes: {str(e)}")

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
        try:
            with OracleDatabase.get_cursor() as cursor:
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
        try:
            with OracleDatabase.get_cursor() as cursor:
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

    @staticmethod
    def cargar_mercancia(cod_ubicacion_origen: int, cod_articulo: int,
                         fecha_caducidad, cod_terminal: int,
                         unidades: float, cod_documento: int, num_linea: int,
                         numero_lote: str = None, cod_tipo_dato_maestro: int = None,
                         cod_dato_maestro: int = None,
                         tipo_codigo_introducido: int = None,
                         cod_facturacion: str = None,
                         cod_operacion_terminal: int = 1) -> None:
        """
        Registra la mercancía preparada de una línea llamando a SPPRP_CARGARMERCANCIATERMINAL.
        """
        try:
            with OracleDatabase.get_cursor(commit=True) as cursor:
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
                    """, [cod_terminal, cod_operacion_terminal, cod_documento])
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
                    cod_operacion_terminal,     # P_CODOPERACIONTERMINAL
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
        except Exception as e:
            logger.error(f"Error en SPPRP_CARGARMERCANCIATERMINAL: {e}", exc_info=True)
            raise Exception(f"Error al cargar mercancía: {str(e)}")

    @staticmethod
    def get_pedido_directo_en_curso(cod_operador: int, cod_terminal: int) -> dict:
        """
        Busca si el operador/terminal tiene un pedido directo en curso (CODTIPOMOVIMIENTO=10, CODESTADODOCUMENTO=3).
        """
        try:
            with OracleDatabase.get_cursor() as cursor:
                query = """
                    SELECT D.CODDOCUMENTO, D.NUMDOCUMENTO, D.SERIE, 
                           DC.CODCLIENTE, C.CODCLIENTEAPLICACION, C.RAZONSOCIAL, C.CIF, C.NOMBRECOMERCIAL, C.DIRECCION, C.POBLACION, DC.OBSERVACIONES
                    FROM GSM.TMST_CODDOCUMENTOS D
                    JOIN GSM.TMST_DOCUMENTOSCLIENTES DC ON D.CODDOCUMENTO = DC.CODDOCUMENTO
                    LEFT JOIN GSM.TMST_CLIENTES C ON DC.CODCLIENTE = C.CODCLIENTE
                    WHERE D.CODTIPOMOVIMIENTO = 10
                      AND D.CODESTADODOCUMENTO = 3
                      AND D.ULTIMOCODOPERADOR = :1
                      AND DC.CODTERMINAL = :2
                      AND ROWNUM <= 1
                """
                cursor.execute(query, [cod_operador, cod_terminal])
                row = cursor.fetchone()
                if row:
                    return {
                        "cod_documento": row[0],
                        "num_documento": row[1],
                        "serie": row[2] or '',
                        "cliente": {
                            "CODCLIENTE": row[3],
                            "CODCLIENTEAPLICACION": row[4],
                            "RAZONSOCIAL": row[5] or '',
                            "CIF": row[6] or '',
                            "NOMBRECOMERCIAL": row[7] or '',
                            "DIRECCION": row[8] or '',
                            "POBLACION": row[9] or ''
                        } if row[3] else None,
                        "observaciones": row[10] or ''
                    }
                return None
        except Exception as e:
            logger.error(f"Error al obtener pedido directo en curso para op {cod_operador} term {cod_terminal}: {e}", exc_info=True)
            raise e

    @staticmethod
    def crear_cabecera_pedido_directo(payload: dict) -> dict:
        """
        Crea la cabecera de un Pedido Directo (CODTIPOMOVIMIENTO = 10):
        1. Consulta el CODCONTADOR asociado al CODTIPOMOVIMIENTO = 10 en TMST_TIPOMOVIMIENTO.
        2. Incrementa y obtiene el NUMDOCUMENTO en TSYS_CONTADORES.
        3. Obtiene la serie del parámetro 1767 o fallback.
        4. Inserta en TMST_CODDOCUMENTOS y TMST_DOCUMENTOSCLIENTES con CODESTADODOCUMENTO = 3.
        """
        try:
            with OracleDatabase.get_cursor(commit=True) as cursor:
                # 1. Obtener CODCONTADOR del tipo movimiento 10
                cursor.execute("SELECT CODCONTADOR FROM GSM.TMST_TIPOMOVIMIENTO WHERE CODTIPOMOVIMIENTO = 10")
                row_cont = cursor.fetchone()
                cod_contador = int(row_cont[0]) if row_cont and row_cont[0] is not None else 2

                # 2. Obtener siguiente número de documento
                out_val = cursor.var(oracledb.NUMBER)
                cursor.execute(
                    "UPDATE GSM.TSYS_CONTADORES SET VALOR = VALOR + 1 WHERE CODCONTADOR = :1 RETURNING VALOR INTO :2",
                    [cod_contador, out_val]
                )
                val_res = out_val.getvalue()
                num_documento = int(val_res[0] if isinstance(val_res, list) else val_res)

                # 3. Serie
                cursor.execute("SELECT VALOR FROM GSM.TSYS_PARAMETROSXAMBITO WHERE CODPARAMETRO = 1767")
                row_serie = cursor.fetchone()
                serie = row_serie[0] if row_serie and row_serie[0] else 'A'

                # CODEMPRESA mínimo
                cursor.execute("SELECT MIN(CODEMPRESA) FROM GSM.TMST_EMPRESAS")
                row_emp = cursor.fetchone()
                cod_empresa = int(row_emp[0]) if row_emp and row_emp[0] else 1

                cod_operador = int(payload.get('CODOPERADOR', 1))
                cod_terminal = int(payload.get('CODTERMINAL', 1))
                cod_cliente = payload.get('CODCLIENTE')
                cif = payload.get('CIF')
                razonsocial = payload.get('RAZONSOCIAL')
                nombrecomercial = payload.get('NOMBRECOMERCIAL')
                direccion = payload.get('DIRECCION')
                poblacion = payload.get('POBLACION')
                observaciones = payload.get('OBSERVACIONES')
                fecha_doc = payload.get('FECHADOCUMENTO')

                from datetime import datetime
                if fecha_doc:
                    try:
                        fecha_doc_date = datetime.strptime(fecha_doc, '%Y-%m-%d')
                        fecha_doc_val = datetime.combine(fecha_doc_date.date(), datetime.now().time())
                    except ValueError:
                        fecha_doc_val = datetime.now()
                else:
                    fecha_doc_val = datetime.now()

                cod_comercial = None
                if cod_cliente:
                    cursor.execute("SELECT CODVENDEDOR FROM GSM.TMST_CLIENTES WHERE CODCLIENTE = :1", [cod_cliente])
                    row_vend = cursor.fetchone()
                    cod_comercial = row_vend[0] if row_vend and row_vend[0] is not None else None

                # 4. Insertar en TMST_CODDOCUMENTOS
                cod_doc_var = cursor.var(oracledb.NUMBER)
                query_coddoc = """
                    INSERT INTO GSM.TMST_CODDOCUMENTOS 
                    (CODDOCUMENTO, CODEMPRESA, NUMDOCUMENTO, EJERCICIO, SERIE, CODTIPODOCUMENTO, CODTIPOMOVIMIENTO, CODESTADODOCUMENTO, CODPRIORIDAD, ULTIMOCODCONCEPTOESTADISTICO, ULTIMOCODOPERADOR, CODTIPOMOVIMIENTOANTERIOR, CODZONAALMACEN, CODDOCUMENTOORIGEN, CODDOCUMENTOPADRE)
                    VALUES (0, :1, :2, EXTRACT(YEAR FROM SYSDATE), :3, 2, 10, 3, 2, 31, :4, 0, -1, 0, 0)
                    RETURNING CODDOCUMENTO INTO :5
                """
                cursor.execute(query_coddoc, [cod_empresa, num_documento, serie, cod_operador, cod_doc_var])
                cod_res = cod_doc_var.getvalue()
                cod_documento = int(cod_res[0] if isinstance(cod_res, list) else cod_res)

                # 5. Insertar en TMST_DOCUMENTOSCLIENTES
                query_doccli = """
                    INSERT INTO GSM.TMST_DOCUMENTOSCLIENTES
                    (CODDOCUMENTO, CODCLIENTE, CIF, RAZONSOCIAL, NOMBRECOMERCIAL, DIRECCION, POBLACION, FECHADOCUMENTO, FECHAINICIOPREPARACION, CODOPERADOR, CODTERMINAL, OBSERVACIONES, CODCOMERCIAL, ORIGEN, NUMBULTOS, FUERCEB)
                    VALUES (:1, :2, :3, :4, :5, :6, :7, :8, SYSDATE, :9, :10, :11, :12, 0, 0, 0)
                """
                cursor.execute(query_doccli, [
                    cod_documento, cod_cliente, cif, razonsocial, nombrecomercial,
                    direccion, poblacion, fecha_doc_val, cod_operador, cod_terminal, observaciones, cod_comercial
                ])

                logger.info(f"Cabecera de Pedido Directo creada con CODDOCUMENTO: {cod_documento}, NUMDOCUMENTO: {num_documento}")
                return {
                    "cod_documento": cod_documento,
                    "num_documento": num_documento,
                    "serie": serie
                }
        except Exception as e:
            logger.error(f"Error al crear cabecera de pedido directo: {e}", exc_info=True)
            raise e

    @staticmethod
    def grabar_linea_pedido_directo(payload: dict) -> dict:
        """
        Graba una línea de un pedido directo.
        """
        try:
            with OracleDatabase.get_cursor(commit=True) as cursor:
                cod_documento = int(payload['CODDOCUMENTO'])
                cod_articulo = int(payload['CODARTICULO'])
                unidades = float(payload['UNIDADES'])
                num_lote = payload.get('NUMEROLOTE')
                fecha_caducidad = payload.get('FECHACADUCIDAD')
                cod_ubicacion_origen = int(payload['CODUBICACION'])
                cod_terminal = int(payload.get('CODTERMINAL', 1))
                cod_operador = int(payload.get('CODOPERADOR', 1))
                tipo_codigo_intro = payload.get('TIPOCODIGOINTRODUCIDO', 0)
                if tipo_codigo_intro is not None:
                    tipo_codigo_intro = int(tipo_codigo_intro)
                codigo_intro = payload.get('CODIGOINTRODUCIDO', '')
                cod_facturacion = payload.get('EAN', codigo_intro)

                cursor.execute(
                    "SELECT CODLINEADOCUMENTOCLIENTE, NUMLINEA FROM GSM.TMST_LINEASDOCUMENTOCLIENTE WHERE CODDOCUMENTO = :1 AND CODARTICULO = :2",
                    [cod_documento, cod_articulo]
                )
                row_linea = cursor.fetchone()
                if row_linea:
                    cod_linea = row_linea[0]
                    num_linea = int(row_linea[1])
                    # No modificamos CANTSOLICITADA; cargar_mercancia se encargará de actualizar CANTPREPARADA
                else:
                    cursor.execute(
                        "SELECT NVL(MAX(NUMLINEA), 0) + 1 FROM GSM.TMST_LINEASDOCUMENTOCLIENTE WHERE CODDOCUMENTO = :1",
                        [cod_documento]
                    )
                    num_linea = int(cursor.fetchone()[0])
                    cursor.execute("SELECT NOMBREARTICULO FROM GSM.TMST_ARTICULOS WHERE CODARTICULO = :1", [cod_articulo])
                    row_art = cursor.fetchone()
                    nombre_articulo = row_art[0] if row_art and row_art[0] else ''

                    query_insert = """
                        INSERT INTO GSM.TMST_LINEASDOCUMENTOCLIENTE
                        (CODLINEADOCUMENTOCLIENTE, CODDOCUMENTO, NUMLINEA, CODARTICULO, NOMBREARTICULO, CANTSOLICITADA, CANTSOLICITADAORIGINAL, CANTPREPARADA, PRECIO, REPASADA, PRM_VALORADO, DESPRECIARPENDIENTE, CODTIPOUNIDAD, FACTORCONVERSIONTIPOUNIDAD, NUMLINEADOCUMENTOPADRE, CANTTIPOUNIDAD, CANTSEGUNDAUNIDADALMACEN, TIPOCONVFACTCONVSEGUNUNIDADALM, FACTORCONVERSEGUNUNIDADALMACEN, CANTSEGUNDAUNIDADPREPARADA, TIPOCODIGOINTRODUCIDO, CODIGOINTRODUCIDO)
                        VALUES (GSM.SQ_CODLINEADOCUMENTOCLIENTE.NEXTVAL, :1, :2, :3, :4, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0.0, 0.0, 0, 0.0, 0.0, :5, :6)
                    """
                    cursor.execute(query_insert, [cod_documento, num_linea, cod_articulo, nombre_articulo, tipo_codigo_intro, codigo_intro])

            PreparacionRepository.cargar_mercancia(
                cod_ubicacion_origen=cod_ubicacion_origen,
                cod_articulo=cod_articulo,
                fecha_caducidad=fecha_caducidad,
                cod_terminal=cod_terminal,
                unidades=unidades,
                cod_documento=cod_documento,
                num_linea=num_linea,
                numero_lote=num_lote,
                cod_tipo_dato_maestro=None,
                cod_dato_maestro=None,
                tipo_codigo_introducido=tipo_codigo_intro,
                cod_facturacion=cod_facturacion,
                cod_operacion_terminal=6
            )

            return {
                "status": "success",
                "num_linea": num_linea,
                "cod_documento": cod_documento
            }
        except Exception as e:
            logger.error(f"Error al grabar línea de pedido directo: {e}", exc_info=True)
            raise e

    @staticmethod
    def get_lineas_pedido_directo(cod_documento: int) -> list:
        """
        Obtiene las líneas ya preparadas de un pedido directo.
        """
        try:
            with OracleDatabase.get_cursor() as cursor:
                query = """
                    SELECT A.CODARTICULOAPLICACION, L.NOMBREARTICULO, 
                           R.CANTPREPARADA, LOT.NUMEROLOTE, TO_CHAR(R.FECHACADUCIDAD, 'YYYY-MM-DD'), NVL(U.CODETIQUETA, U.NOMBRECORTO)
                    FROM GSM.TPRP_RECORRIDOPREPARACIONDOC R
                    JOIN GSM.TMST_LINEASDOCUMENTOCLIENTE L ON R.CODDOCUMENTO = L.CODDOCUMENTO AND R.NUMLINEA = L.NUMLINEA
                    LEFT JOIN GSM.TMST_ARTICULOS A ON R.CODARTICULO = A.CODARTICULO
                    LEFT JOIN GSM.TMST_UBICACIONES U ON R.CODUBICACION = U.CODUBICACION
                    LEFT JOIN GSM.TMST_NUMEROSLOTESPROVEEDORES LOT ON R.CODNUMEROLOTE = LOT.CODNUMEROLOTE
                    WHERE R.CODDOCUMENTO = :1
                    ORDER BY R.NUMLINEA DESC
                """
                cursor.execute(query, [cod_documento])
                results = []
                for row in cursor.fetchall():
                    results.append({
                        "cod_articulo_aplicacion": row[0] or "",
                        "nombre": row[1] or "",
                        "unidades": row[2] or 0,
                        "lote": row[3] or "",
                        "caducidad": row[4] or "",
                        "ubicacion": row[5] or ""
                    })
                return results
        except Exception as e:
            logger.error(f"Error al obtener líneas de pedido directo {cod_documento}: {e}", exc_info=True)
            raise e

