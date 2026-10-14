import pytest
from unittest.mock import patch, MagicMock

from app.services.preparacion_service import PreparacionService

@pytest.fixture
def operador_context():
    return {"terminal": 123, "cod_operador": 456}

@patch('app.services.preparacion_service.PreparacionRepository')
class TestPreparacionService:

    def test_obtener_documento_success(self, mock_repo, operador_context):
        mock_repo.obtener_documento_para_preparar.return_value = 1001
        
        result = PreparacionService.obtener_documento(operador_context)
        
        mock_repo.obtener_documento_para_preparar.assert_called_once_with(123)
        assert result == {"cod_documento": 1001, "hay_documento": True}

    def test_obtener_documento_no_documento(self, mock_repo, operador_context):
        mock_repo.obtener_documento_para_preparar.return_value = 0
        
        result = PreparacionService.obtener_documento(operador_context)
        
        mock_repo.obtener_documento_para_preparar.assert_called_once_with(123)
        assert result == {"cod_documento": 0, "hay_documento": False}

    def test_obtener_documento_missing_terminal(self, mock_repo):
        with pytest.raises(Exception, match="No se pudo determinar el terminal del operario"):
            PreparacionService.obtener_documento({"terminal": 0})

    def test_get_cabecera(self, mock_repo):
        mock_repo.get_cabecera_documento.return_value = {"id": 1, "estado": "P"}
        result = PreparacionService.get_cabecera(1)
        mock_repo.get_cabecera_documento.assert_called_once_with(1)
        assert result == {"id": 1, "estado": "P"}

    def test_get_permisos(self, mock_repo):
        mock_repo.get_permisos_preparacion.return_value = {"PRM_SOLICITAR": 1}
        result = PreparacionService.get_permisos(456)
        mock_repo.get_permisos_preparacion.assert_called_once_with(456)
        assert result == {"PRM_SOLICITAR": 1}

    @patch('app.services.reubicaciones_service.ReubicacionesService.validar_ubicacion')
    def test_validar_ubicacion_necesita_posicion(self, mock_validar, mock_repo):
        mock_validar.return_value = {"status": "necesita_posicion"}
        result = PreparacionService.validar_ubicacion("H1", posicion=None)
        assert result == {"status": "necesita_posicion"}

    @patch('app.services.reubicaciones_service.ReubicacionesService.validar_ubicacion')
    def test_validar_ubicacion_success_match(self, mock_validar, mock_repo):
        mock_validar.return_value = {
            "status": "success",
            "ubicacion": {"CODUBICACION": 10, "CODHUECO": "H1", "NOMBRECORTO": "Desc"}
        }
        result = PreparacionService.validar_ubicacion("H1", cod_ubicacion_esperada=10)
        assert result == {
            "status": "success",
            "valida": True,
            "codubicacion": 10,
            "codhueco": "H1",
            "descripcion": "Desc"
        }

    @patch('app.services.reubicaciones_service.ReubicacionesService.validar_ubicacion')
    def test_validar_ubicacion_error_mismatch(self, mock_validar, mock_repo):
        mock_validar.return_value = {
            "status": "success",
            "ubicacion": {"CODUBICACION": 10}
        }
        result = PreparacionService.validar_ubicacion("H1", cod_ubicacion_esperada=20)
        assert result == {
            "status": "error",
            "valida": False,
            "message": "Ubicación incorrecta. (Esperada: 20, Escaneada: 10)"
        }

    @patch('app.services.reubicaciones_service.ReubicacionesService.validar_ubicacion')
    def test_validar_ubicacion_other_status(self, mock_validar, mock_repo):
        mock_validar.return_value = {"status": "error_not_found"}
        result = PreparacionService.validar_ubicacion("H1")
        assert result == {"status": "error_not_found"}

    def test_get_stock_lotes(self, mock_repo):
        mock_repo.get_stock_lotes.return_value = [{"lote": "L1"}]
        result = PreparacionService.get_stock_lotes(10, 20)
        mock_repo.get_stock_lotes.assert_called_once_with(10, 20)
        assert result == {"lotes": [{"lote": "L1"}]}

    def test_get_lineas_pendientes(self, mock_repo, operador_context):
        mock_repo.get_lineas_pendientes.return_value = [{"linea": 1}]
        result = PreparacionService.get_lineas_pendientes(1001, operador_context)
        mock_repo.get_lineas_pendientes.assert_called_once_with(1001, 123)
        assert result == {"lineas": [{"linea": 1}]}

    def test_get_num_lineas_pendientes(self, mock_repo):
        mock_repo.get_num_lineas_pendientes.return_value = 5
        result = PreparacionService.get_num_lineas_pendientes(1001)
        mock_repo.get_num_lineas_pendientes.assert_called_once_with(1001)
        assert result == {"num_lineas": 5}

    def test_get_unids_preparadas(self, mock_repo):
        mock_repo.get_unids_preparadas.return_value = {"unidades": 10}
        result = PreparacionService.get_unids_preparadas(
            cod_documento=1, num_linea=2, cod_ubicacion=3, cod_articulo=4,
            fecha_caducidad="2025-01-01", numero_lote="L1", cod_terminal=123
        )
        mock_repo.get_unids_preparadas.assert_called_once_with(
            cod_documento=1, num_linea=2, cod_ubicacion=3, cod_articulo=4,
            fecha_caducidad="2025-01-01", numero_lote="L1", cod_terminal=123
        )
        assert result == {"unidades": 10}

    def test_enriquecer_linea_empty(self, mock_repo):
        assert PreparacionService._enriquecer_linea(None) is None
        assert PreparacionService._enriquecer_linea({}) == {}

    def test_enriquecer_linea_success(self, mock_repo):
        mock_repo.get_info_articulo.return_value = {"info": "extra"}
        result = PreparacionService._enriquecer_linea({"codarticulo": 50})
        mock_repo.get_info_articulo.assert_called_once_with(50)
        assert result == {"codarticulo": 50, "info": "extra"}

    def test_get_primera_linea(self, mock_repo):
        mock_repo.get_articulo_para_preparar.return_value = {"codarticulo": 50}
        mock_repo.get_info_articulo.return_value = {"info": "extra"}
        
        result = PreparacionService.get_primera_linea(1001)
        
        mock_repo.get_articulo_para_preparar.assert_called_once_with(
            cod_documento=1001, cod_ubicacion=0, numero_orden=0, tipo_avance=0,
            cod_ubicacion_actual=0, cod_articulo=0, cant_solicitada=None
        )
        assert result == {"linea": {"codarticulo": 50, "info": "extra"}}

    def test_siguiente_linea(self, mock_repo):
        mock_repo.get_articulo_para_preparar.return_value = {"codarticulo": 60}
        mock_repo.get_info_articulo.return_value = {"info": "extra2"}
        
        result = PreparacionService.siguiente_linea(
            cod_documento=1001, cod_ubicacion=1, numero_orden=2,
            tipo_avance=0, cod_ubicacion_actual=3, cod_articulo=4, cant_solicitada=5.0
        )
        
        mock_repo.get_articulo_para_preparar.assert_called_once_with(
            cod_documento=1001, cod_ubicacion=1, numero_orden=2, tipo_avance=0,
            cod_ubicacion_actual=3, cod_articulo=4, cant_solicitada=5.0
        )
        assert result == {"linea": {"codarticulo": 60, "info": "extra2"}}

    def test_cargar_mercancia(self, mock_repo, operador_context):
        result = PreparacionService.cargar_mercancia(
            operador_context=operador_context, cod_documento=1, cod_ubicacion=2,
            cod_articulo=3, num_linea=4, unidades=5.0, fecha_caducidad="2025-01-01",
            numero_lote="L2", cod_tipo_dato_maestro=6, cod_dato_maestro=7,
            tipo_codigo_introducido=8, cod_facturacion="F1", cod_operacion_terminal=1
        )
        mock_repo.cargar_mercancia.assert_called_once_with(
            cod_ubicacion_origen=2, cod_articulo=3, fecha_caducidad="2025-01-01",
            cod_terminal=123, unidades=5.0, cod_documento=1, num_linea=4,
            numero_lote="L2", cod_tipo_dato_maestro=6, cod_dato_maestro=7,
            tipo_codigo_introducido=8, cod_facturacion="F1", cod_operacion_terminal=1
        )
        assert result == {"success": True}

    def test_get_pedido_directo_en_curso(self, mock_repo, operador_context):
        mock_repo.get_pedido_directo_en_curso.return_value = {"id": 1}
        result = PreparacionService.get_pedido_directo_en_curso(operador_context)
        mock_repo.get_pedido_directo_en_curso.assert_called_once_with(456, 123)
        assert result == {"id": 1}
        
    def test_get_pedido_directo_en_curso_with_operador(self, mock_repo):
        context = {"operador": 789, "terminal": 123}
        mock_repo.get_pedido_directo_en_curso.return_value = {"id": 2}
        result = PreparacionService.get_pedido_directo_en_curso(context)
        mock_repo.get_pedido_directo_en_curso.assert_called_once_with(789, 123)
        assert result == {"id": 2}

    def test_crear_cabecera_pedido_directo(self, mock_repo, operador_context):
        payload = {"data": "test"}
        mock_repo.crear_cabecera_pedido_directo.return_value = {"id": 100}
        result = PreparacionService.crear_cabecera_pedido_directo(payload, operador_context)
        mock_repo.crear_cabecera_pedido_directo.assert_called_once_with(
            {"data": "test", "CODOPERADOR": 456, "CODTERMINAL": 123}
        )
        assert result == {"id": 100}

    def test_grabar_linea_pedido_directo(self, mock_repo, operador_context):
        payload = {"data": "test"}
        mock_repo.grabar_linea_pedido_directo.return_value = {"id": 200}
        result = PreparacionService.grabar_linea_pedido_directo(payload, operador_context)
        mock_repo.grabar_linea_pedido_directo.assert_called_once_with(
            {"data": "test", "CODOPERADOR": 456, "CODTERMINAL": 123}
        )
        assert result == {"id": 200}

    def test_get_lineas_pedido_directo(self, mock_repo):
        mock_repo.get_lineas_pedido_directo.return_value = [{"linea": 1}]
        result = PreparacionService.get_lineas_pedido_directo(1001)
        mock_repo.get_lineas_pedido_directo.assert_called_once_with(1001)
        assert result == [{"linea": 1}]

    def test_get_recorrido_linea(self, mock_repo):
        mock_repo.get_recorrido_linea.return_value = [{"paso": 1}]
        result = PreparacionService.get_recorrido_linea(1001, 2)
        mock_repo.get_recorrido_linea.assert_called_once_with(1001, 2)
        assert result == [{"paso": 1}]

    def test_descargar_mercancia_success(self, mock_repo, operador_context):
        PreparacionService.descargar_mercancia(
            cod_documento=1, num_linea=2, cod_articulo=3,
            operador_context=operador_context, registros_seleccionados=[1, 2]
        )
        mock_repo.descargar_mercancia.assert_called_once_with(
            cod_terminal=123, cod_articulo=3, cod_documento=1, num_linea=2,
            registros_seleccionados=[1, 2]
        )

    def test_descargar_mercancia_missing_terminal(self, mock_repo):
        with pytest.raises(Exception, match="No se pudo determinar el terminal del operario"):
            PreparacionService.descargar_mercancia(
                cod_documento=1, num_linea=2, cod_articulo=3,
                operador_context={"terminal": 0}
            )
