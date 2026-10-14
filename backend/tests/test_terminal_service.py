import pytest
import os
from unittest.mock import patch, MagicMock
from app.services.terminal_service import TerminalService, _es_ip_docker_o_local
from app.utils.exceptions import TerminalNoAutorizado, TerminalBloqueado

class TestTerminalService:

    def test_es_ip_docker_o_local(self):
        # Arrange & Act & Assert
        assert _es_ip_docker_o_local(None) is True
        assert _es_ip_docker_o_local("") is True
        assert _es_ip_docker_o_local("::1") is True
        assert _es_ip_docker_o_local("127.0.0.1") is True
        assert _es_ip_docker_o_local("10.0.0.1") is True
        assert _es_ip_docker_o_local("172.16.0.1") is True
        assert _es_ip_docker_o_local("172.31.255.255") is True
        
        assert _es_ip_docker_o_local("192.168.1.1") is False
        assert _es_ip_docker_o_local("8.8.8.8") is False
        assert _es_ip_docker_o_local("invalid_ip") is False

    @patch('app.services.terminal_service.os.getenv')
    @patch('app.services.terminal_service.TerminalRepository')
    def test_validar_y_obtener_terminal_success(self, mock_repo, mock_getenv):
        # Arrange
        mock_getenv.return_value = None
        mock_repo.get_info_terminal_por_ip.return_value = {
            "CODTERMINAL": "TERM1",
            "permisos": {"PRM_BLOQUEADO": False}
        }
        
        # Act
        result = TerminalService.validar_y_obtener_terminal("192.168.1.10")
        
        # Assert
        assert result["CODTERMINAL"] == "TERM1"
        mock_repo.get_info_terminal_por_ip.assert_called_once_with("192.168.1.10")

    @patch('app.services.terminal_service.os.getenv')
    @patch('app.services.terminal_service.TerminalRepository')
    def test_validar_y_obtener_terminal_bypass_nat(self, mock_repo, mock_getenv):
        # Arrange
        mock_getenv.return_value = "192.168.1.50"
        mock_repo.get_info_terminal_por_ip.return_value = {
            "CODTERMINAL": "DEV_TERM",
            "permisos": {"PRM_BLOQUEADO": 0}
        }
        
        # Act
        result = TerminalService.validar_y_obtener_terminal("127.0.0.1")
        
        # Assert
        assert result["CODTERMINAL"] == "DEV_TERM"
        mock_repo.get_info_terminal_por_ip.assert_called_once_with("192.168.1.50")

    @patch('app.services.terminal_service.os.getenv')
    def test_validar_y_obtener_terminal_no_ip(self, mock_getenv):
        # Arrange
        mock_getenv.return_value = None
        
        # Act & Assert
        with pytest.raises(TerminalNoAutorizado, match="No se pudo determinar la dirección IP del terminal"):
            TerminalService.validar_y_obtener_terminal("")

    @patch('app.services.terminal_service.os.getenv')
    @patch('app.services.terminal_service.TerminalRepository')
    def test_validar_y_obtener_terminal_not_found(self, mock_repo, mock_getenv):
        # Arrange
        mock_getenv.return_value = None
        mock_repo.get_info_terminal_por_ip.return_value = None
        
        # Act & Assert
        with pytest.raises(TerminalNoAutorizado, match="no está autorizado o no existe"):
            TerminalService.validar_y_obtener_terminal("192.168.1.10")

    @patch('app.services.terminal_service.os.getenv')
    @patch('app.services.terminal_service.TerminalRepository')
    def test_validar_y_obtener_terminal_bloqueado(self, mock_repo, mock_getenv):
        # Arrange
        mock_getenv.return_value = None
        mock_repo.get_info_terminal_por_ip.return_value = {
            "CODTERMINAL": "TERM2",
            "permisos": {"PRM_BLOQUEADO": True}
        }
        
        # Act & Assert
        with pytest.raises(TerminalBloqueado, match="está bloqueado"):
            TerminalService.validar_y_obtener_terminal("192.168.1.10")
