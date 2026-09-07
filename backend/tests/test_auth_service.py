import pytest
import jwt
from unittest.mock import patch, MagicMock
from app.services.auth_service import AuthService
from app.utils.exceptions import UserNotFoundError, InvalidPasswordError

@pytest.fixture
def mock_secret():
    return "test-secret"

@pytest.fixture
def mock_ip():
    return "192.168.1.10"

class TestAuthService:
    @patch("app.services.auth_service.TerminalService.validar_y_obtener_terminal")
    @patch("app.services.auth_service.AuthRepository.get_operador_por_codigo")
    @patch("app.services.auth_service.TerminalRepository.actualizar_ultimo_operario")
    @patch("app.services.auth_service.session_manager")
    def test_login_success(self, mock_session, mock_term_repo, mock_auth_repo, mock_term_service, mock_secret, mock_ip):
        # Arrange
        mock_term_service.return_value = {"CODTERMINAL": "TERM1"}
        mock_auth_repo.return_value = {
            "CODOPERADOR": 1,
            "NOMBRE": "Test User",
            "PASSWORD": "correct_password",
            "permisos": ["MENU_1"]
        }
        
        # Act
        result = AuthService.login("testuser", "correct_password", mock_ip, mock_secret, 30)
        
        # Assert
        assert "token" in result
        assert result["operador_nombre"] == "Test User"
        assert result["terminal"]["CODTERMINAL"] == "TERM1"
        assert result["permisos"] == ["MENU_1"]
        
        # Check token validity
        decoded = jwt.decode(result["token"], mock_secret, algorithms=["HS256"])
        assert decoded["sub"] == "1"
        
        mock_session.register_session.assert_called_once()
        mock_term_repo.actualizar_ultimo_operario.assert_called_once_with("TERM1", "1")

    @patch("app.services.auth_service.TerminalService.validar_y_obtener_terminal")
    @patch("app.services.auth_service.AuthRepository.get_operador_por_codigo")
    def test_login_user_not_found(self, mock_auth_repo, mock_term_service, mock_secret, mock_ip):
        # Arrange
        mock_term_service.return_value = {"CODTERMINAL": "TERM1"}
        mock_auth_repo.return_value = None
        
        # Act & Assert
        with pytest.raises(UserNotFoundError, match="no existe en el sistema"):
            AuthService.login("unknown", "pass", mock_ip, mock_secret, 30)

    @patch("app.services.auth_service.TerminalService.validar_y_obtener_terminal")
    @patch("app.services.auth_service.AuthRepository.get_operador_por_codigo")
    def test_login_invalid_password(self, mock_auth_repo, mock_term_service, mock_secret, mock_ip):
        # Arrange
        mock_term_service.return_value = {"CODTERMINAL": "TERM1"}
        mock_auth_repo.return_value = {
            "CODOPERADOR": 1,
            "NOMBRE": "Test User",
            "PASSWORD": "correct_password",
            "permisos": []
        }
        
        # Act & Assert
        with pytest.raises(InvalidPasswordError, match="incorrecta"):
            AuthService.login("testuser", "wrong_password", mock_ip, mock_secret, 30)

    def test_login_empty_username(self, mock_secret, mock_ip):
        with pytest.raises(UserNotFoundError, match="no puede estar vacío"):
            AuthService.login("", "pass", mock_ip, mock_secret, 30)
