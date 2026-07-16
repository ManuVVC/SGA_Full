import re

with open('app/repositories/entradas_repo.py', 'r', encoding='utf-8') as f:
    content = f.read()

old_insert = """        query_coddoc = \"\"\"
            INSERT INTO GSM.TMST_CODDOCUMENTOS 
            (CODDOCUMENTO, CODEMPRESA, NUMDOCUMENTO, EJERCICIO, SERIE, CODTIPODOCUMENTO, CODTIPOMOVIMIENTO, CODESTADODOCUMENTO)
            VALUES (:1, :2, :3, EXTRACT(YEAR FROM SYSDATE), NULL, 3, 30, 14)
        \"\"\""""

new_insert = """        query_coddoc = \"\"\"
            INSERT INTO GSM.TMST_CODDOCUMENTOS 
            (CODDOCUMENTO, CODEMPRESA, NUMDOCUMENTO, EJERCICIO, SERIE, CODTIPODOCUMENTO, CODTIPOMOVIMIENTO, CODESTADODOCUMENTO, CODPRIORIDAD)
            VALUES (:1, :2, :3, EXTRACT(YEAR FROM SYSDATE), NULL, 3, 30, 14, 2)
        \"\"\""""

content = content.replace(old_insert, new_insert)

old_sp_call_regex = re.compile(r'            # Using callproc is cleaner.*?conn.commit\(\)\n            return p_coddocumento', re.DOTALL)

new_sp_call = """            import datetime
            fecha_caducidad_obj = None
            if p_fechacaducidad:
                fecha_caducidad_obj = datetime.datetime.strptime(p_fechacaducidad, '%Y-%m-%d')
            
            kwargs = {
                'P_CODDOCUMENTO': p_coddocumento,
                'P_CODARTICULO': p_codarticulo,
                'P_CANTSOLICITADA': p_unidades,
                'P_CANTSOLICITADAORIGINAL': p_unidades,
                'P_UNIDADES': p_unidades,
                'P_CANTSEGUNDAUNIDADSERV': 0,
                'P_PRECIO': 0,
                'P_NUMEROLOTE': p_numlote,
                'P_FECHACADUCIDAD': fecha_caducidad_obj,
                'P_OBSERVACIONES': None,
                'P_NUMDOCUMENTOENTRADA': None,
                'P_GESTIONARSEGUNDAUNID': 0,
                'P_CODOPERADOR': p_codoperador,
                'P_CODTIPOUNIDAD': 1,
                'P_FACTORCONVESRIONTIPOUNIDAD': 1,
                'P_TIPOCONVFACTCONVSEGUNUNID': 0,
                'P_FACTORCONVSEGUNDUNID': 0,
                'P_CADCODNUMEROSSERIE': None,
                'P_TIPOCODIGOINTRODUCIDO': None,
                'P_CODIGOINTRODUCIDO': None,
                'P_CODLINEADOCUMENTOPROV': None,
                'P_CODNUMEROLOTE': None,
                'P_CADPROPIETARIOS': None,
                'P_CANTIDADTIPOUNIDAD': p_unidades,
                'P_TARATIPOUNIDAD': 0,
                'P_PESOBRUTO': 0,
                'P_PESONETO': 0,
                'P_PESOTARA': 0
            }
            
            res = cursor.callfunc('GSM.SPEME_REALIZARENTRADAMERCANCIA', int, keywordParameters=kwargs)
            if res != 0:
                raise Exception(f"SP Error: {res}")
                
            conn.commit()
            return p_coddocumento"""

content = old_sp_call_regex.sub(new_sp_call, content)

with open('app/repositories/entradas_repo.py', 'w', encoding='utf-8') as f:
    f.write(content)
