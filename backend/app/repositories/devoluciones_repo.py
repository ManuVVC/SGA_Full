import logging
import datetime
import oracledb
from ..database import OracleDatabase

logger = logging.getLogger(__name__)


class DevolucionesRepository:
    @staticmethod
    def get_clientes(filtro: str) -> list:
        """
        Busca clientes activos que coincidan con el filtro en código, CIF, razón social o nombre comercial.
        """
        connection = None
        cursor = None
        try:
            connection = OracleDatabase.get_connection()
            cursor = connection.cursor()

            query = """
                SELECT CODCLIENTE, CODCLIENTEAPLICACION, CIF, RAZONSOCIAL, NOMBRECOMERCIAL, DIRECCION, POBLACION
                FROM GSM.TMST_CLIENTES
                WHERE FECHADESCATALOGACION IS NULL
                  AND (
                      UPPER(CODCLIENTEAPLICACION) LIKE :filtro
                      OR UPPER(CIF) LIKE :filtro
                      OR UPPER(RAZONSOCIAL) LIKE :filtro
                      OR UPPER(NOMBRECOMERCIAL) LIKE :filtro
                  )
                  AND ROWNUM <= 50
            """
            search_pattern = f"%{filtro.upper()}%"
            cursor.execute(query, filtro=search_pattern)

            columns = [col[0].upper() for col in cursor.description]
            results = []
            for row in cursor.fetchall():
                results.append(dict(zip(columns, row)))

            return results
        except Exception as e:
            logger.error(f"Error al obtener clientes con filtro '{filtro}': {e}", exc_info=True)
            raise e
        finally:
            if cursor:
                try: cursor.close()
                except: pass
            if connection:
                try: connection.close()
                except: pass

    @staticmethod
    def get_parametros_devolucion() -> dict:
        """
        Obtiene los parámetros de base de datos necesarios para configurar la devolución.
        """
        connection = None
        cursor = None
        try:
            connection = OracleDatabase.get_connection()
            cursor = connection.cursor()

            # Parámetros:
            # 1768 = Serie de facturación/devolución
            # 1636 = Tipo ubicación devoluciones (0=ubicación por defecto, resto=pedir ubicación)
            # 1637 = Código ubicación fija de devolución
            cursor.execute(
                "SELECT CODPARAMETRO, VALOR FROM GSM.TSYS_PARAMETROSXAMBITO WHERE CODPARAMETRO IN (1768, 1636, 1637)"
            )
            params = {str(row[0]): row[1] for row in cursor.fetchall()}
            return params
        except Exception as e:
            logger.error(f"Error al obtener parámetros de devolución: {e}", exc_info=True)
            raise e
        finally:
            if cursor:
                try: cursor.close()
                except: pass
            if connection:
                try: connection.close()
                except: pass

    @staticmethod
    def crear_devolucion_cabecera(payload: dict) -> int:
        """
        Crea la cabecera de la devolución del cliente:
        1. Incrementa el contador en TSYS_CONTADORES (codcontador = 1).
        2. Obtiene la serie de devoluciones (parámetro 1768).
        3. Inserta en TMST_CODDOCUMENTOS y obtiene el CODDOCUMENTO autogenerado.
        4. Inserta en TMST_DOCUMENTOSCLIENTES.
        """
        connection = None
        cursor = None
        try:
            connection = OracleDatabase.get_connection()
            cursor = connection.cursor()

            # 1. Obtener siguiente número de documento usando CODCONTADOR = 1
            out_val = cursor.var(int)
            cursor.execute(
                "UPDATE GSM.TSYS_CONTADORES SET VALOR = VALOR + 1 WHERE CODCONTADOR = 1 RETURNING VALOR INTO :1",
                [out_val]
            )
            num_documento = out_val.getvalue()[0]

            # 2. Obtener la serie de devoluciones (parámetro 1768)
            cursor.execute("SELECT VALOR FROM GSM.TSYS_PARAMETROSXAMBITO WHERE CODPARAMETRO = 1768")
            row_serie = cursor.fetchone()
            serie = row_serie[0] if row_serie and row_serie[0] else None

            # Obtener el CODEMPRESA mínimo
            cursor.execute("SELECT MIN(CODEMPRESA) FROM GSM.TMST_EMPRESAS")
            row_emp = cursor.fetchone()
            cod_empresa = row_emp[0] if row_emp and row_emp[0] else 1

            cod_operador = payload.get('CODOPERADOR', 1)
            cod_terminal = payload.get('CODTERMINAL', 1)
            cod_cliente = payload.get('CODCLIENTE')
            cif = payload.get('CIF')
            razonsocial = payload.get('RAZONSOCIAL')
            nombrecomercial = payload.get('NOMBRECOMERCIAL')
            direccion = payload.get('DIRECCION')
            poblacion = payload.get('POBLACION')
            observaciones = payload.get('OBSERVACIONES')
            fecha_doc = payload.get('FECHADOCUMENTO')

            if fecha_doc:
                fecha_doc_date = datetime.datetime.strptime(fecha_doc, '%Y-%m-%d')
                now_time = datetime.datetime.now().time()
                fecha_doc_val = datetime.datetime.combine(fecha_doc_date.date(), now_time)
            else:
                fecha_doc_val = datetime.datetime.now()

            # Obtener CODVENDEDOR del cliente para usarlo como CODCOMERCIAL
            cursor.execute("SELECT CODVENDEDOR FROM GSM.TMST_CLIENTES WHERE CODCLIENTE = :1", [cod_cliente])
            row_vend = cursor.fetchone()
            cod_comercial = row_vend[0] if row_vend and row_vend[0] is not None else None

            # 3. Insertar en TMST_CODDOCUMENTOS
            # Para Devoluciones de Cliente: CODTIPODOCUMENTO = 7, CODTIPOMOVIMIENTO = 32, CODESTADODOCUMENTO = 27
            # Nuevos campos: CODTIPOMOVIMIENTOANTERIOR = 0, CODZONAALMACEN = -1, CODDOCUMENTOORIGEN = 0, CODDOCUMENTOPADRE = 0
            query_coddoc = """
                INSERT INTO GSM.TMST_CODDOCUMENTOS 
                (CODDOCUMENTO, CODEMPRESA, NUMDOCUMENTO, EJERCICIO, SERIE, CODTIPODOCUMENTO, CODTIPOMOVIMIENTO, CODESTADODOCUMENTO, CODPRIORIDAD, ULTIMOCODCONCEPTOESTADISTICO, ULTIMOCODOPERADOR, CODTIPOMOVIMIENTOANTERIOR, CODZONAALMACEN, CODDOCUMENTOORIGEN, CODDOCUMENTOPADRE)
                VALUES (0, :1, :2, EXTRACT(YEAR FROM SYSDATE), :3, 7, 32, 27, 2, 31, :4, 0, -1, 0, 0)
                RETURNING CODDOCUMENTO INTO :5
            """
            cod_doc_var = cursor.var(int)
            cursor.execute(query_coddoc, [cod_empresa, num_documento, serie, cod_operador, cod_doc_var])
            cod_documento = cod_doc_var.getvalue()[0]

            # 4. Insertar en TMST_DOCUMENTOSCLIENTES
            # Nuevos campos: CODCOMERCIAL = CODVENDEDOR, ORIGEN = 0, NUMBULTOS = 0, FUERCEB = 0
            query_doccli = """
                INSERT INTO GSM.TMST_DOCUMENTOSCLIENTES
                (CODDOCUMENTO, CODCLIENTE, CIF, RAZONSOCIAL, NOMBRECOMERCIAL, DIRECCION, POBLACION, FECHADOCUMENTO, FECHAINICIOPREPARACION, CODOPERADOR, CODTERMINAL, OBSERVACIONES, CODCOMERCIAL, ORIGEN, NUMBULTOS, FUERCEB)
                VALUES (:1, :2, :3, :4, :5, :6, :7, :8, SYSDATE, :9, :10, :11, :12, 0, 0, 0)
            """
            cursor.execute(query_doccli, [
                cod_documento, cod_cliente, cif, razonsocial, nombrecomercial,
                direccion, poblacion, fecha_doc_val, cod_operador, cod_terminal, observaciones, cod_comercial
            ])

            connection.commit()
            logger.info(f"Cabecera de devolución cliente creada con CODDOCUMENTO: {cod_documento}, NUMDOCUMENTO: {num_documento}")
            return {
                "cod_documento": cod_documento,
                "num_documento": num_documento,
                "serie": serie
            }
        except Exception as e:
            if connection:
                try: connection.rollback()
                except: pass
            logger.error(f"Error al crear cabecera de devolución: {e}", exc_info=True)
            raise e
        finally:
            if cursor:
                try: cursor.close()
                except: pass
            if connection:
                try: connection.close()
                except: pass

    @staticmethod
    def grabar_linea_devolucion(payload: dict) -> dict:
        """
        Graba una línea de devolución llamando a la función SPREU_DEVOLUCIONCLIENTE.
        Maneja la lógica de negocio para:
        - Obtener/reutilizar el número de línea (P_NUMLINEA).
        - Obtener la ubicación destino (P_CODUBICACION) basado en los parámetros 1636 y 1637.
        """
        connection = None
        cursor = None
        try:
            connection = OracleDatabase.get_connection()
            cursor = connection.cursor()

            cod_documento = payload.get('CODDOCUMENTO')
            cod_articulo = payload.get('CODARTICULO')
            unidades = payload.get('UNIDADES')
            num_lote = payload.get('NUMEROLOTE')
            fecha_caducidad = payload.get('FECHACADUCIDAD')
            ean = payload.get('EAN', '')
            cod_terminal = payload.get('CODTERMINAL', 1)
            cod_operador = payload.get('CODOPERADOR', 1)
            ubicacion_escaneda = payload.get('CODUBICACION') # Proporcionado si el parámetro 1636 != 0

            # 1. Obtener parámetros 1636 y 1637 para la ubicación
            cursor.execute("SELECT CODPARAMETRO, VALOR FROM GSM.TSYS_PARAMETROSXAMBITO WHERE CODPARAMETRO IN (1636, 1637)")
            params_db = {str(row[0]): row[1] for row in cursor.fetchall()}
            prm_1636 = params_db.get('1636', '0') # 0 = Ubicación fija
            prm_1637 = params_db.get('1637')       # Código ubicación fija

            cod_ubicacion = None
            if prm_1636 == '0':
                if not prm_1637:
                    raise ValueError("El parámetro 1637 (ubicación fija) está vacío pero el parámetro 1636 indica ubicación por defecto.")
                cod_ubicacion = int(prm_1637)
            else:
                if not ubicacion_escaneda:
                    raise ValueError("Se requiere escanear o seleccionar ubicación para esta devolución.")
                cod_ubicacion = int(ubicacion_escaneda)

            # 2. Lógica para P_NUMLINEA (Reutilizar si ya existe el artículo en el documento, sino obtener MAX+1)
            cursor.execute(
                "SELECT CODLINEADOCUMENTOCLIENTE, NUMLINEA FROM GSM.TMST_LINEASDOCUMENTOCLIENTE WHERE CODDOCUMENTO = :1 AND CODARTICULO = :2",
                [cod_documento, cod_articulo]
            )
            row_linea = cursor.fetchone()
            if row_linea:
                cod_linea_doc_cliente = row_linea[0]
                num_linea = row_linea[1]
                logger.info(f"Reutilizando NUMLINEA {num_linea} para el artículo '{cod_articulo}' en documento '{cod_documento}'.")
                
                # Actualizar unidades de la línea existente (en devoluciones, la cantidad se registra en CANTPREPARADA)
                cursor.execute(
                    """
                    UPDATE GSM.TMST_LINEASDOCUMENTOCLIENTE 
                    SET CANTPREPARADA = CANTPREPARADA + :1 
                    WHERE CODLINEADOCUMENTOCLIENTE = :2
                    """,
                    [unidades, cod_linea_doc_cliente]
                )
            else:
                cursor.execute(
                    "SELECT NVL(MAX(NUMLINEA), 0) + 1 FROM GSM.TMST_LINEASDOCUMENTOCLIENTE WHERE CODDOCUMENTO = :1",
                    [cod_documento]
                )
                num_linea = cursor.fetchone()[0]
                logger.info(f"Asignando nuevo NUMLINEA {num_linea} para el artículo '{cod_articulo}' en documento '{cod_documento}'.")

                # Obtener descripción/nombre del artículo
                cursor.execute("SELECT NOMBREARTICULO FROM GSM.TMST_ARTICULOS WHERE CODARTICULO = :1", [cod_articulo])
                row_art = cursor.fetchone()
                nombre_articulo = row_art[0] if row_art and row_art[0] else ''

                # Leer tipos de código introducido del payload
                tipo_codigo_intro = payload.get('TIPOCODIGOINTRODUCIDO')
                if tipo_codigo_intro is not None:
                    tipo_codigo_intro = int(tipo_codigo_intro)
                codigo_intro = payload.get('CODIGOINTRODUCIDO')

                # Insertar la línea padre obligatoria para cumplir la FK de base de datos
                # Nuevos campos: NUMLINEADOCUMENTOPADRE = 0, CANTTIPOUNIDAD = 0.0, CANTSEGUNDAUNIDADALMACEN = 0.0,
                #                TIPOCONVFACTCONVSEGUNUNIDADALM = 0, FACTORCONVERSEGUNUNIDADALMACEN = 0.0,
                #                CANTSEGUNDAUNIDADPREPARADA = 0.0, TIPOCODIGOINTRODUCIDO, CODIGOINTRODUCIDO
                query_insert_linea = """
                    INSERT INTO GSM.TMST_LINEASDOCUMENTOCLIENTE
                    (CODLINEADOCUMENTOCLIENTE, CODDOCUMENTO, NUMLINEA, CODARTICULO, NOMBREARTICULO, CANTSOLICITADA, CANTSOLICITADAORIGINAL, CANTPREPARADA, PRECIO, REPASADA, PRM_VALORADO, DESPRECIARPENDIENTE, CODTIPOUNIDAD, FACTORCONVERSIONTIPOUNIDAD, NUMLINEADOCUMENTOPADRE, CANTTIPOUNIDAD, CANTSEGUNDAUNIDADALMACEN, TIPOCONVFACTCONVSEGUNUNIDADALM, FACTORCONVERSEGUNUNIDADALMACEN, CANTSEGUNDAUNIDADPREPARADA, TIPOCODIGOINTRODUCIDO, CODIGOINTRODUCIDO)
                    VALUES (GSM.SQ_CODLINEADOCUMENTOCLIENTE.NEXTVAL, :1, :2, :3, :4, 0, 0, :5, 0, 0, 0, 0, 1, 1, 0, 0.0, 0.0, 0, 0.0, 0.0, :6, :7)
                """
                cursor.execute(query_insert_linea, [cod_documento, num_linea, cod_articulo, nombre_articulo, unidades, tipo_codigo_intro, codigo_intro])

            # Formatear fecha de caducidad
            fecha_cad_val = None
            if fecha_caducidad:
                fecha_cad_val = datetime.datetime.strptime(fecha_caducidad, '%Y-%m-%d')

            # 3. Llamar a la función SPREU_DEVOLUCIONCLIENTE (Retorna NUMBER, 0 = OK)
            kwargs = {
                'P_CODTERMINAL': int(cod_terminal),
                'P_CODARTICULO': int(cod_articulo),
                'P_CANTIDAD': int(unidades),
                'P_FECHACADUCIDAD': fecha_cad_val,
                'P_PESO': 0,
                'P_CODFACTURACION': ean,
                'P_NUMEROLOTE': num_lote,
                'P_CODDOCUMENTO': int(cod_documento),
                'P_NUMLINEA': int(num_linea),
                'P_CODUBICACION': int(cod_ubicacion),
                'P_CREARRECUENTO': 0,
                'P_STOCKDESTINO': 0,
                'P_PESODESTINO': 0,
                'P_CADCODNUMEROSDESERIE': None
            }

            logger.info(f"Ejecutando SPREU_DEVOLUCIONCLIENTE con parámetros: {kwargs}")
            res = cursor.callfunc('GSM.SPREU_DEVOLUCIONCLIENTE', int, keywordParameters=kwargs)

            if res != 0:
                raise Exception(f"La base de datos reportó un error al grabar la línea (Código: {res})")

            connection.commit()
            return {
                "status": "success",
                "num_linea": num_linea,
                "cod_ubicacion": cod_ubicacion
            }
        except Exception as e:
            if connection:
                try: connection.rollback()
                except: pass
            logger.error(f"Error al grabar línea de devolución: {e}", exc_info=True)
            raise e
        finally:
            if cursor:
                try: cursor.close()
                except: pass
            if connection:
                try: connection.close()
                except: pass

    @staticmethod
    def get_devolucion_en_curso(cod_operador: int) -> dict or None:
        """
        Busca si el operador tiene alguna devolución en curso (CODTIPOMOVIMIENTO = 32, CODESTADODOCUMENTO = 27).
        """
        connection = None
        cursor = None
        try:
            connection = OracleDatabase.get_connection()
            cursor = connection.cursor()

            query = """
                SELECT D.CODDOCUMENTO, D.NUMDOCUMENTO, D.SERIE, 
                       DC.CODCLIENTE, C.CODCLIENTEAPLICACION, C.RAZONSOCIAL, C.CIF, C.NOMBRECOMERCIAL, C.DIRECCION, C.POBLACION, DC.OBSERVACIONES
                FROM GSM.TMST_CODDOCUMENTOS D
                JOIN GSM.TMST_DOCUMENTOSCLIENTES DC ON D.CODDOCUMENTO = DC.CODDOCUMENTO
                JOIN GSM.TMST_CLIENTES C ON DC.CODCLIENTE = C.CODCLIENTE
                WHERE D.CODTIPOMOVIMIENTO = 32
                  AND D.CODESTADODOCUMENTO = 27
                  AND D.ULTIMOCODOPERADOR = :1
                  AND ROWNUM <= 1
            """
            cursor.execute(query, [cod_operador])
            row = cursor.fetchone()
            if row:
                return {
                    "cod_documento": row[0],
                    "num_documento": row[1],
                    "serie": row[2],
                    "cliente": {
                        "CODCLIENTE": row[3],
                        "CODCLIENTEAPLICACION": row[4],
                        "RAZONSOCIAL": row[5],
                        "CIF": row[6],
                        "NOMBRECOMERCIAL": row[7],
                        "DIRECCION": row[8],
                        "POBLACION": row[9]
                    },
                    "observaciones": row[10]
                }
            return None
        except Exception as e:
            logger.error(f"Error al obtener devolución en curso para operador {cod_operador}: {e}", exc_info=True)
            raise e
        finally:
            if cursor:
                try: cursor.close()
                except: pass
            if connection:
                try: connection.close()
                except: pass

    @staticmethod
    def get_lineas_devolucion(cod_documento: int) -> list:
        """
        Obtiene las líneas ya grabadas de una devolución.
        """
        connection = None
        cursor = None
        try:
            connection = OracleDatabase.get_connection()
            cursor = connection.cursor()

            query = """
                SELECT A.CODARTICULOAPLICACION, L.NOMBREARTICULO, 
                       LN.UNIDADES, LOT.NUMEROLOTE, TO_CHAR(LN.FECHACADUCIDAD, 'YYYY-MM-DD') AS FECHACADUCIDAD
                FROM GSM.TMST_LINEASDOCUMENTOCLIENTE L
                JOIN GSM.TMST_LINEASDOCCLIENTENUMLOTES LN ON L.CODDOCUMENTO = LN.CODDOCUMENTO AND L.NUMLINEA = LN.NUMLINEA
                LEFT JOIN GSM.TMST_ARTICULOS A ON L.CODARTICULO = A.CODARTICULO
                LEFT JOIN GSM.TMST_NUMEROSLOTESPROVEEDORES LOT ON LN.CODNUMEROLOTE = LOT.CODNUMEROLOTE AND L.CODARTICULO = LOT.CODARTICULO
                WHERE L.CODDOCUMENTO = :1
                ORDER BY L.NUMLINEA DESC
            """
            cursor.execute(query, [cod_documento])
            results = []
            for row in cursor.fetchall():
                results.append({
                    "cod_articulo_aplicacion": row[0],
                    "nombre": row[1],
                    "unidades": row[2],
                    "lote": row[3] or "",
                    "caducidad": row[4] or "",
                    "ubicacion": "N/A"
                })
            return results
        except Exception as e:
            logger.error(f"Error al obtener líneas de devolución para documento {cod_documento}: {e}", exc_info=True)
            raise e
        finally:
            if cursor:
                try: cursor.close()
                except: pass
            if connection:
                try: connection.close()
                except: pass

    @staticmethod
    def finalizar_devolucion(cod_documento: int):
        connection = None
        cursor = None
        try:
            connection = OracleDatabase.get_connection()
            cursor = connection.cursor()

            # Llamar a la función de BBDD GSM.SPPRP_ENDPREPARACIONDOC
            # P_CODDOCUMENTO, P_UBICACIONESDESTINO (VARCHAR2), P_DESPRECIARRESTOS (NUMBER)
            res_val = cursor.callfunc('GSM.SPPRP_ENDPREPARACIONDOC', oracledb.NUMBER, [cod_documento, '', 0])
            if res_val != 0:
                raise ValueError(f"La base de datos retornó un código de error al finalizar la preparación: {res_val}")

            connection.commit()
        except Exception as e:
            if connection:
                try: connection.rollback()
                except: pass
            logger.error(f"Error al finalizar devolución {cod_documento} en BD: {e}", exc_info=True)
            raise e
        finally:
            if cursor:
                try: cursor.close()
                except: pass
            if connection:
                try: connection.close()
                except: pass
