import pytest
import jwt
from datetime import datetime, timezone
from unittest.mock import patch, MagicMock
from app.services.auth_service import AuthService
from app.utils.exceptions import UserNotFoundError, InvalidPasswordError

class TestAuthService:
    @patch('app.services.auth_service.TerminalService.validar_y_obtener_terminal')
    @patch('app.services.auth_service.AuthRepository.get_operador_por_codigo')
    @patch('app.services.auth_service.TerminalRepository.actualizar_ultimo_operario')
    @patch('app.services.auth_service.session_manager')
    def test_login_success_plain_password(self, mock_session_manager, mock_act_operario, mock_get_operador, mock_get_terminal):
        mock_get_terminal.return_value = {"CODTERMINAL": "T1"}
        mock_get_operador.return_value = {
            "CODOPERADOR": 1, 
            "NOMBRE": "TestUser", 
            "PASSWORD": "password123",
            "permisos": []
        }
        
        result = AuthService.login("testuser", "password123", "127.0.0.1", "secret", 30)
        
        assert "token" in result
        assert result["operador_nombre"] == "TestUser"
        assert result["terminal"] == {"CODTERMINAL": "T1"}
        mock_act_operario.assert_called_once_with("T1", "1")

    @patch('app.services.auth_service.AuthRepository.get_operador_por_codigo')
    def test_login_user_not_found(self, mock_get_operador):
        mock_get_operador.return_value = None
        with pytest.raises(UserNotFoundError):
            AuthService.login("unknown", "pwd", "127.0.0.1", "secret", 30)

    @patch('app.services.auth_service.TerminalService.validar_y_obtener_terminal')
    @patch('app.services.auth_service.AuthRepository.get_operador_por_codigo')
    def test_login_invalid_password(self, mock_get_operador, mock_get_terminal):
        mock_get_terminal.return_value = {"CODTERMINAL": "T1"}
        mock_get_operador.return_value = {
            "CODOPERADOR": 1, 
            "NOMBRE": "TestUser", 
            "PASSWORD": "password123",
            "permisos": []
        }
        
        with pytest.raises(InvalidPasswordError):
            AuthService.login("testuser", "wrongpwd", "127.0.0.1", "secret", 30)

    @patch('app.services.auth_service.TerminalService.validar_y_obtener_terminal')
    @patch('app.services.auth_service.AuthRepository.get_operador_por_nombre')
    @patch('app.services.auth_service.TerminalRepository.actualizar_ultimo_operario')
    @patch('app.services.auth_service.session_manager')
    def test_login_web_success(self, mock_session_manager, mock_act_operario, mock_get_operador, mock_get_terminal):
        mock_get_terminal.return_value = {"CODTERMINAL": "WEB1"}
        mock_get_operador.return_value = {
            "CODOPERADOR": 2, 
            "NOMBRE": "WebUser", 
            "PASSWORD": "password123",
            "permisos": []
        }
        
        result = AuthService.login_web("webuser", "password123", "127.0.0.1", "secret", 30)
        
        assert "token" in result
        assert result["operador_nombre"] == "WebUser"
        mock_act_operario.assert_called_once_with("WEB1", "2")
        
    @patch('app.services.auth_service.TerminalService.validar_y_obtener_terminal')
    @patch('app.services.auth_service.AuthRepository.get_operador_por_nombre')
    @patch('app.services.auth_service.session_manager')
    def test_login_web_fallback_terminal(self, mock_session_manager, mock_get_operador, mock_get_terminal):
        mock_get_terminal.side_effect = Exception("Not found")
        mock_get_operador.return_value = {
            "CODOPERADOR": 2, 
            "NOMBRE": "WebUser", 
            "PASSWORD": "password123",
            "permisos": []
        }
        
        result = AuthService.login_web("webuser", "password123", "127.0.0.1", "secret", 30)
        
        assert result["terminal"]["CODTERMINAL"] == "WEB-CONSOLE"
