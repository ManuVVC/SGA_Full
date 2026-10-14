import pytest
from unittest.mock import patch
from app.services.ajustes_stock_service import StockAjustesService
from datetime import datetime

class TestStockAjustesService:
    @patch('app.services.ajustes_stock_service.StockAjustesRepository.get_conceptos')
    def test_get_conceptos(self, mock_get_conceptos):
        mock_get_conceptos.return_value = [{'id': 1, 'desc': 'Concepto 1'}]
        result = StockAjustesService.get_conceptos()
        assert result == [{'id': 1, 'desc': 'Concepto 1'}]
        mock_get_conceptos.assert_called_once()

    @patch('app.services.ajustes_stock_service.StockAjustesRepository.get_lotes_articulo_ubicacion')
    def test_get_lotes(self, mock_get_lotes):
        mock_get_lotes.return_value = [
            {'ID': 1, 'FECHACADUCIDAD': datetime(2025, 12, 31)},
            {'ID': 2, 'FECHACADUCIDAD': None}
        ]
        result = StockAjustesService.get_lotes(10, 20)
        assert len(result) == 2
        assert result[0]['FECHACADUCIDAD_STR'] == '2025-12-31'
        assert result[1]['FECHACADUCIDAD_STR'] == ''
        mock_get_lotes.assert_called_once_with(10, 20)

    @patch('app.services.ajustes_stock_service.StockAjustesRepository.ejecutar_ajuste')
    def test_ejecutar_ajuste_success(self, mock_ejecutar_ajuste):
        mock_ejecutar_ajuste.return_value = 0
        payload = {
            'fechaCaducidad': '2025-01-01',
            'codArticulo': 1,
            'codConcepto': 2,
            'cantidad': 10,
            'cantSegundaUnidad': 0,
            'lote': 'LOTE1',
            'codUbicacion': 5
        }
        result = StockAjustesService.ejecutar_ajuste(payload, 100, 200)
        assert result == {"status": "success", "result_code": 0}
        
        # Verify the formatting logic
        called_args = mock_ejecutar_ajuste.call_args[0][0]
        assert called_args['cod_terminal'] == 200
        assert called_args['cod_operador'] == 100
        assert called_args['fecha_caducidad'] == datetime(2025, 1, 1)

    @patch('app.services.ajustes_stock_service.StockAjustesRepository.ejecutar_ajuste')
    def test_ejecutar_ajuste_invalid_date(self, mock_ejecutar_ajuste):
        mock_ejecutar_ajuste.return_value = 0
        payload = {'fechaCaducidad': 'invalid-date'}
        result = StockAjustesService.ejecutar_ajuste(payload, 100, 200)
        
        called_args = mock_ejecutar_ajuste.call_args[0][0]
        assert called_args['fecha_caducidad'] is None
