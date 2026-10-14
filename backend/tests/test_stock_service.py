import pytest
from unittest.mock import patch
from app.services.stock_service import StockService
from app.utils.exceptions import ArticuloNotFoundError

# Definimos mock_exceptions para EanNoEncontrado en caso de que no esté importable directamente o para forzarla.
class EanNoEncontradoMock(Exception):
    pass

class TestStockService:

    @patch('app.services.stock_service.StockRepository')
    def test_consultar_stock_articulo_success(self, mock_repo):
        # Arrange
        mock_repo.get_articulo_por_codigo.return_value = {
            "CODARTICULO": 1,
            "CODARTICULOAPLICACION": "ART01",
            "NOMBREARTICULO": "Articulo de prueba",
            "CODREALFABRICANTE": "FAB01"
        }
        mock_repo.get_stock_por_articulo.return_value = [
            {"ubicacion": "A1", "cantidad": 10},
            {"ubicacion": "A2", "cantidad": 5}
        ]
        
        # Act
        result = StockService.consultar_stock_articulo("ART01")
        
        # Assert
        assert result["tiene_stock"] is True
        assert result["stock_total"] == 15
        assert result["articulo"]["cod_articulo"] == 1
        assert len(result["ubicaciones"]) == 2
        mock_repo.get_articulo_por_codigo.assert_called_once_with("ART01")
        mock_repo.get_stock_por_articulo.assert_called_once_with(1)

    def test_consultar_stock_articulo_empty_code(self):
        # Act & Assert
        with pytest.raises(ArticuloNotFoundError, match="El código del artículo no puede estar vacío."):
            StockService.consultar_stock_articulo("")

    @patch('app.services.stock_service.StockRepository')
    def test_consultar_stock_articulo_not_found(self, mock_repo):
        # Arrange
        mock_repo.get_articulo_por_codigo.return_value = None
        
        # Act & Assert
        with pytest.raises(ArticuloNotFoundError, match="El artículo 'NOEXISTE' no existe en el maestro del sistema."):
            StockService.consultar_stock_articulo("NOEXISTE")

    @patch('app.services.stock_service.StockRepository')
    def test_consultar_stock_articulo_no_stock(self, mock_repo):
        # Arrange
        mock_repo.get_articulo_por_codigo.return_value = {
            "CODARTICULO": 1,
            "CODARTICULOAPLICACION": "ART01",
            "NOMBREARTICULO": "Articulo de prueba"
        }
        mock_repo.get_stock_por_articulo.return_value = []
        
        # Act
        result = StockService.consultar_stock_articulo("ART01")
        
        # Assert
        assert result["tiene_stock"] is False
        assert result["stock_total"] == 0

    @patch('app.services.stock_service.StockRepository')
    def test_actualizar_configuracion_ubicacion_success(self, mock_repo):
        # Arrange
        mock_repo.actualizar_configuracion_ubicacion.return_value = True
        
        # Act
        result = StockService.actualizar_configuracion_ubicacion(10, 1, 0, 1)
        
        # Assert
        assert result["status"] == "success"
        mock_repo.actualizar_configuracion_ubicacion.assert_called_once_with(10, 1, 0, 1)

    @patch('app.services.stock_service.StockRepository')
    def test_actualizar_configuracion_ubicacion_fail(self, mock_repo):
        # Arrange
        mock_repo.actualizar_configuracion_ubicacion.return_value = False
        
        # Act & Assert
        with pytest.raises(ValueError, match="No se pudo actualizar la configuración de la ubicación 10."):
            StockService.actualizar_configuracion_ubicacion(10, 1, 0, 1)

    def test_actualizar_configuracion_ubicacion_empty_code(self):
        # Act & Assert
        with pytest.raises(ValueError, match="El código de ubicación no puede estar vacío."):
            StockService.actualizar_configuracion_ubicacion(None, 1, 0, 1)

    @patch('app.services.stock_service.StockRepository')
    def test_consultar_stock_ubicacion_success(self, mock_repo):
        # Arrange
        mock_repo.get_stock_por_ubicacion.return_value = [
            {"articulo": "ART1", "stock": 5},
            {"articulo": "ART2", "stock": 15}
        ]
        
        # Act
        result = StockService.consultar_stock_ubicacion(20)
        
        # Assert
        assert result["tiene_stock"] is True
        assert result["stock_total"] == 20
        assert len(result["articulos"]) == 2

    def test_consultar_stock_ubicacion_empty_code(self):
        with pytest.raises(ValueError, match="El código de ubicación no puede estar vacío."):
            StockService.consultar_stock_ubicacion(None)

    @patch('app.services.stock_service.StockRepository')
    @patch('app.utils.exceptions.EanNoEncontrado', EanNoEncontradoMock, create=True) # En caso de mockear si falla la importación, aquí probamos con su exception
    def test_consultar_stock_ean_success(self, mock_repo):
        try:
            from app.utils.exceptions import EanNoEncontrado
        except ImportError:
            EanNoEncontrado = Exception

        # Arrange
        mock_repo.get_articulo_por_ean.return_value = {
            "CODARTICULO": 100,
            "CODARTICULOAPLICACION": "ART-EAN",
            "NOMBREARTICULO": "EAN TEST"
        }
        mock_repo.get_stock_por_articulo.return_value = [{"ubicacion": "B1", "cantidad": 50}]
        
        # Act
        result = StockService.consultar_stock_ean("1234567890123")
        
        # Assert
        assert result["articulo_comercial"] == "ART-EAN"
        assert result["ubicaciones"][0]["cantidad"] == 50

    @patch('app.services.stock_service.StockRepository')
    def test_search_articulos(self, mock_repo):
        # Arrange
        mock_repo.search_articulos.return_value = [{
            "CODARTICULO": 1,
            "CODARTICULOAPLICACION": "ART",
            "NOMBREARTICULO": "Name",
            "FACTORCONVERSION": 2
        }]
        
        # Act
        result = StockService.search_articulos("nombre", "query")
        
        # Assert
        assert len(result) == 1
        assert result[0]["cod_articulo"] == 1
        assert result[0]["factor_conversion"] == 2

    def test_search_articulos_empty_query(self):
        # Act
        result = StockService.search_articulos("nombre", "")
        # Assert
        assert result == []

    @patch('app.services.stock_service.StockRepository')
    def test_consultar_eans_articulo(self, mock_repo):
        # Arrange
        mock_repo.get_eans_por_articulo.return_value = ["123", "456"]
        
        # Act
        result = StockService.consultar_eans_articulo(1)
        
        # Assert
        assert result == ["123", "456"]

    def test_consultar_eans_articulo_empty(self):
        # Act
        result = StockService.consultar_eans_articulo(None)
        # Assert
        assert result == []
