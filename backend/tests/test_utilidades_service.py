import pytest
from unittest.mock import patch, MagicMock
from app.services.utilidades_service import UtilidadesService

class TestUtilidadesService:
    @patch('app.services.utilidades_service.UtilidadesRepo')
    def test_get_ean_info_success_exists(self, mock_repo):
        # Arrange
        mock_repo.get_ean_info.return_value = {"ean": "123", "cod_articulo": 1, "factor": 1}
        
        # Act
        result = UtilidadesService.get_ean_info("123")
        
        # Assert
        assert result["status"] == "success"
        assert result["exists"] is True
        assert result["data"] == {"ean": "123", "cod_articulo": 1, "factor": 1}
        mock_repo.get_ean_info.assert_called_once_with("123")

    @patch('app.services.utilidades_service.UtilidadesRepo')
    def test_get_ean_info_success_not_exists(self, mock_repo):
        # Arrange
        mock_repo.get_ean_info.return_value = None
        
        # Act
        result = UtilidadesService.get_ean_info("999")
        
        # Assert
        assert result["status"] == "success"
        assert result["exists"] is False
        mock_repo.get_ean_info.assert_called_once_with("999")

    @patch('app.services.utilidades_service.UtilidadesRepo')
    def test_get_ean_info_exception(self, mock_repo):
        # Arrange
        mock_repo.get_ean_info.side_effect = Exception("DB Error")
        
        # Act & Assert
        with pytest.raises(Exception, match="Error al obtener información del EAN: DB Error"):
            UtilidadesService.get_ean_info("123")

    @patch('app.services.utilidades_service.UtilidadesRepo')
    def test_crear_ean_success(self, mock_repo):
        # Arrange
        mock_repo.get_ean_info.return_value = None
        
        # Act
        result = UtilidadesService.crear_ean("123", 1, 1)
        
        # Assert
        assert result["status"] == "success"
        assert result["message"] == "EAN creado exitosamente"
        mock_repo.insert_ean.assert_called_once_with("123", 1, 1)

    @patch('app.services.utilidades_service.UtilidadesRepo')
    def test_crear_ean_already_exists(self, mock_repo):
        # Arrange
        mock_repo.get_ean_info.return_value = {"ean": "123"}
        
        # Act
        result = UtilidadesService.crear_ean("123", 1, 1)
        
        # Assert
        assert result["status"] == "error"
        assert result["message"] == "El EAN ya existe"
        mock_repo.insert_ean.assert_not_called()

    @patch('app.services.utilidades_service.UtilidadesRepo')
    def test_crear_ean_exception(self, mock_repo):
        # Arrange
        mock_repo.get_ean_info.side_effect = Exception("DB Error")
        
        # Act & Assert
        with pytest.raises(Exception, match="Error al crear el EAN: DB Error"):
            UtilidadesService.crear_ean("123", 1, 1)

    @patch('app.services.utilidades_service.UtilidadesRepo')
    def test_actualizar_ean_success(self, mock_repo):
        # Arrange
        mock_repo.get_ean_info.return_value = {"ean": "123"}
        
        # Act
        result = UtilidadesService.actualizar_ean("123", 2, 2)
        
        # Assert
        assert result["status"] == "success"
        assert result["message"] == "EAN actualizado exitosamente"
        mock_repo.update_ean.assert_called_once_with("123", 2, 2)

    @patch('app.services.utilidades_service.UtilidadesRepo')
    def test_actualizar_ean_not_exists(self, mock_repo):
        # Arrange
        mock_repo.get_ean_info.return_value = None
        
        # Act
        result = UtilidadesService.actualizar_ean("123", 2, 2)
        
        # Assert
        assert result["status"] == "error"
        assert result["message"] == "El EAN no existe"
        mock_repo.update_ean.assert_not_called()

    @patch('app.services.utilidades_service.UtilidadesRepo')
    def test_actualizar_ean_exception(self, mock_repo):
        # Arrange
        mock_repo.get_ean_info.side_effect = Exception("DB Error")
        
        # Act & Assert
        with pytest.raises(Exception, match="Error al actualizar el EAN: DB Error"):
            UtilidadesService.actualizar_ean("123", 2, 2)
