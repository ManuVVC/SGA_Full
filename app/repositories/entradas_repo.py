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
    def _crear_albaran_internal(cursor, payload: dict):
        num_albaran = payload.get('NUMALBARAN')
        cod_proveedor = payload.get('CODPROVEEDOR')
        cod_muelle = payload.get('CODMUELLE')
        cod_pedido_padre = payload.get('CODPEDIDO')
        
        fecha_documento = payload.get('FECHADOCUMENTO')
        fecha_recepcion = payload.get('FECHARECEPCION')
        num_expedicion = payload.get('NUMEXPEDICION')

        fecha_doc_val = datetime.datetime.strptime(fecha_documento, '%Y-%m-%d') if fecha_documento else None
        fecha_rec_val = datetime.datetime.strptime(fecha_recepcion, '%Y-%m-%d') if fecha_recepcion else None

        # Obtener el CODEMPRESA
        cursor.execute("SELECT MIN(CODEMPRESA) FROM GSM.TMST_EMPRESAS")
        cod_empresa_row = cursor.fetchone()
        cod_empresa = cod_empresa_row[0] if cod_empresa_row and cod_empresa_row[0] else 1

        # Generar el CODDOCUMENTO
        cursor.execute("SELECT GSM.SQ_CODDOCUMENTO.NEXTVAL FROM DUAL")
        cod_documento = cursor.fetchone()[0]

        # 1. Insertar en TMST_CODDOCUMENTOS
        query_coddoc = """
            INSERT INTO GSM.TMST_CODDOCUMENTOS 
            (CODDOCUMENTO, CODEMPRESA, NUMDOCUMENTO, EJERCICIO, SERIE, CODTIPODOCUMENTO, CODTIPOMOVIMIENTO, CODESTADODOCUMENTO)
            VALUES (:1, :2, :3, EXTRACT(YEAR FROM SYSDATE), NULL, 3, 30, 14)
        """
        cursor.execute(query_coddoc, [cod_documento, cod_empresa, num_albaran])

        # 2. Insertar en TMST_DOCUMENTOSPROVEEDORES
        query_docprov = """
            INSERT INTO GSM.TMST_DOCUMENTOSPROVEEDORES
            (CODDOCUMENTO, CODPROVEEDOR, CODMUELLE, NUMDOCUMENTOENTRADA, FECHADOCUMENTO, FECHARECEPCION, NUMEXPEDICION)
            VALUES (:1, :2, :3, :4, COALESCE(:5, SYSDATE), COALESCE(:6, SYSDATE), :7)
        """
        cursor.execute(query_docprov, [cod_documento, cod_proveedor, cod_muelle, num_albaran, fecha_doc_val, fecha_rec_val, num_expedicion])

        # 3. Si hay pedido asociado, insertar en TMST_PEDIDOXALBARANPROVEEDOR
        if cod_pedido_padre:
            query_rel = """
                INSERT INTO GSM.TMST_PEDIDOXALBARANPROVEEDOR
                (CODDOCUMENTOPEDIDO, CODDOCUMENTOALBARAN)
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

            # Si no hay CODDOCUMENTO, significa que es la primera línea y debemos crear la cabecera primero.
            p_coddocumento = payload.get('CODDOCUMENTO')
            if not p_coddocumento:
                p_coddocumento = EntradasRepository._crear_albaran_internal(cursor, payload)

            # Recuperar parámetros necesarios
            p_codarticulo = payload.get('CODARTICULO')
            p_unidades = payload.get('UNIDADES')
            p_codoperador = payload.get('CODOPERADOR', 1)
            p_numlote = payload.get('NUMEROLOTE')
            p_fechacaducidad = payload.get('FECHACADUCIDAD') # Espera formato YYYY-MM-DD
            
            # Formatear la fecha para Oracle (DATE type)
            if p_fechacaducidad:
                p_fechacaducidad_sql = f"TO_DATE('{p_fechacaducidad}', 'YYYY-MM-DD')"
            else:
                p_fechacaducidad_sql = "NULL"

            # Ejecutar SPEME_REALIZARENTRADAMERCANCIA
            # Nota: Según los argumentos vistos, es un procedimiento largo con muchos NULLs posibles.
            # Rellenamos los clave y el resto los dejamos a 0/NULL o como los asume el SP
            # Para Python cx_Oracle, llamar a procedure.
            
            # Prepare arguments matching the SP signature:
            # ('P_PESOTARA', 'NUMBER'), ('P_PESONETO', 'NUMBER'), ('P_PESOBRUTO', 'NUMBER'), 
            # ('P_TARATIPOUNIDAD', 'NUMBER'), ('P_CANTIDADTIPOUNIDAD', 'NUMBER'), ('P_CADPROPIETARIOS', 'VARCHAR2'), 
            # ('P_CODNUMEROLOTE', 'NUMBER'), ('P_CODLINEADOCUMENTOPROV', 'NUMBER'), ('P_CODIGOINTRODUCIDO', 'VARCHAR2'), 
            # ('P_TIPOCODIGOINTRODUCIDO', 'NUMBER'), ('P_CADCODNUMEROSSERIE', 'VARCHAR2'), ('P_FACTORCONVSEGUNDUNID', 'NUMBER'), 
            # ('P_TIPOCONVFACTCONVSEGUNUNID', 'NUMBER'), ('P_FACTORCONVESRIONTIPOUNIDAD', 'NUMBER'), ('P_CODTIPOUNIDAD', 'NUMBER'), 
            # ('P_CODOPERADOR', 'NUMBER'), ('P_GESTIONARSEGUNDAUNID', 'NUMBER'), ('P_NUMDOCUMENTOENTRADA', 'NUMBER'), 
            # ('P_OBSERVACIONES', 'VARCHAR2'), ('P_FECHACADUCIDAD', 'DATE'), ('P_NUMEROLOTE', 'VARCHAR2'), 
            # ('P_PRECIO', 'NUMBER'), ('P_CANTSEGUNDAUNIDADSERV', 'NUMBER'), ('P_UNIDADES', 'NUMBER'), 
            # ('P_CANTSOLICITADAORIGINAL', 'NUMBER'), ('P_CANTSOLICITADA', 'NUMBER'), ('P_CODARTICULO', 'NUMBER'), 
            # ('P_CODDOCUMENTO', 'NUMBER'), (None, 'NUMBER') (This last None is likely an OUT parameter for error code or success)
            
            # Using callproc is cleaner
            out_result = cursor.var(int)
            
            import datetime
            fecha_caducidad_obj = None
            if p_fechacaducidad:
                fecha_caducidad_obj = datetime.datetime.strptime(p_fechacaducidad, '%Y-%m-%d')
            
            args = [
                0, # P_PESOTARA
                0, # P_PESONETO
                0, # P_PESOBRUTO
                0, # P_TARATIPOUNIDAD
                p_unidades, # P_CANTIDADTIPOUNIDAD (Assuming 1 pallet = total units, or this is per pallet?)
                None, # P_CADPROPIETARIOS
                None, # P_CODNUMEROLOTE
                None, # P_CODLINEADOCUMENTOPROV
                None, # P_CODIGOINTRODUCIDO
                None, # P_TIPOCODIGOINTRODUCIDO
                None, # P_CADCODNUMEROSSERIE
                0, # P_FACTORCONVSEGUNDUNID
                0, # P_TIPOCONVFACTCONVSEGUNUNID
                0, # P_FACTORCONVESRIONTIPOUNIDAD
                None, # P_CODTIPOUNIDAD
                p_codoperador, # P_CODOPERADOR
                0, # P_GESTIONARSEGUNDAUNID
                None, # P_NUMDOCUMENTOENTRADA
                None, # P_OBSERVACIONES
                fecha_caducidad_obj, # P_FECHACADUCIDAD
                p_numlote, # P_NUMEROLOTE
                0, # P_PRECIO
                0, # P_CANTSEGUNDAUNIDADSERV
                p_unidades, # P_UNIDADES
                p_unidades, # P_CANTSOLICITADAORIGINAL
                p_unidades, # P_CANTSOLICITADA
                p_codarticulo, # P_CODARTICULO
                p_coddocumento, # P_CODDOCUMENTO
                out_result # OUT result
            ]
            
            cursor.callproc('GSM.SPEME_REALIZARENTRADAMERCANCIA', args)
            res = out_result.getvalue()
            if res != 0:
                raise Exception(f"SP Error: {res}")
                
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
            
            # Find the order ID (CODDOCUMENTOPEDIDO) associated with this albaran
            query_pedido = """
                SELECT CODDOCUMENTOPEDIDO 
                FROM GSM.TMST_PEDIDOXALBARANPROVEEDOR
                WHERE CODDOCUMENTOALBARAN = :1
            """
            cursor.execute(query_pedido, [coddocumento_albaran])
            row = cursor.fetchone()
            
            if not row:
                return []
                
            codpedidoproveedor = row[0]
            
            query_lineas = """
                SELECT CODARTICULOAPLICACION, NOMBREARTICULO, CANTSOLICITADA, CANTPDTESERVIR
                FROM GSM.VMST_LINEASDOCPROVPDTRECIBIR
                WHERE CODDOCUMENTO = :1
            """
            cursor.execute(query_lineas, [codpedidoproveedor])
            rows = cursor.fetchall()
            return [{
                "CODARTICULOAPLICACION": r[0],
                "NOMBREARTICULO": r[1],
                "CANTSOLICITADA": r[2],
                "CANTPDTESERVIR": r[3]
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
