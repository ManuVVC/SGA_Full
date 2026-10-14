import pytest
from unittest.mock import patch, MagicMock
from app.services.filter_service import FilterService

class TestFilterService:
    @patch('app.services.filter_service.OracleDatabase.execute_query')
    def test_get_filtros_por_tipo(self, mock_execute):
        mock_execute.return_value = [{"CODFILTRO": 1, "DESCRIPCION": "Test"}]
        result = FilterService.get_filtros_por_tipo(1)
        assert result == [{"CODFILTRO": 1, "DESCRIPCION": "Test"}]
        
    @patch('app.services.filter_service.OracleDatabase.execute_query')
    def test_build_filter_condition(self, mock_execute):
        mock_execute.return_value = [
            {
                "CODDEFFILTRO": 10,
                "DATAFIELD": "STATUS",
                "VALOR": "A,B",
                "SUBSELECT": None,
                "FILTERFIELD": None,
                "CODTIPOCOMPARACIONFILTRO": 1
            }
        ]
        
        sql_cond, params, cod_def = FilterService.build_filter_condition(1, table_alias="T")
        assert cod_def == 10
        assert "T.STATUS IN (:f_0_0, :f_0_1)" in sql_cond
        assert params == {"f_0_0": "A", "f_0_1": "B"}

    @patch('app.services.filter_service.FilterService.get_definicion_campos')
    def test_build_custom_filter_condition(self, mock_get_campos):
        mock_get_campos.return_value = [
            {
                "CODDEFCAMPO": 1,
                "DATAFIELD": "TIPO",
                "SUBSELECT": None,
                "FILTERFIELD": None
            }
        ]
        
        custom_values = {"1": "V1,V2"}
        sql_cond, params = FilterService.build_custom_filter_condition(10, custom_values, table_alias="T")
        
        assert "T.TIPO IN (:c_1_0, :c_1_1)" in sql_cond
        assert params == {"c_1_0": "V1", "c_1_1": "V2"}

    @patch('app.services.filter_service.OracleDatabase.get_cursor')
    def test_crear_filtro(self, mock_get_cursor):
        mock_cursor = MagicMock()
        mock_get_cursor.return_value.__enter__.return_value = mock_cursor
        mock_cursor.fetchone.return_value = [99] # New ID
        
        custom_values = {"1": "V1"}
        result = FilterService.crear_filtro(10, "Test Filtro", 1, custom_values)
        
        assert result == {"status": "success", "codfiltro": 99}
        assert mock_cursor.execute.call_count == 3 # ID gen, cabecera, detalle
