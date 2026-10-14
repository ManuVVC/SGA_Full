import pytest
from unittest.mock import patch
from app.services.pedidos_service import PedidosService

class TestPedidosService:

    @patch('app.services.pedidos_service.PedidosRepository')
    def test_aparcar_documento_success(self, mock_repo):
        # Arrange
        mock_repo.aparcar_documento.return_value = {"status": "ok"}
        operador = {"cod_operador": 5}
        
        # Act
        result = PedidosService.aparcar_documento(10, operador)
        
        # Assert
        assert result == {"success": True, "res": {"status": "ok"}}
        mock_repo.aparcar_documento.assert_called_once_with(10, 5)

    @patch('app.services.pedidos_service.PedidosRepository')
    def test_aparcar_documento_default_operador(self, mock_repo):
        # Arrange
        mock_repo.aparcar_documento.return_value = {"status": "ok"}
        operador = {} # Sin cod_operador
        
        # Act
        result = PedidosService.aparcar_documento(10, operador)
        
        # Assert
        assert result == {"success": True, "res": {"status": "ok"}}
        mock_repo.aparcar_documento.assert_called_once_with(10, 1)

    @patch('app.services.pedidos_service.PedidosRepository')
    def test_aparcar_documento_exception(self, mock_repo):
        # Arrange
        mock_repo.aparcar_documento.side_effect = Exception("DB error")
        operador = {"cod_operador": 5}
        
        # Act & Assert
        with pytest.raises(Exception, match="No se pudo aparcar el documento: DB error"):
            PedidosService.aparcar_documento(10, operador)

    @patch('app.services.pedidos_service.PedidosRepository')
    @patch('app.services.pedidos_service.AuthRepository')
    def test_get_documentos_aparcados_success(self, mock_auth, mock_repo):
        # Arrange
        operador_context = {"cod_operador": 5, "terminal": 2}
        mock_auth.get_operador_por_codigo.return_value = {"permisos": {"PRM1": True}}
        mock_repo.get_documentos_aparcados.return_value = [{"doc": 1}]
        
        # Act
        result = PedidosService.get_documentos_aparcados(operador_context)
        
        # Assert
        assert result == [{"doc": 1}]
        mock_auth.get_operador_por_codigo.assert_called_once_with("5")
        mock_repo.get_documentos_aparcados.assert_called_once_with(5, 2, {"PRM1": True})

    @patch('app.services.pedidos_service.PedidosRepository')
    @patch('app.services.pedidos_service.AuthRepository')
    def test_get_documentos_aparcados_exception(self, mock_auth, mock_repo):
        # Arrange
        operador_context = {"cod_operador": 5, "terminal": 2}
        mock_auth.get_operador_por_codigo.return_value = None
        mock_repo.get_documentos_aparcados.side_effect = Exception("DB timeout")
        
        # Act & Assert
        with pytest.raises(Exception, match="No se pudieron obtener los documentos aparcados: DB timeout"):
            PedidosService.get_documentos_aparcados(operador_context)

    @patch('app.services.pedidos_service.PedidosRepository')
    def test_get_documentos_en_preparacion_success(self, mock_repo):
        # Arrange
        operador_context = {"cod_operador": 5, "terminal": 2}
        mock_repo.get_documentos_en_preparacion.return_value = [{"doc": 10}]
        
        # Act
        result = PedidosService.get_documentos_en_preparacion(operador_context)
        
        # Assert
        assert result == [{"doc": 10}]
        mock_repo.get_documentos_en_preparacion.assert_called_once_with(5, 2)

    @patch('app.services.pedidos_service.PedidosRepository')
    def test_get_documentos_en_preparacion_exception(self, mock_repo):
        # Arrange
        mock_repo.get_documentos_en_preparacion.side_effect = Exception("Error")
        
        # Act & Assert
        with pytest.raises(Exception, match="No se pudieron obtener los documentos en preparación: Error"):
            PedidosService.get_documentos_en_preparacion({})

    @patch('app.services.pedidos_service.PedidosRepository')
    def test_finalizar_documento_success(self, mock_repo):
        # Arrange
        operador_context = {"permisos": {"PRM_DESPRECIARRESTOSDOCCLI": True}}
        mock_repo.finalizar_documento.return_value = 0
        
        # Act
        result = PedidosService.finalizar_documento(100, operador_context, despreciar_restos=True, num_bultos=2)
        
        # Assert
        assert result == {"success": True, "codigo_resultado": 0}
        mock_repo.finalizar_documento.assert_called_once_with(100, -1, 2)

    @patch('app.services.pedidos_service.PedidosRepository')
    def test_finalizar_documento_sin_permiso_despreciar(self, mock_repo):
        # Arrange
        operador_context = {"permisos": {"PRM_DESPRECIARRESTOSDOCCLI": False}}
        mock_repo.finalizar_documento.return_value = 0
        
        # Act
        result = PedidosService.finalizar_documento(100, operador_context, despreciar_restos=True)
        
        # Assert
        assert result == {"success": True, "codigo_resultado": 0}
        mock_repo.finalizar_documento.assert_called_once_with(100, 0, None)

    @patch('app.services.pedidos_service.PedidosRepository')
    def test_get_lineas_documento_success(self, mock_repo):
        # Arrange
        mock_repo.get_lineas_documento.return_value = [{"linea": 1}]
        
        # Act
        result = PedidosService.get_lineas_documento(123)
        
        # Assert
        assert result == [{"linea": 1}]
        mock_repo.get_lineas_documento.assert_called_once_with(123)

    @patch('app.services.pedidos_service.PedidosRepository')
    @patch('app.services.pedidos_service.AuthRepository')
    def test_recuperar_documento_success_same_operator_and_terminal(self, mock_auth, mock_repo):
        # Arrange
        operador_context = {"cod_operador": 5}
        cod_terminal = 2
        mock_auth.get_operador_por_codigo.return_value = {"permisos": {"PRM_RECUPERARDOCUMENTOAPARCADO": True}}
        mock_repo.get_documento_estado.return_value = {"CODOPERADOR": 5, "CODTERMINAL": 2}
        mock_repo.recuperar_documento.return_value = 1
        
        # Act
        result = PedidosService.recuperar_documento(10, operador_context, cod_terminal)
        
        # Assert
        assert result == {"success": True, "codigo_resultado": 1}
        mock_repo.recuperar_documento.assert_called_once_with(10, 2)

    @patch('app.services.pedidos_service.PedidosRepository')
    @patch('app.services.pedidos_service.AuthRepository')
    def test_recuperar_documento_sin_permiso_base(self, mock_auth, mock_repo):
        # Arrange
        operador_context = {"cod_operador": 5}
        mock_auth.get_operador_por_codigo.return_value = {"permisos": {}}
        
        # Act & Assert
        with pytest.raises(PermissionError, match="El operador no tiene permisos para recuperar documentos aparcados."):
            PedidosService.recuperar_documento(10, operador_context, 2)

    @patch('app.services.pedidos_service.PedidosRepository')
    @patch('app.services.pedidos_service.AuthRepository')
    def test_recuperar_documento_cross_operador_sin_permiso(self, mock_auth, mock_repo):
        # Arrange
        operador_context = {"cod_operador": 5}
        mock_auth.get_operador_por_codigo.return_value = {
            "permisos": {"PRM_RECUPERARDOCUMENTOAPARCADO": True}
        }
        mock_repo.get_documento_estado.return_value = {"CODOPERADOR": 9, "CODTERMINAL": 2}
        
        # Act & Assert
        with pytest.raises(PermissionError, match="No tienes permiso para recuperar documentos aparcados por otro operario."):
            PedidosService.recuperar_documento(10, operador_context, 2)

    @patch('app.services.pedidos_service.PedidosRepository')
    @patch('app.services.pedidos_service.AuthRepository')
    def test_recuperar_documento_cross_terminal_sin_permiso(self, mock_auth, mock_repo):
        # Arrange
        operador_context = {"cod_operador": 5}
        mock_auth.get_operador_por_codigo.return_value = {
            "permisos": {"PRM_RECUPERARDOCUMENTOAPARCADO": True}
        }
        mock_repo.get_documento_estado.return_value = {"CODOPERADOR": 5, "CODTERMINAL": 9}
        
        # Act & Assert
        with pytest.raises(PermissionError, match="No tienes permiso para recuperar documentos aparcados en otro terminal."):
            PedidosService.recuperar_documento(10, operador_context, 2)
