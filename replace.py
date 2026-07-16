import re

with open("g:/Proyectos/SGA_BACKEND/app/repositories/entradas_repo.py", "r", encoding="utf-8") as f:
    content = f.read()

start_idx = content.find("    def grabar_linea_entrada(payload: dict):")
end_idx = content.find("    def finalizar_entrada(coddocumento: int", start_idx)

new_method = """    def grabar_linea_entrada(payload: dict):
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
                    cursor.execute("UPDATE TSYS_CONTADORES SET VALOR = VALOR + 1 WHERE CODCONTADOR = 2 RETURNING VALOR INTO :1", [out_val])
                    sscc_val = out_val.getvalue()[0]
                    sscc_base = f"0{int(sscc_val):016d}"
                    full_sscc = sscc_base + calc_gs1_check_digit(sscc_base)

                    cursor.execute("SELECT GSM.SQ_CODPALET.NEXTVAL FROM DUAL")
                    cod_palet = cursor.fetchone()[0]

                    insert_palet = \"\"\"
                        INSERT INTO GSM.TMST_PALETS (
                            CODPALET, SSCC, CODARTICULO, UNIDADES, CODTIPOUNIDAD, 
                            CODDOCUMENTOENTRADA, CODUBICACION, FECHACADUCIDAD, 
                            CODNUMEROLOTE, CODTIPODATOMAESTRO, CODDATOMAESTRO, 
                            ULTIMOCODTERMINAL, ULTIMOFECHAEJECUTIVA
                        ) VALUES (:1, :2, :3, :4, 1, :5, :6, :7, :8, 1, :9, :10, SYSDATE)
                    \"\"\"
                    cursor.execute(insert_palet, [
                        cod_palet, full_sscc, p_codarticulo, p_unidades,
                        p_coddocumento, p_codubicacionpalets, fecha_caducidad_obj,
                        cod_num_lote_generado, p_codproveedor, p_codterminal
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

"""

# Retain the exact method name of the last method definition
# Note: we add the new method before the last function matched
with open("g:/Proyectos/SGA_BACKEND/app/repositories/entradas_repo.py", "w", encoding="utf-8") as f:
    f.write(content[:start_idx] + new_method + content[end_idx:])

