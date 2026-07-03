from app.database import db
import datetime

class EntradasRepository:
    @staticmethod
    def get_muelles():
        try:
            conn = db.get_connection()
            cursor = conn.cursor()
            query = """
                SELECT CODMUELLE, DESCRIPCION 
                FROM GSM.TMST_MUELLES 
                WHERE PRM_MUELLEENTRADA != 0
                ORDER BY DESCRIPCION ASC
            """
            cursor.execute(query)
            rows = cursor.fetchall()
            return [{"CODMUELLE": r[0], "DESCRIPCION": r[1]} for r in rows]
        except Exception as e:
            raise e
        finally:
            if 'cursor' in locals():
                try: cursor.close()
                except: pass
            if 'conn' in locals():
                try: conn.close()
                except: pass

    @staticmethod
    def get_parametros_entrada():
        try:
            conn = db.get_connection()
            cursor = conn.cursor()
            query = """
                SELECT p.codparametro, pa.valor
                FROM GSM.tsys_parametros p 
                INNER JOIN GSM.tsys_parametrosxambito pa ON pa.codparametro = p.codparametro 
                WHERE p.codparametro IN (1687, 1693, 1702, 1745, 1750)
            """
            cursor.execute(query)
            rows = cursor.fetchall()
            params = {str(r[0]): r[1] for r in rows}
            return params
        except Exception as e:
            raise e
        finally:
            if 'cursor' in locals():
                try: cursor.close()
                except: pass
            if 'conn' in locals():
                try: conn.close()
                except: pass

    @staticmethod
    def get_albaranes_en_curso(codmuelle: int):
        try:
            conn = db.get_connection()
            cursor = conn.cursor()
            query = """
                SELECT a.CODDOCUMENTO, a.CODPROVEEDOR, a.RAZONSOCIAL, a.NUMDOCUMENTO, a.FECHADOCUMENTO, p.NUMDOCUMENTO as NUMPEDIDO
                FROM GSM.VMST_DOCUMENTOSPROVEEDOR a
                LEFT JOIN GSM.VMST_DOCUMENTOSPROVEEDOR p ON p.CODDOCUMENTOPADRE = a.CODDOCUMENTO
                WHERE a.CODESTADODOCUMENTO = 16
            """
            params = []
            if codmuelle and str(codmuelle) != '0':
                query += " AND a.CODMUELLE = :1"
                params.append(codmuelle)
            
            query += " ORDER BY a.FECHADOCUMENTO DESC"
            cursor.execute(query, params)
            rows = cursor.fetchall()
            return [{
                "CODDOCUMENTO": r[0],
                "CODPROVEEDOR": r[1],
                "RAZONSOCIAL": r[2],
                "NUMDOCUMENTO": r[3],
                "FECHADOCUMENTO": r[4].strftime('%d-%m-%Y') if r[4] else None,
                "NUMPEDIDO": r[5]
            } for r in rows]
        except Exception as e:
            raise e
        finally:
            if 'cursor' in locals():
                try: cursor.close()
                except: pass
            if 'conn' in locals():
                try: conn.close()
                except: pass

    @staticmethod
    def get_proveedores_con_pedidos_pendientes():
        try:
            conn = db.get_connection()
            cursor = conn.cursor()
            query = """
                SELECT DISTINCT CODDOCUMENTO, CODPROVEEDOR, RAZONSOCIAL, NUMDOCUMENTO, FECHADOCUMENTO
                FROM GSM.VMST_DOCUMENTOSPROVEEDOR 
                WHERE CODESTADODOCUMENTO = 14
                ORDER BY FECHADOCUMENTO DESC
            """
            cursor.execute(query)
            rows = cursor.fetchall()
            return [{
                "CODDOCUMENTO": r[0],
                "CODPROVEEDOR": r[1],
                "RAZONSOCIAL": r[2],
                "NUMDOCUMENTO": r[3],
                "FECHADOCUMENTO": r[4].strftime('%d-%m-%Y') if r[4] else None
            } for r in rows]
        except Exception as e:
            raise e
        finally:
            if 'cursor' in locals():
                try: cursor.close()
                except: pass
            if 'conn' in locals():
                try: conn.close()
                except: pass

    @staticmethod
    def get_pedidos_pendientes_por_proveedor(codproveedor: int):
        try:
            conn = db.get_connection()
            cursor = conn.cursor()
            query = """
                SELECT CODDOCUMENTO, NUMDOCUMENTO, FECHADOCUMENTO
                FROM GSM.VMST_DOCUMENTOSPROVEEDOR
                WHERE CODESTADODOCUMENTO = 14 AND CODPROVEEDOR = :1
                ORDER BY FECHADOCUMENTO DESC
            """
            cursor.execute(query, [codproveedor])
            rows = cursor.fetchall()
            return [{
                "CODDOCUMENTO": r[0],
                "NUMDOCUMENTO": r[1],
                "FECHADOCUMENTO": r[2].strftime('%Y-%m-%d') if r[2] else None
            } for r in rows]
        except Exception as e:
            raise e
        finally:
            if 'cursor' in locals():
                try: cursor.close()
                except: pass
            if 'conn' in locals():
                try: conn.close()
                except: pass
    @staticmethod
    def get_proveedores():
        try:
            conn = db.get_connection()
            cursor = conn.cursor()
            query = """
                SELECT CODPROVEEDOR, RAZONSOCIAL, CODPROVEEDORAPLICACION, NOMBRECOMERCIAL
                FROM GSM.TMST_PROVEEDORES
                ORDER BY RAZONSOCIAL ASC
            """
            cursor.execute(query)
            rows = cursor.fetchall()
            return [{
                "CODPROVEEDOR": r[0],
                "RAZONSOCIAL": r[1],
                "CODPROVEEDORAPLICACION": r[2],
                "NOMBRECOMERCIAL": r[3]
            } for r in rows]
        except Exception as e:
            raise e
        finally:
            if 'cursor' in locals():
                try: cursor.close()
                except: pass
            if 'conn' in locals():
                try: conn.close()
                except: pass

    @staticmethod
    def _crear_albaran_internal(cursor, payload: dict):
        num_albaran = payload.get('NUMALBARAN')
        cod_proveedor = payload.get('CODPROVEEDOR')
        cod_muelle = payload.get('CODMUELLE')
        cod_pedido_padre = payload.get('CODPEDIDO')
        
        fecha_documento = payload.get('FECHADOCUMENTO')
        fecha_recepcion = payload.get('FECHARECEPCION')
        num_expedicion = payload.get('NUMEXPEDICION')

        fecha_doc_val = datetime.datetime.strptime(fecha_documento, '%Y-%m-%d') if fecha_documento else datetime.datetime.now()
        fecha_rec_val = datetime.datetime.strptime(fecha_recepcion, '%Y-%m-%d') if fecha_recepcion else datetime.datetime.now()

        # Obtener el CODEMPRESA
        cursor.execute("SELECT MIN(CODEMPRESA) FROM GSM.TMST_EMPRESAS")
        cod_empresa_row = cursor.fetchone()
        cod_empresa = cod_empresa_row[0] if cod_empresa_row and cod_empresa_row[0] else 1

        cod_operador = payload.get('CODOPERADOR', 1)

        # 1. Insertar en TMST_CODDOCUMENTOS
        # El trigger de BBDD sobrescribe el CODDOCUMENTO con un NEXTVAL, por lo que 
        # pasamos 0 y recuperamos el id real con RETURNING.
        query_coddoc = """
            INSERT INTO GSM.TMST_CODDOCUMENTOS 
            (CODDOCUMENTO, CODEMPRESA, NUMDOCUMENTO, EJERCICIO, SERIE, CODTIPODOCUMENTO, CODTIPOMOVIMIENTO, CODESTADODOCUMENTO, CODPRIORIDAD, ULTIMOCODCONCEPTOESTADISTICO, ULTIMOCODOPERADOR)
            VALUES (0, :1, :2, EXTRACT(YEAR FROM SYSDATE), NULL, 3, 30, 16, 2, 31, :3)
            RETURNING CODDOCUMENTO INTO :4
        """
        cod_doc_var = cursor.var(int)
        cursor.execute(query_coddoc, [cod_empresa, num_albaran, cod_operador, cod_doc_var])
        cod_documento = cod_doc_var.getvalue()[0]

        # Obtener el siguiente NUMDOCUMENTOENTRADA
        cursor.execute("SELECT NVL(MAX(NUMDOCUMENTOENTRADA), 0) + 1 FROM GSM.TMST_DOCUMENTOSPROVEEDORES")
        num_doc_entrada = cursor.fetchone()[0]

        # Obtener datos del proveedor
        cif = None
        razonsocial = None
        nombrecomercial = None
        direccion = None
        poblacion = None

        if cod_proveedor:
            cursor.execute("SELECT CIF, RAZONSOCIAL, NOMBRECOMERCIAL, DIRECCION, POBLACION FROM GSM.TMST_PROVEEDORES WHERE CODPROVEEDOR = :1", [cod_proveedor])
            row = cursor.fetchone()
            if row:
                cif, razonsocial, nombrecomercial, direccion, poblacion = row

        # Obtener CODCLIENTE
        cod_cliente = None
        cursor.execute("SELECT CODPARAMETRO, VALOR FROM GSM.TSYS_PARAMETROSXAMBITO WHERE CODPARAMETRO IN (1654, 1307)")
        params_db = {str(r[0]): r[1] for r in cursor.fetchall()}
        
        prm_1654 = params_db.get('1654', '0')
        if prm_1654 == '0':
            cod_cliente = params_db.get('1307')
        elif prm_1654 == '1':
            if cod_muelle:
                cursor.execute("SELECT CODUBICACIONENTRADA FROM GSM.TMST_MUELLES WHERE CODMUELLE = :1", [cod_muelle])
                row_m = cursor.fetchone()
                if row_m and row_m[0]:
                    cod_ubicacion_entrada = row_m[0]
                    query_cliente = """
                        SELECT aa.CODENTEAPLICACION 
                        FROM GSM.TMST_ALMACENESADMINISTRATIVOS aa
                        INNER JOIN GSM.TMST_ALMACENES a ON a.CODALMACENADMINISTRATIVO = aa.CODALMACENADMINISTRATIVO
                        INNER JOIN GSM.TMST_HUECOS h ON h.CODALMACEN = a.CODALMACEN
                        INNER JOIN GSM.TMST_UBICACIONES u ON u.CODHUECO = h.CODHUECO
                        WHERE u.CODUBICACION = :1
                    """
                    cursor.execute(query_cliente, [cod_ubicacion_entrada])
                    row_c = cursor.fetchone()
                    if row_c:
                        cod_cliente = row_c[0]

        # 2. Insertar en TMST_DOCUMENTOSPROVEEDORES
        query_docprov = """
            INSERT INTO GSM.TMST_DOCUMENTOSPROVEEDORES
            (CODDOCUMENTO, CODPROVEEDOR, CODMUELLE, NUMDOCUMENTOENTRADA, FECHADOCUMENTO, FECHARECEPCION, NUMEXPEDICION, CIF, RAZONSOCIAL, NOMBRECOMERCIAL, DIRECCION, POBLACION, FECHAINICIOPREPARACION, CODCLIENTE)
            VALUES (:1, :2, :3, :4, :5, :6, :7, :8, :9, :10, :11, :12, SYSDATE, :13)
        """
        cursor.execute(query_docprov, [cod_documento, cod_proveedor, cod_muelle, num_doc_entrada, fecha_doc_val, fecha_rec_val, num_expedicion, cif, razonsocial, nombrecomercial, direccion, poblacion, cod_cliente])

        # 3. Si hay pedido asociado, insertar en TMST_PEDIDOXALBARANPROVEEDOR
        if cod_pedido_padre:
            query_rel = """
                INSERT INTO GSM.TMST_PEDIDOXALBARANPROVEEDOR
                (CODPEDIDOPROVEEDOR, CODALBARANPROVEEDOR)
                VALUES (:1, :2)
            """
            cursor.execute(query_rel, [cod_pedido_padre, cod_documento])

        return cod_documento

    @staticmethod
    def crear_albaran(payload: dict):
        try:
            conn = db.get_connection()
            cursor = conn.cursor()
            cod_documento = EntradasRepository._crear_albaran_internal(cursor, payload)
            conn.commit()
            return cod_documento
        except Exception as e:
            if 'conn' in locals():
                conn.rollback()
            raise e
        finally:
            if 'cursor' in locals():
                try: cursor.close()
                except: pass
            if 'conn' in locals():
                try: conn.close()
                except: pass

    @staticmethod
    def grabar_linea_entrada(payload: dict):
        try:
            conn = db.get_connection()
            cursor = conn.cursor()

            p_coddocumento = payload.get('CODDOCUMENTO')
            if not p_coddocumento:
                p_coddocumento = EntradasRepository._crear_albaran_internal(cursor, payload)

            p_codarticulo = payload.get('CODARTICULO')
            p_unidades = payload.get('UNIDADES')
            p_codoperador = payload.get('CODOPERADOR', 1)
            p_codterminal = payload.get('CODTERMINAL', 1)
            p_numlote = payload.get('NUMEROLOTE')
            p_fechacaducidad = payload.get('FECHACADUCIDAD')
            p_ean = payload.get('EAN', '')

            is_palet = payload.get('ISPALET', False)
            num_bultos = int(payload.get('NUMBULTOS', 1))

            import datetime
            fecha_caducidad_obj = None
            if p_fechacaducidad:
                fecha_caducidad_obj = datetime.datetime.strptime(p_fechacaducidad, '%Y-%m-%d')
            
            cursor.execute("SELECT NUMDOCUMENTOENTRADA, CODMUELLE, CODPROVEEDOR FROM GSM.TMST_DOCUMENTOSPROVEEDORES WHERE CODDOCUMENTO = :1", [p_coddocumento])
            row_doc = cursor.fetchone()
            p_numdocumentoentrada = row_doc[0] if row_doc else None
            p_codmuelle = row_doc[1] if row_doc else None
            p_codproveedor = row_doc[2] if row_doc else None

            p_codubicacion = None
            p_codubicacionpalets = None
            if p_codmuelle:
                cursor.execute("SELECT CODUBICACIONENTRADA, CODUBICACIONENTRADAPALETS FROM GSM.TMST_MUELLES WHERE CODMUELLE = :1", [p_codmuelle])
                row_mue = cursor.fetchone()
                if row_mue:
                    p_codubicacion = row_mue[0]
                    p_codubicacionpalets = row_mue[1]

            def calc_gs1_check_digit(number_str):
                total = 0
                for i, digit in enumerate(number_str):
                    weight = 3 if i % 2 == 0 else 1
                    total += int(digit) * weight
                return str((10 - (total % 10)) % 10)

            for _ in range(num_bultos):
                var_unidades = cursor.var(int)
                var_unidades.setvalue(0, p_unidades)
                
                var_cant_segunda = cursor.var(int)
                var_cant_segunda.setvalue(0, 0)
                
                var_codlinea = cursor.var(int)
                var_codnumlote = cursor.var(int)
                var_cadpropietarios = cursor.var(str)

                kwargs = {
                    'P_CODDOCUMENTO': p_coddocumento,
                    'P_CODARTICULO': p_codarticulo,
                    'P_CANTSOLICITADA': p_unidades,
                    'P_CANTSOLICITADAORIGINAL': p_unidades,
                    'P_UNIDADES': var_unidades,
                    'P_CANTSEGUNDAUNIDADSERV': var_cant_segunda,
                    'P_PRECIO': 0,
                    'P_NUMEROLOTE': p_numlote,
                    'P_FECHACADUCIDAD': fecha_caducidad_obj,
                    'P_OBSERVACIONES': None,
                    'P_NUMDOCUMENTOENTRADA': p_numdocumentoentrada,
                    'P_GESTIONARSEGUNDAUNID': 0,
                    'P_CODOPERADOR': p_codoperador,
                    'P_CODTIPOUNIDAD': 1,
                    'P_FACTORCONVESRIONTIPOUNIDAD': 1,
                    'P_TIPOCONVFACTCONVSEGUNUNID': 0,
                    'P_FACTORCONVSEGUNDUNID': 0,
                    'P_CADCODNUMEROSSERIE': None,
                    'P_TIPOCODIGOINTRODUCIDO': None,
                    'P_CODIGOINTRODUCIDO': None,
                    'P_CODLINEADOCUMENTOPROV': var_codlinea,
                    'P_CODNUMEROLOTE': var_codnumlote,
                    'P_CADPROPIETARIOS': var_cadpropietarios,
                    'P_CANTIDADTIPOUNIDAD': p_unidades,
                    'P_TARATIPOUNIDAD': 0,
                    'P_PESOBRUTO': 0,
                    'P_PESONETO': 0,
                    'P_PESOTARA': 0
                }
                
                res = cursor.callfunc('GSM.SPEME_REALIZARENTRADAMERCANCIA', int, keywordParameters=kwargs)
                if res != 0:
                    raise Exception(f"SP Error: {res}")

                full_sscc = None
                cod_num_lote_generado = var_codnumlote.getvalue()

                if is_palet:
                    out_val = cursor.var(int)
                    cursor.execute("UPDATE GSM.TSYS_CONTADORES SET VALOR = VALOR + 1 WHERE CODCONTADOR = 2 RETURNING VALOR INTO :1", [out_val])
                    sscc_val = out_val.getvalue()[0]
                    sscc_base = f"0{int(sscc_val):016d}"
                    full_sscc = sscc_base + calc_gs1_check_digit(sscc_base)

                    cursor.execute("SELECT GSM.SQ_CODPALET.NEXTVAL FROM DUAL")
                    cod_palet = cursor.fetchone()[0]

                    insert_palet = """
                        INSERT INTO GSM.TMST_PALETS (
                            CODPALET, SSCC, CODARTICULO, UNIDADES, CODTIPOUNIDAD, 
                            CODDOCUMENTOENTRADA, CODUBICACION, FECHACADUCIDAD, 
                            CODNUMEROLOTE, CODTIPODATOMAESTRO, CODDATOMAESTRO, 
                            ULTIMOCODTERMINAL, ULTIMOFECHAEJECUTIVA, 
                            ULTIMOCODCONCEPTOESTADISTICO, CODFACTURACION
                        ) VALUES (:1, :2, :3, :4, 4, :5, :6, :7, :8, 6, 1, :9, SYSDATE, 3, :10)
                    """
                    cursor.execute(insert_palet, [
                        cod_palet, full_sscc, p_codarticulo, p_unidades,
                        p_coddocumento, p_codubicacionpalets, fecha_caducidad_obj,
                        cod_num_lote_generado, p_codterminal, p_ean
                    ])

                kwargs_guardar = {
                    'P_CODLINEADOCUMENTOPROVEEDOR': var_codlinea.getvalue(),
                    'P_CODOPERADOR': p_codoperador,
                    'P_CODTERMINAL': p_codterminal,
                    'P_CODARTICULO': p_codarticulo,
                    'P_SSCC': full_sscc,
                    'P_UNIDADESPALET': str(p_unidades) if is_palet else None,
                    'P_CANTSERVIDA': p_unidades,
                    'P_FECHACADUCIDAD': fecha_caducidad_obj,
                    'P_FECHAENTRADA': datetime.datetime.now(),
                    'P_CANTSEGUNDAUNIDADSERVIDA': 0,
                    'P_CODNUMEROLOTE': cod_num_lote_generado,
                    'P_CODMUELLE': p_codmuelle
                }
                res_guardar = cursor.callfunc('GSM.SPEME_GUARDARDETALLEENTRADA', int, keywordParameters=kwargs_guardar)
                if res_guardar != 0:
                    raise Exception(f"Error SPEME_GUARDARDETALLEENTRADA: {res_guardar}")

                if not is_palet:
                    cursor.execute("SELECT NUMLINEA FROM GSM.TMST_LINEASDOCUMENTOPROVEEDOR WHERE CODLINEADOCUMENTOPROVEEDOR = :1", [var_codlinea.getvalue()])
                    row_linea = cursor.fetchone()
                    p_numlinea = row_linea[0] if row_linea else 1

                    kwargs_reub = {
                        'P_CODTERMINAL': p_codterminal,
                        'P_CODUBICACION': p_codubicacion,
                        'P_CODARTICULO': p_codarticulo,
                        'P_CANTIDAD': p_unidades,
                        'P_FECHACADUCIDAD': fecha_caducidad_obj,
                        'P_PESO': 0,
                        'P_CODFACTURACION': None,
                        'P_CODPROVEEDOR': p_codproveedor,
                        'P_NUMEROLOTE': p_numlote,
                        'P_CODDOCUMENTO': p_coddocumento,
                        'P_NUMLINEA': p_numlinea,
                        'P_CREARRECUENTO': 0,
                        'P_STOCKDESTINO': 0,
                        'P_PESODESTINO': 0,
                        'P_CADCODNUMEROSDESERIE': None,
                        'P_CODOPERADOR': p_codoperador,
                        'P_CODTIPODATOMAESTRO': 1,
                        'P_CODDATOMAESTRO': p_codproveedor
                    }
                    res_reub = cursor.callfunc('GSM.SPREU_ENTRADAMERCANCIA', int, keywordParameters=kwargs_reub)
                    if res_reub != 0:
                        raise Exception(f"SPREU_ENTRADAMERCANCIA Error: {res_reub}")

            conn.commit()
            return p_coddocumento

        except Exception as e:
            if 'conn' in locals():
                conn.rollback()
            raise e
        finally:
            if 'cursor' in locals():
                try: cursor.close()
                except: pass
            if 'conn' in locals():
                try: conn.close()
                except: pass

    @staticmethod
    def finalizar_entrada(coddocumento: int, codoperador: int = 1):
        try:
            conn = db.get_connection()
            cursor = conn.cursor()
            
            out_result = cursor.var(int)
            args = [
                0, # P_DESPRECIARRESTOS
                codoperador, # P_CODOPERADOR
                coddocumento, # P_CODDOCUMENTO
                out_result # OUT result
            ]
            cursor.callproc('GSM.SPEME_FINENTRADAMERCANCIA', args)
            conn.commit()
            return out_result.getvalue()
        except Exception as e:
            if 'conn' in locals():
                conn.rollback()
            raise e
        finally:
            if 'cursor' in locals():
                try: cursor.close()
                except: pass
            if 'conn' in locals():
                try: conn.close()
                except: pass

    @staticmethod
    def get_lineas_grabadas(coddocumento: int):
        try:
            conn = db.get_connection()
            cursor = conn.cursor()
            query = """
                SELECT CODLINEADOCUMENTOPROVEEDOR, CODARTICULOAPLICACION, NOMBREARTICULO, CANTSOLICITADA, CANTSERVIDA
                FROM GSM.VMST_LINEASDOCUMENTOPROVEEDOR
                WHERE CODDOCUMENTO = :1
                ORDER BY CODLINEADOCUMENTOPROVEEDOR ASC
            """
            cursor.execute(query, [coddocumento])
            rows = cursor.fetchall()
            return [{
                "CODLINEADOCUMENTOPROVEEDOR": r[0],
                "CODARTICULOAPLICACION": r[1],
                "NOMBREARTICULO": r[2],
                "CANTSOLICITADA": r[3],
                "CANTSERVIDA": r[4]
            } for r in rows]
        except Exception as e:
            raise e
        finally:
            if 'cursor' in locals():
                try: cursor.close()
                except: pass
            if 'conn' in locals():
                try: conn.close()
                except: pass

    @staticmethod
    def get_detalle_linea(codlineadocumentoproveedor: int):
        try:
            conn = db.get_connection()
            cursor = conn.cursor()
            # The exact column name linking to lineas is required.
            # I'll guess it is CODLINEADOCUMENTOPROVEEDOR. Or CODLINEADOCUMENTOPROV based on TMST_DETALLELINEAALBARANPROV
            # Let's try CODLINEADOCUMENTOPROVEEDOR first.
            query = """
                SELECT d.SSCC, d.CANTSERVIDA, l.NUMEROLOTE, d.FECHACADUCIDAD, d.CODMUELLE
                FROM GSM.TMST_DETALLELINEAALBARANPROV d
                LEFT JOIN GSM.TMST_NUMEROSLOTESPROVEEDORES l ON d.CODNUMEROLOTE = l.CODNUMEROLOTE
                WHERE d.CODLINEADOCUMENTOPROVEEDOR = :1
            """
            cursor.execute(query, [codlineadocumentoproveedor])
            rows = cursor.fetchall()
            return [{
                "SSCC": r[0],
                "CANTSERVIDA": r[1],
                "LOTE": r[2],
                "FECHACADUCIDAD": r[3].strftime('%Y-%m-%d') if r[3] else None,
                "CODMUELLE": r[4]
            } for r in rows]
        except Exception as e:
            raise e
        finally:
            if 'cursor' in locals():
                try: cursor.close()
                except: pass
            if 'conn' in locals():
                try: conn.close()
                except: pass

    @staticmethod
    def get_lineas_pendientes(coddocumento_albaran: int):
        try:
            conn = db.get_connection()
            cursor = conn.cursor()
            
            # Find the order ID (CODPEDIDOPROVEEDOR) associated with this albaran
            query_pedido = """
                SELECT CODPEDIDOPROVEEDOR 
                FROM GSM.TMST_PEDIDOXALBARANPROVEEDOR
                WHERE CODALBARANPROVEEDOR = :1
            """
            cursor.execute(query_pedido, [coddocumento_albaran])
            row = cursor.fetchone()
            
            if not row:
                return []
                
            codpedidoproveedor = row[0]
            
            query_lineas = """
                SELECT l.CODARTICULOAPLICACION, l.NOMBREARTICULO, l.CANTSOLICITADA, 
                       (l.CANTSOLICITADA - NVL(l.CANTSERVIDA, 0)) AS CANTPDTESERVIR,
                       NVL(l.CANTSERVIDA, 0) AS CANTSERVIDA
                FROM GSM.VMST_LINEASDOCUMENTOPROVEEDOR l
                WHERE l.CODDOCUMENTO = :1
            """
            cursor.execute(query_lineas, [codpedidoproveedor])
            rows = cursor.fetchall()
            return [{
                "CODARTICULOAPLICACION": r[0],
                "NOMBREARTICULO": r[1],
                "CANTSOLICITADA": r[2],
                "CANTPDTESERVIR": r[3],
                "CANTSERVIDA": r[4]
            } for r in rows]
        except Exception as e:
            raise e
        finally:
            if 'cursor' in locals():
                try: cursor.close()
                except: pass
            if 'conn' in locals():
                try: conn.close()
                except: pass

    @staticmethod
    def get_info_articulo_por_ean(ean: str):
        try:
            conn = db.get_connection()
            cursor = conn.cursor()
            query = """
                SELECT a.CODARTICULO, a.NOMBREARTICULO, a.PRM_TRAZABILIDAD, a.GESTIONARCADUCIDAD,
                       NVL(c.FACTORCONVERSION, 1) as FACTOR_EAN
                FROM GSM.TMST_ARTICULOS a
                LEFT JOIN GSM.TMST_CODFACTURACION c ON a.CODARTICULO = c.CODARTICULO AND c.CODFACTURACION = :1
                WHERE a.CODARTICULO = (
                    SELECT MIN(CODARTICULO) FROM GSM.TMST_CODFACTURACION WHERE CODFACTURACION = :1
                )
            """
            cursor.execute(query, [ean, ean])
            row = cursor.fetchone()
            if row:
                return {
                    "CODARTICULO": row[0],
                    "NOMBREARTICULO": row[1],
                    "PRM_TRAZABILIDAD": row[2],
                    "GESTIONARCADUCIDAD": row[3],
                    "FACTOR_EAN": row[4]
                }
            return None
        except Exception as e:
            raise e
        finally:
            if 'cursor' in locals():
                try: cursor.close()
                except: pass
            if 'conn' in locals():
                try: conn.close()
                except: pass

