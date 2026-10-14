import pytest
from unittest.mock import patch
from app.services.devoluciones_service import DevolucionesService

class TestDevolucionesService:
    @patch('app.services.devoluciones_service.DevolucionesRepository.get_clientes')
    def test_get_clientes(self, mock_get_clientes):
        mock_get_clientes.return_value = [{'id': 1, 'name': 'Cliente 1'}]
        assert DevolucionesService.get_clientes("") == []
        
        result = DevolucionesService.get_clientes("Cli")
        assert result == [{'id': 1, 'name': 'Cliente 1'}]
        mock_get_clientes.assert_called_once_with("Cli")

    @patch('app.services.devoluciones_service.DevolucionesRepository.get_parametros_devolucion')
    def test_get_parametros_devolucion(self, mock_get_params):
        mock_get_params.return_value = {"1636": "1", "1637": "U1", "1768": "S1"}
        result = DevolucionesService.get_parametros_devolucion()
        assert result == {
            "pedir_ubicacion": True,
            "cod_ubicacion_defecto": "U1",
            "serie": "S1"
        }

    @patch('app.services.devoluciones_service.DevolucionesRepository.crear_devolucion_cabecera')
    def test_crear_devolucion_cabecera_success(self, mock_crear):
        mock_crear.return_value = {"id": 100}
        result = DevolucionesService.crear_devolucion_cabecera({"CODCLIENTE": 5})
        assert result == {"id": 100}

    def test_crear_devolucion_cabecera_missing_client(self):
        with pytest.raises(ValueError, match="El código de cliente es obligatorio"):
            DevolucionesService.crear_devolucion_cabecera({"OTRO": 5})

    @patch('app.services.devoluciones_service.DevolucionesRepository.grabar_linea_devolucion')
    def test_grabar_linea_devolucion_success(self, mock_grabar):
        mock_grabar.return_value = {"status": "ok"}
        result = DevolucionesService.grabar_linea_devolucion({
            "CODDOCUMENTO": 1,
            "CODARTICULO": 2,
            "UNIDADES": 10
        })
        assert result == {"status": "ok"}

    def test_grabar_linea_devolucion_validation_errors(self):
        with pytest.raises(ValueError, match="El código de documento es obligatorio"):
            DevolucionesService.grabar_linea_devolucion({"CODARTICULO": 2, "UNIDADES": 10})
        
        with pytest.raises(ValueError, match="El código de artículo es obligatorio"):
            DevolucionesService.grabar_linea_devolucion({"CODDOCUMENTO": 1, "UNIDADES": 10})
            
        with pytest.raises(ValueError, match="La cantidad debe ser mayor que 0"):
            DevolucionesService.grabar_linea_devolucion({"CODDOCUMENTO": 1, "CODARTICULO": 2, "UNIDADES": 0})

    @patch('app.services.devoluciones_service.DevolucionesRepository.finalizar_devolucion')
    def test_finalizar_devolucion(self, mock_finalizar):
        result = DevolucionesService.finalizar_devolucion(1)
        assert result == {"status": "success", "message": "Devolución finalizada con éxito."}
        mock_finalizar.assert_called_once_with(1)
