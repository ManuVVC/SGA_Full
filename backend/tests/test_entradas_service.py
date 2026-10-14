import pytest
from unittest.mock import patch, MagicMock
from app.services.entradas_service import EntradasService

class TestEntradasService:

    # --- get_parametros_entrada ---
    @patch('app.services.entradas_service.EntradasRepository')
    def test_get_parametros_entrada_success(self, mock_repo):
        # Arrange
        mock_repo.get_parametros_entrada.return_value = {"param1": "value"}
        
        # Act
        result = EntradasService.get_parametros_entrada()
        
        # Assert
        assert result == {"status": "success", "parametros": {"param1": "value"}}
        mock_repo.get_parametros_entrada.assert_called_once()

    @patch('app.services.entradas_service.EntradasRepository')
    def test_get_parametros_entrada_exception(self, mock_repo):
        # Arrange
        mock_repo.get_parametros_entrada.side_effect = Exception("DB error")
        
        # Act
        result = EntradasService.get_parametros_entrada()
        
        # Assert
        assert result == {"status": "error", "message": "Error al obtener parámetros: DB error"}
        mock_repo.get_parametros_entrada.assert_called_once()

    # --- get_muelles ---
    @patch('app.services.entradas_service.EntradasRepository')
    def test_get_muelles(self, mock_repo):
        # Arrange
        mock_repo.get_muelles.return_value = [{"id": 1}]
        
        # Act
        result = EntradasService.get_muelles()
        
        # Assert
        assert result == {"status": "success", "muelles": [{"id": 1}]}
        mock_repo.get_muelles.assert_called_once()

    # --- get_albaranes_en_curso ---
    @patch('app.services.entradas_service.EntradasRepository')
    def test_get_albaranes_en_curso_success(self, mock_repo):
        # Arrange
        mock_repo.get_albaranes_en_curso.return_value = [{"doc": 100}]
        
        # Act
        result = EntradasService.get_albaranes_en_curso(1)
        
        # Assert
        assert result == {"status": "success", "albaranes": [{"doc": 100}]}
        mock_repo.get_albaranes_en_curso.assert_called_once_with(1)

    def test_get_albaranes_en_curso_missing_param(self):
        # Act
        result = EntradasService.get_albaranes_en_curso(None)
        
        # Assert
        assert result == {"status": "error", "message": "Muelle es requerido"}

    # --- get_proveedores ---
    @patch('app.services.entradas_service.EntradasRepository')
    def test_get_proveedores(self, mock_repo):
        # Arrange
        mock_repo.get_proveedores_con_pedidos_pendientes.return_value = [{"prov": 1}]
        
        # Act
        result = EntradasService.get_proveedores()
        
        # Assert
        assert result == {"status": "success", "proveedores": [{"prov": 1}]}
        mock_repo.get_proveedores_con_pedidos_pendientes.assert_called_once()

    # --- get_todos_proveedores ---
    @patch('app.services.entradas_service.EntradasRepository')
    def test_get_todos_proveedores(self, mock_repo):
        # Arrange
        mock_repo.get_proveedores.return_value = [{"prov": 2}]
        
        # Act
        result = EntradasService.get_todos_proveedores()
        
        # Assert
        assert result == {"status": "success", "proveedores": [{"prov": 2}]}
        mock_repo.get_proveedores.assert_called_once()

    # --- get_pedidos ---
    @patch('app.services.entradas_service.EntradasRepository')
    def test_get_pedidos(self, mock_repo):
        # Arrange
        mock_repo.get_pedidos_pendientes_por_proveedor.return_value = [{"ped": 3}]
        
        # Act
        result = EntradasService.get_pedidos(10)
        
        # Assert
        assert result == {"status": "success", "pedidos": [{"ped": 3}]}
        mock_repo.get_pedidos_pendientes_por_proveedor.assert_called_once_with(10)

    # --- crear_albaran ---
    @patch('app.services.entradas_service.EntradasRepository')
    def test_crear_albaran_success(self, mock_repo):
        # Arrange
        payload = {"data": "test"}
        mock_repo.crear_albaran.return_value = 500
        
        # Act
        result = EntradasService.crear_albaran(payload)
        
        # Assert
        assert result == {"status": "success", "coddocumento": 500}
        mock_repo.crear_albaran.assert_called_once_with(payload)

    @patch('app.services.entradas_service.EntradasRepository')
    def test_crear_albaran_exception(self, mock_repo):
        # Arrange
        mock_repo.crear_albaran.side_effect = Exception("Creacion fallida")
        
        # Act
        result = EntradasService.crear_albaran({})
        
        # Assert
        assert result == {"status": "error", "message": "Error al crear albarán: Creacion fallida"}

    # --- grabar_linea ---
    def test_grabar_linea_missing_fields(self):
        # Act
        result = EntradasService.grabar_linea({"EAN": "123"})
        
        # Assert
        assert result == {"status": "error", "message": "EAN y Unidades son obligatorios."}

    @patch('app.services.entradas_service.EntradasRepository')
    def test_grabar_linea_no_codarticulo_not_found(self, mock_repo):
        # Arrange
        payload = {"EAN": "123", "UNIDADES": 10}
        mock_repo.get_info_articulo_por_ean.return_value = None
        
        # Act
        result = EntradasService.grabar_linea(payload)
        
        # Assert
        assert result == {"status": "error", "message": "Artículo no encontrado."}
        mock_repo.get_info_articulo_por_ean.assert_called_once_with("123")

    @patch('app.services.entradas_service.EntradasRepository')
    def test_grabar_linea_no_codarticulo_value_error(self, mock_repo):
        # Arrange
        payload = {"EAN": "123", "UNIDADES": 10}
        mock_repo.get_info_articulo_por_ean.side_effect = ValueError("Invalid EAN")
        
        # Act
        result = EntradasService.grabar_linea(payload)
        
        # Assert
        assert result == {"status": "error", "message": "Invalid EAN"}

    @patch('app.services.entradas_service.imprimir_etiqueta_palet')
    @patch('app.services.entradas_service.EntradasRepository')
    def test_grabar_linea_success(self, mock_repo, mock_imprimir):
        # Arrange
        payload = {"EAN": "123", "UNIDADES": 10, "CODARTICULO": 99}
        mock_repo.grabar_linea_entrada.return_value = {
            "coddocumento": 1001,
            "palets_imprimir": [{"sscc": "0001", "codterminal": 2}]
        }
        mock_imprimir.return_value = {"ok": True}
        
        # Act
        result = EntradasService.grabar_linea(payload)
        
        # Assert
        assert result == {"status": "success", "coddocumento": 1001}
        mock_repo.grabar_linea_entrada.assert_called_once_with(payload)
        mock_imprimir.assert_called_once_with(2, {"sscc": "0001", "codterminal": 2})

    @patch('app.services.entradas_service.imprimir_etiqueta_palet')
    @patch('app.services.entradas_service.EntradasRepository')
    def test_grabar_linea_impresion_warning(self, mock_repo, mock_imprimir):
        # Arrange
        payload = {"EAN": "123", "UNIDADES": 10, "CODARTICULO": 99}
        mock_repo.grabar_linea_entrada.return_value = {
            "coddocumento": 1001,
            "palets_imprimir": [{"sscc": "0001"}]
        }
        mock_imprimir.return_value = {"ok": False, "mensaje": "Printer error"}
        
        # Act
        result = EntradasService.grabar_linea(payload)
        
        # Assert
        assert result == {"status": "success", "coddocumento": 1001, "aviso_impresion": "Printer error"}
        mock_repo.grabar_linea_entrada.assert_called_once_with(payload)
        mock_imprimir.assert_called_once_with(1, {"sscc": "0001"})

    @patch('app.services.entradas_service.EntradasRepository')
    def test_grabar_linea_exception(self, mock_repo):
        # Arrange
        payload = {"EAN": "123", "UNIDADES": 10, "CODARTICULO": 99}
        mock_repo.grabar_linea_entrada.side_effect = Exception("DB Error")
        
        # Act
        result = EntradasService.grabar_linea(payload)
        
        # Assert
        assert result == {"status": "error", "message": "DB Error"}

    # --- finalizar_entrada ---
    def test_finalizar_entrada_missing_param(self):
        result = EntradasService.finalizar_entrada(None, 1)
        assert result == {"status": "error", "message": "No se indicó el documento a finalizar."}

    @patch('app.services.entradas_service.EntradasRepository')
    def test_finalizar_entrada_success(self, mock_repo):
        result = EntradasService.finalizar_entrada(10, 1)
        assert result == {"status": "success", "message": "Entrada finalizada con éxito"}
        mock_repo.finalizar_entrada.assert_called_once_with(10, 1)

    @patch('app.services.entradas_service.EntradasRepository')
    def test_finalizar_entrada_exception(self, mock_repo):
        mock_repo.finalizar_entrada.side_effect = Exception("Failed")
        result = EntradasService.finalizar_entrada(10, 1)
        assert result == {"status": "error", "message": "Error interno al finalizar la entrada."}

    # --- get_albaranes_para_finalizar ---
    @patch('app.services.entradas_service.EntradasRepository')
    def test_get_albaranes_para_finalizar_success(self, mock_repo):
        mock_repo.get_albaranes_para_finalizar.return_value = [{"doc": 1}]
        result = EntradasService.get_albaranes_para_finalizar()
        assert result == {"status": "success", "albaranes": [{"doc": 1}]}

    @patch('app.services.entradas_service.EntradasRepository')
    def test_get_albaranes_para_finalizar_exception(self, mock_repo):
        mock_repo.get_albaranes_para_finalizar.side_effect = Exception("Failed")
        result = EntradasService.get_albaranes_para_finalizar()
        assert result == {"status": "error", "message": "Error interno al consultar albaranes."}

    # --- get_lineas_grabadas ---
    @patch('app.services.entradas_service.EntradasRepository')
    def test_get_lineas_grabadas_success(self, mock_repo):
        mock_repo.get_lineas_grabadas.return_value = [{"linea": 1}]
        result = EntradasService.get_lineas_grabadas(10)
        assert result == {"status": "success", "lineas": [{"linea": 1}]}
        mock_repo.get_lineas_grabadas.assert_called_once_with(10)

    @patch('app.services.entradas_service.EntradasRepository')
    def test_get_lineas_grabadas_exception(self, mock_repo):
        mock_repo.get_lineas_grabadas.side_effect = Exception("Failed")
        result = EntradasService.get_lineas_grabadas(10)
        assert result == {"status": "error", "message": "Error al consultar líneas grabadas."}

    # --- get_detalle_linea ---
    @patch('app.services.entradas_service.EntradasRepository')
    def test_get_detalle_linea_success(self, mock_repo):
        mock_repo.get_detalle_linea.return_value = {"det": 1}
        result = EntradasService.get_detalle_linea(20)
        assert result == {"status": "success", "detalle": {"det": 1}}
        mock_repo.get_detalle_linea.assert_called_once_with(20)

    @patch('app.services.entradas_service.EntradasRepository')
    def test_get_detalle_linea_exception(self, mock_repo):
        mock_repo.get_detalle_linea.side_effect = Exception("Failed")
        result = EntradasService.get_detalle_linea(20)
        assert result == {"status": "error", "message": "Error al consultar detalle de línea."}

    # --- get_lineas_pendientes ---
    @patch('app.services.entradas_service.EntradasRepository')
    def test_get_lineas_pendientes_success(self, mock_repo):
        mock_repo.get_lineas_pendientes.return_value = [{"pend": 1}]
        result = EntradasService.get_lineas_pendientes(30)
        assert result == {"status": "success", "lineas": [{"pend": 1}]}
        mock_repo.get_lineas_pendientes.assert_called_once_with(30)

    @patch('app.services.entradas_service.EntradasRepository')
    def test_get_lineas_pendientes_exception(self, mock_repo):
        mock_repo.get_lineas_pendientes.side_effect = Exception("Failed")
        result = EntradasService.get_lineas_pendientes(30)
        assert result == {"status": "error", "message": "Error al consultar líneas pendientes."}

    # --- get_articulo_info ---
    def test_get_articulo_info_missing_param(self):
        result = EntradasService.get_articulo_info(None)
        assert result == {"status": "error", "message": "EAN vacío"}

    @patch('app.services.entradas_service.EntradasRepository')
    def test_get_articulo_info_not_found(self, mock_repo):
        mock_repo.get_info_articulo_por_ean.return_value = None
        result = EntradasService.get_articulo_info("123")
        assert result == {"status": "error", "message": "EAN 123 no encontrado"}

    @patch('app.services.entradas_service.EntradasRepository')
    def test_get_articulo_info_success(self, mock_repo):
        mock_repo.get_info_articulo_por_ean.return_value = {"art": 1}
        result = EntradasService.get_articulo_info("123")
        assert result == {"status": "success", "info": {"art": 1}}

    @patch('app.services.entradas_service.EntradasRepository')
    def test_get_articulo_info_value_error(self, mock_repo):
        mock_repo.get_info_articulo_por_ean.side_effect = ValueError("Invalid")
        result = EntradasService.get_articulo_info("123")
        assert result == {"status": "error", "message": "Invalid"}

    @patch('app.services.entradas_service.EntradasRepository')
    def test_get_articulo_info_exception(self, mock_repo):
        mock_repo.get_info_articulo_por_ean.side_effect = Exception("Error")
        result = EntradasService.get_articulo_info("123")
        assert result == {"status": "error", "message": "Error al buscar EAN"}
