import logging
from typing import List, Dict, Any, Tuple, Optional
from ..database import OracleDatabase

logger = logging.getLogger(__name__)

class FilterService:
    @staticmethod
    def get_filtros_por_tipo(cod_def_filtro: int, cod_operador: int = -1) -> List[Dict[str, Any]]:
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
    def _build_single_condition(
        datafield: str, 
        valor_str: str, 
        comparacion: int, 
        subselect: Optional[str], 
        filterfield: Optional[str], 
        bind_param_prefix: str, 
        field_index: str,
        params: Dict[str, Any],
        prefix: str
    ) -> Optional[str]:
        if not datafield or not valor_str:
            return None
            
        if "." not in datafield:
            datafield = f"{prefix}{datafield}"
            
        valores_lista = [v.strip() for v in str(valor_str).split(",") if v.strip()]
        if not valores_lista:
            return None
        
        bind_keys = []
        for j, v in enumerate(valores_lista):
            bind_key = f"{bind_param_prefix}{field_index}_{j}"
            bind_keys.append(f":{bind_key}")
            params[bind_key] = v
            
        in_clause = ", ".join(bind_keys)
        op = "NOT IN" if comparacion == 2 else "IN"
        
        if subselect and subselect.strip():
            sub = subselect.strip()
            connector = " AND " if "WHERE" in sub.upper() else " WHERE "
            filterfield = filterfield or datafield
            return f"{datafield} {op} ({sub} {connector} {filterfield} IN ({in_clause}))"
            
        return f"{datafield} {op} ({in_clause})"

    @staticmethod
    def build_filter_condition(codfiltro: int, bind_param_prefix: str = "f_", table_alias: str = "") -> Tuple[str, Dict[str, Any], Optional[int]]:
        if not codfiltro:
            return "", {}, None

        query_def = """
            SELECT F.CODDEFFILTRO, DCF.DATAFIELD, CF.VALOR, DCF.SUBSELECT, DCF.FILTERFIELD, CF.CODTIPOCOMPARACIONFILTRO
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
                cond = FilterService._build_single_condition(
                    datafield=campo.get("DATAFIELD"),
                    valor_str=campo.get("VALOR", ""),
                    comparacion=campo.get("CODTIPOCOMPARACIONFILTRO", 1),
                    subselect=campo.get("SUBSELECT"),
                    filterfield=campo.get("FILTERFIELD"),
                    bind_param_prefix=bind_param_prefix,
                    field_index=str(i),
                    params=params,
                    prefix=prefix
                )
                if cond:
                    sql_parts.append(cond)
                
            if sql_parts:
                return " AND " + " AND ".join(sql_parts), params, cod_def_filtro
            return "", {}, cod_def_filtro
            
        except Exception as e:
            logger.error(f"Error construyendo query dinámica del filtro {codfiltro}: {e}", exc_info=True)
            return "", {}, None

    @staticmethod
    def get_definicion_campos(cod_def_filtro: int) -> List[Dict[str, Any]]:
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
    def build_custom_filter_condition(cod_def_filtro: int, custom_values: Dict[str, Any], bind_param_prefix: str = "c_", table_alias: str = "") -> Tuple[str, Dict[str, Any]]:
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
            
            req_data = custom_values[cod_def_campo]
            if isinstance(req_data, dict):
                valor_str = str(req_data.get("valor", "")).strip()
                comparacion = int(req_data.get("comparacion", 1))
            else:
                valor_str = str(req_data).strip()
                comparacion = 1

            cond = FilterService._build_single_condition(
                datafield=campo.get("DATAFIELD"),
                valor_str=valor_str,
                comparacion=comparacion,
                subselect=campo.get("SUBSELECT"),
                filterfield=campo.get("FILTERFIELD"),
                bind_param_prefix=bind_param_prefix,
                field_index=cod_def_campo,
                params=params,
                prefix=prefix
            )
            
            if cond:
                sql_parts.append(cond)
            
        if sql_parts:
            return " AND " + " AND ".join(sql_parts), params
        return "", {}

    @staticmethod
    def crear_filtro(cod_def_filtro: int, descripcion: str, cod_operador: int, custom_values: Dict[str, Any]) -> Dict[str, Any]:
        try:
            with OracleDatabase.get_cursor(commit=True) as cursor:
                cursor.execute("SELECT NVL(MAX(CODFILTRO), 0) + 1 FROM GSM.TMST_FILTROS")
                nuevo_cod = cursor.fetchone()[0]
                
                cursor.execute("""
                    INSERT INTO GSM.TMST_FILTROS (CODFILTRO, CODDEFFILTRO, DESCRIPCION, CODOPERADOR, PRM_SISTEMA)
                    VALUES (:1, :2, :3, :4, 0)
                """, (nuevo_cod, cod_def_filtro, descripcion, cod_operador))
                
                codcampo = 1
                for cod_def_campo, req_data in custom_values.items():
                    if isinstance(req_data, dict):
                        val = str(req_data.get("valor", "")).strip()
                        comp = int(req_data.get("comparacion", 1))
                    else:
                        val = str(req_data).strip()
                        comp = 1
                        
                    if val:
                        cursor.execute("""
                            INSERT INTO GSM.TMST_CAMPOSFILTRO (CODFILTRO, CODCAMPO, CODDEFFILTRO, CODDEFCAMPO, VALOR, CODTIPOCOMPARACIONFILTRO, NUMEROGRUPO, CODOPERADORLOGICO)
                            VALUES (:1, :2, :3, :4, :5, :6, 0, 1)
                        """, (nuevo_cod, codcampo, cod_def_filtro, int(cod_def_campo), val, comp))
                        codcampo += 1
                        
                return {"status": "success", "codfiltro": nuevo_cod}
        except Exception as e:
            logger.error(f"Error guardando filtro personalizado: {e}", exc_info=True)
            return {"status": "error", "message": str(e)}
