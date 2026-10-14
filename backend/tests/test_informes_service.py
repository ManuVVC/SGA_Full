import pytest
import json
import os
from unittest.mock import patch, mock_open
from app.services.informes_service import InformesService

@pytest.fixture
def dummy_data_file(tmp_path):
    data_dir = tmp_path / "data"
    data_dir.mkdir()
    data_file = data_dir / "informes.json"
    data_file.write_text("[]", encoding="utf-8")
    return str(data_file)

class TestInformesService:
    def test_get_informes_empty(self, dummy_data_file):
        with patch('app.services.informes_service.DATA_FILE', dummy_data_file):
            informes = InformesService.get_informes()
            assert informes == []

    def test_get_informes_with_data(self, dummy_data_file):
        with open(dummy_data_file, "w", encoding="utf-8") as f:
            json.dump([{"id": "1", "nombre": "Test"}], f)
            
        with patch('app.services.informes_service.DATA_FILE', dummy_data_file):
            informes = InformesService.get_informes()
            assert len(informes) == 1
            assert informes[0]["nombre"] == "Test"

    def test_save_informe_new(self, dummy_data_file):
        with patch('app.services.informes_service.DATA_FILE', dummy_data_file):
            informe_to_save = {"nombre": "Nuevo"}
            result = InformesService.save_informe(informe_to_save)
            
            assert "id" in result
            assert result["nombre"] == "Nuevo"
            
            # Verify it was saved
            informes = InformesService.get_informes()
            assert len(informes) == 1
            assert informes[0]["id"] == result["id"]

    def test_save_informe_update(self, dummy_data_file):
        with open(dummy_data_file, "w", encoding="utf-8") as f:
            json.dump([{"id": "1", "nombre": "Original"}], f)
            
        with patch('app.services.informes_service.DATA_FILE', dummy_data_file):
            informe_to_update = {"id": "1", "nombre": "Actualizado"}
            result = InformesService.save_informe(informe_to_update)
            
            assert result["id"] == "1"
            assert result["nombre"] == "Actualizado"
            
            informes = InformesService.get_informes()
            assert len(informes) == 1
            assert informes[0]["nombre"] == "Actualizado"

    def test_delete_informe_exists(self, dummy_data_file):
        with open(dummy_data_file, "w", encoding="utf-8") as f:
            json.dump([{"id": "1", "nombre": "Para Borrar"}], f)
            
        with patch('app.services.informes_service.DATA_FILE', dummy_data_file):
            result = InformesService.delete_informe("1")
            assert result is True
            
            informes = InformesService.get_informes()
            assert len(informes) == 0

    def test_delete_informe_not_exists(self, dummy_data_file):
        with open(dummy_data_file, "w", encoding="utf-8") as f:
            json.dump([{"id": "1", "nombre": "Para Borrar"}], f)
            
        with patch('app.services.informes_service.DATA_FILE', dummy_data_file):
            result = InformesService.delete_informe("999")
            assert result is False
            
            informes = InformesService.get_informes()
            assert len(informes) == 1

    def test_get_informes_read_error(self):
        with patch('app.services.informes_service.os.path.exists', return_value=True):
            with patch('builtins.open', side_effect=Exception("Read error")):
                informes = InformesService.get_informes()
                assert informes == []

    def test_save_informe_write_error(self, dummy_data_file):
        with patch('app.services.informes_service.DATA_FILE', dummy_data_file):
            with patch('builtins.open', side_effect=Exception("Write error")):
                with pytest.raises(Exception, match="No se pudo guardar el informe"):
                    InformesService.save_informe({"nombre": "Test"})
