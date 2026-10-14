import pytest
import json
import datetime
from unittest.mock import patch, MagicMock
from app.services.informes_config_service import InformesConfigService

class DummyClob:
    def __init__(self, data):
        self._data = data
    def read(self):
        return self._data

class TestInformesConfigService:

    def test_parse_json_fields_empty(self):
        assert InformesConfigService._parse_json_fields(None) is None
        assert InformesConfigService._parse_json_fields({}) == {}

    def test_parse_json_fields_valid(self):
        informe = {
            "COLUMNAS_CONFIG": json.dumps([{"col": "A"}]),
            "SQL_QUERY": DummyClob("SELECT * FROM dual")
        }
        res = InformesConfigService._parse_json_fields(informe)
        assert res["COLUMNAS_CONFIG"] == [{"col": "A"}]
        assert res["SQL_QUERY"] == "SELECT * FROM dual"

    def test_parse_json_fields_invalid_json(self):
        informe = {
            "COLUMNAS_CONFIG": "invalid_json"
        }
        res = InformesConfigService._parse_json_fields(informe)
        assert res["COLUMNAS_CONFIG"] == []

    @patch('app.services.informes_config_service.InformesConfigRepo')
    def test_get_all(self, mock_repo):
        mock_repo.get_all.return_value = [{"COLUMNAS_CONFIG": '[]'}]
        res = InformesConfigService.get_all()
        assert len(res) == 1
        assert res[0]["COLUMNAS_CONFIG"] == []
        mock_repo.get_all.assert_called_once_with(False)

    @patch('app.services.informes_config_service.InformesConfigRepo')
    def test_get_by_id(self, mock_repo):
        mock_repo.get_by_id.return_value = {"ID": 1, "COLUMNAS_CONFIG": '[]'}
        res = InformesConfigService.get_by_id(1)
        assert res["ID"] == 1
        assert res["COLUMNAS_CONFIG"] == []

    @patch('app.services.informes_config_service.InformesConfigRepo')
    def test_create(self, mock_repo):
        mock_repo.create.return_value = 1
        res = InformesConfigService.create({"columnas_config": [{"col": "A"}]})
        assert res == 1
        mock_repo.create.assert_called_once_with({"columnas_config": '[{"col": "A"}]'})

    @patch('app.services.informes_config_service.InformesConfigRepo')
    def test_update(self, mock_repo):
        mock_repo.update.return_value = True
        res = InformesConfigService.update(1, {"columnas_config": [{"col": "B"}]})
        assert res is True
        mock_repo.update.assert_called_once_with(1, {"columnas_config": '[{"col": "B"}]'})

    @patch('app.services.informes_config_service.InformesConfigRepo')
    def test_delete(self, mock_repo):
        mock_repo.delete.return_value = True
        assert InformesConfigService.delete(1) is True

    @patch('app.services.informes_config_service.InformesConfigRepo')
    @patch('app.services.informes_config_service.OracleDatabase')
    def test_ejecutar_informe_success(self, mock_db, mock_repo):
        mock_repo.get_by_id.return_value = {"SQL_QUERY": "SELECT ID, FECHA FROM TABLA"}
        
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_db.get_connection.return_value = mock_conn
        mock_conn.cursor.return_value = mock_cursor
        
        mock_cursor.description = [("ID",), ("FECHA",)]
        mock_cursor.fetchall.return_value = [
            (1, datetime.datetime(2023, 1, 1, 12, 0, 0)),
            (2, datetime.date(2023, 1, 2))
        ]
        
        res = InformesConfigService.ejecutar_informe(1)
        
        assert res["total"] == 2
        assert res["columns"] == ["ID", "FECHA"]
        assert res["data"][0] == {"ID": 1, "FECHA": "2023-01-01 12:00:00"}
        assert res["data"][1] == {"ID": 2, "FECHA": "2023-01-02"}

    @patch('app.services.informes_config_service.InformesConfigRepo')
    def test_ejecutar_informe_not_found(self, mock_repo):
        mock_repo.get_by_id.return_value = None
        with pytest.raises(ValueError, match="Informe no encontrado"):
            InformesConfigService.ejecutar_informe(1)

    @patch('app.services.informes_config_service.InformesConfigRepo')
    def test_ejecutar_informe_invalid_sql(self, mock_repo):
        mock_repo.get_by_id.return_value = {"SQL_QUERY": "UPDATE TABLA SET VAL=1"}
        with pytest.raises(ValueError, match="La consulta SQL solo permite SELECT o WITH"):
            InformesConfigService.ejecutar_informe(1)

    @patch('app.services.informes_config_service.InformesConfigRepo')
    def test_ejecutar_informe_prohibited_keyword(self, mock_repo):
        mock_repo.get_by_id.return_value = {"SQL_QUERY": "SELECT * FROM TABLA; DROP TABLE TABLA"}
        with pytest.raises(ValueError, match="Consulta rechazada: palabra no permitida"):
            InformesConfigService.ejecutar_informe(1)

    @patch('app.services.informes_config_service.InformesConfigRepo')
    def test_get_preferencias_usuario(self, mock_repo):
        mock_repo.get_preferencias_usuario.return_value = {
            "COLUMNAS_VISIBLES": '["A"]',
            "ORDEN_COLUMNAS": DummyClob('["A", "B"]')
        }
        res = InformesConfigService.get_preferencias_usuario(1, "OP1")
        assert res["COLUMNAS_VISIBLES"] == ["A"]
        assert res["ORDEN_COLUMNAS"] == ["A", "B"]

    @patch('app.services.informes_config_service.InformesConfigRepo')
    def test_save_preferencias_usuario(self, mock_repo):
        mock_repo.save_preferencias_usuario.return_value = True
        res = InformesConfigService.save_preferencias_usuario(1, "OP1", ["A"], ["A", "B"])
        assert res is True
        mock_repo.save_preferencias_usuario.assert_called_once_with(1, "OP1", '["A"]', '["A", "B"]')
