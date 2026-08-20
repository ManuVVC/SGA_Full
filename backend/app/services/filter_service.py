import logging
from ..database import OracleDatabase

logger = logging.getLogger(__name__)

class FilterService:
    @staticmethod
    def get_filtros_por_tipo(cod_def_filtro: int, cod_operador: int = -1):
        """
        Devuelve la lista de filtros disponibles para un módulo específico.
        cod_def_filtro identifica el módulo (ej. 1 para Inbound, etc.)
        cod_operador = -1 suele indicar filtros del sistema (PRM_SISTEMA = -1) o comunes.
        """
        # Según la estructura, TMST_FILTROS tiene CODDEFFILTRO, DESCRIPCION, PRM_SISTEMA, CODOPERADOR
        query = """
            SELECT CODFILTRO, DESCRIPCION, PRM_SISTEMA, CODOPERADOR 
            FROM GSM.TMST_FILTROS 
            WHERE CODDEFFILTRO = :def_filtro
            ORDER BY DESCRIPCION ASC
        """
        try:
            return OracleDatabase.execute_query(query, {"def_filtro": cod_def_filtro}, as_dict=True)
        except Exception as e:
            logger.error(f"Error recuperando filtros: {e}", exc_info=True)
            return []

    @staticmethod
    def build_filter_condition(codfiltro: int, bind_param_prefix: str = "f_", table_alias: str = ""):
        """
        Lee la configuración y construye una condición SQL.
        Devuelve: (sql_condition_string, params_dict, cod_def_filtro)
        """
        if not codfiltro:
            return "", {}, None

        query_def = """
            SELECT F.CODDEFFILTRO, DCF.DATAFIELD, CF.VALOR, DCF.SUBSELECT, DCF.FILTERFIELD
            FROM GSM.TMST_FILTROS F
            INNER JOIN GSM.TMST_CAMPOSFILTRO CF ON CF.CODFILTRO = F.CODFILTRO
            INNER JOIN GSM.TSYS_DEFINICIONCAMPOSFILTRO DCF 
                ON DCF.CODDEFFILTRO = CF.CODDEFFILTRO 
               AND DCF.CODDEFCAMPO = CF.CODDEFCAMPO
            WHERE F.CODFILTRO = :codfiltro
        """
        
        try:
            campos = OracleDatabase.execute_query(query_def, {"codfiltro": codfiltro}, as_dict=True)
            if not campos:
                return "", {}, None

            cod_def_filtro = campos[0].get("CODDEFFILTRO")
            sql_parts = []
            params = {}
            
            prefix = f"{table_alias}." if table_alias else ""
            
            for i, campo in enumerate(campos):
                datafield = campo.get("DATAFIELD")
                valor_str = campo.get("VALOR", "")
                subselect = campo.get("SUBSELECT")
                filterfield = campo.get("FILTERFIELD")
                
                if not datafield or not valor_str:
                    continue
                    
                # Si el datafield ya tiene alias, no ponemos el nuestro
                if "." not in datafield:
                    datafield = f"{prefix}{datafield}"
                    
                valores_lista = [v.strip() for v in str(valor_str).split(",") if v.strip()]
                if not valores_lista:
                    continue
                
                bind_keys = []
                for j, v in enumerate(valores_lista):
                    bind_key = f"{bind_param_prefix}{i}_{j}"
                    bind_keys.append(f":{bind_key}")
                    params[bind_key] = v
                    
                in_clause = ", ".join(bind_keys)
                
                if subselect and subselect.strip():
                    sub = subselect.strip()
                    connector = " AND " if "WHERE" in sub.upper() else " WHERE "
                    if not filterfield: 
                        filterfield = datafield
                    cond = f"{datafield} IN ({sub} {connector} {filterfield} IN ({in_clause}))"
                else:
                    cond = f"{datafield} IN ({in_clause})"
                
                sql_parts.append(cond)
                
            if sql_parts:
                return " AND " + " AND ".join(sql_parts), params, cod_def_filtro
            return "", {}, cod_def_filtro
            
        except Exception as e:
            logger.error(f"Error construyendo query dinámica del filtro {codfiltro}: {e}", exc_info=True)
            return "", {}, None

    @staticmethod
    def get_definicion_campos(cod_def_filtro: int):
        """Devuelve los campos permitidos para un tipo de filtro específico."""
        query = """
            SELECT CODDEFFILTRO, CODDEFCAMPO, DESCRIPCIONCAMPO, DATAFIELD, CODTIPOCAMPOFILTRO, 
                   SUBSELECT, FILTERFIELD
            FROM GSM.TSYS_DEFINICIONCAMPOSFILTRO 
            WHERE CODDEFFILTRO = :def_filtro
            ORDER BY CODDEFCAMPO
        """
        try:
            return OracleDatabase.execute_query(query, {"def_filtro": cod_def_filtro}, as_dict=True)
        except Exception as e:
            logger.error(f"Error recuperando definición de campos de filtro {cod_def_filtro}: {e}")
            return []

    @staticmethod
    def build_custom_filter_condition(cod_def_filtro: int, custom_values: dict, bind_param_prefix: str = "c_", table_alias: str = ""):
        """Construye una condición SQL en base a un diccionario de valores introducidos manualmente."""
        if not custom_values:
            return "", {}
        
        campos = FilterService.get_definicion_campos(cod_def_filtro)
        if not campos:
            return "", {}
            
        sql_parts = []
        params = {}
        prefix = f"{table_alias}." if table_alias else ""
        
        for campo in campos:
            cod_def_campo = str(campo["CODDEFCAMPO"])
            if cod_def_campo not in custom_values:
                continue
                
            valor_str = str(custom_values[cod_def_campo]).strip()
            if not valor_str:
                continue
                
            datafield = campo.get("DATAFIELD")
            subselect = campo.get("SUBSELECT")
            filterfield = campo.get("FILTERFIELD")
            
            if not datafield:
                continue
                
            if "." not in datafield:
                datafield = f"{prefix}{datafield}"
                
            valores_lista = [v.strip() for v in valor_str.split(",") if v.strip()]
            if not valores_lista:
                continue
                
            bind_keys = []
            for j, v in enumerate(valores_lista):
                bind_key = f"{bind_param_prefix}{cod_def_campo}_{j}"
                bind_keys.append(f":{bind_key}")
                params[bind_key] = v
                
            in_clause = ", ".join(bind_keys)
            
            if subselect and subselect.strip():
                sub = subselect.strip()
                connector = " AND " if "WHERE" in sub.upper() else " WHERE "
                if not filterfield: 
                    filterfield = datafield
                cond = f"{datafield} IN ({sub} {connector} {filterfield} IN ({in_clause}))"
            else:
                cond = f"{datafield} IN ({in_clause})"
            
            sql_parts.append(cond)
            
        if sql_parts:
            return " AND " + " AND ".join(sql_parts), params
        return "", {}

    @staticmethod
    def crear_filtro(cod_def_filtro: int, descripcion: str, cod_operador: int, custom_values: dict):
        """Guarda un filtro personalizado en las tablas TMST_FILTROS y TMST_CAMPOSFILTRO."""
        try:
            with OracleDatabase.get_cursor(commit=True) as cursor:
                # Obtener nuevo CODFILTRO
                cursor.execute("SELECT NVL(MAX(CODFILTRO), 0) + 1 FROM GSM.TMST_FILTROS")
                nuevo_cod = cursor.fetchone()[0]
                
                # Insertar cabecera
                cursor.execute("""
                    INSERT INTO GSM.TMST_FILTROS (CODFILTRO, CODDEFFILTRO, DESCRIPCION, CODOPERADOR, PRM_SISTEMA)
                    VALUES (:1, :2, :3, :4, 0)
                """, (nuevo_cod, cod_def_filtro, descripcion, cod_operador))
                
                # Insertar detalle por cada campo relleno
                for cod_def_campo, valor in custom_values.items():
                    val = str(valor).strip()
                    if val:
                        cursor.execute("""
                            INSERT INTO GSM.TMST_CAMPOSFILTRO (CODFILTRO, CODDEFFILTRO, CODDEFCAMPO, VALOR)
                            VALUES (:1, :2, :3, :4)
                        """, (nuevo_cod, cod_def_filtro, int(cod_def_campo), val))
                        
                return {"status": "success", "codfiltro": nuevo_cod}
        except Exception as e:
            logger.error(f"Error guardando filtro personalizado: {e}")
            return {"status": "error", "message": str(e)}
