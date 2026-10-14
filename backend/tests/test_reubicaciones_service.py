import pytest
from unittest.mock import patch, MagicMock

from app.services.reubicaciones_service import ReubicacionesService

# ==========================================
# Tests para validar_ubicacion
# ==========================================

@patch('app.services.reubicaciones_service.ReubicacionesRepository.get_ubicacion_by_codigo')
def test_validar_ubicacion_numerico_codigo_encontrado(mock_get_codigo):
    # Arrange
    mock_get_codigo.return_value = {"CODUBICACION": 123, "NOMBRE": "UBIC1"}
    
    # Act
    resultado = ReubicacionesService.validar_ubicacion("123")
    
    # Assert
    assert resultado["status"] == "success"
    assert resultado["ubicacion"]["CODUBICACION"] == 123
    mock_get_codigo.assert_called_once_with("123")

@patch('app.services.reubicaciones_service.ReubicacionesRepository.get_ubicacion_by_codigo')
@patch('app.services.reubicaciones_service.ReubicacionesRepository.get_ubicacion_by_nombre_corto')
def test_validar_ubicacion_numerico_nombre_corto_encontrado(mock_get_nombre, mock_get_codigo):
    # Arrange
    mock_get_codigo.return_value = None
    mock_get_nombre.return_value = {"CODUBICACION": 123, "NOMBRE": "UBIC1"}
    
    # Act
    resultado = ReubicacionesService.validar_ubicacion("123")
    
    # Assert
    assert resultado["status"] == "success"
    assert resultado["ubicacion"]["CODUBICACION"] == 123
    mock_get_codigo.assert_called_once_with("123")
    mock_get_nombre.assert_called_once_with("123")

@patch('app.services.reubicaciones_service.ReubicacionesRepository.get_ubicacion_by_nombre_corto')
@patch('app.services.reubicaciones_service.ReubicacionesRepository.get_ubicaciones_by_etiqueta')
def test_validar_ubicacion_alfanumerico_etiqueta_unica(mock_get_etiqueta, mock_get_nombre):
    # Arrange
    mock_get_nombre.return_value = None
    mock_get_etiqueta.return_value = [{"CODUBICACION": 456, "POSICION": 1}]
    
    # Act
    resultado = ReubicacionesService.validar_ubicacion("A1B2")
    
    # Assert
    assert resultado["status"] == "success"
    assert resultado["ubicacion"]["CODUBICACION"] == 456
    mock_get_etiqueta.assert_called_once_with("A1B2")

@patch('app.services.reubicaciones_service.ReubicacionesRepository.get_ubicacion_by_nombre_corto')
@patch('app.services.reubicaciones_service.ReubicacionesRepository.get_ubicaciones_by_etiqueta')
def test_validar_ubicacion_etiqueta_multiples_sin_posicion(mock_get_etiqueta, mock_get_nombre):
    # Arrange
    mock_get_nombre.return_value = None
    mock_get_etiqueta.return_value = [
        {"CODUBICACION": 456, "POSICION": 1},
        {"CODUBICACION": 457, "POSICION": 2}
    ]
    
    # Act
    resultado = ReubicacionesService.validar_ubicacion("A1B2")
    
    # Assert
    assert resultado["status"] == "necesita_posicion"
    assert len(resultado["opciones"]) == 2

@patch('app.services.reubicaciones_service.ReubicacionesRepository.get_ubicacion_by_nombre_corto')
@patch('app.services.reubicaciones_service.ReubicacionesRepository.get_ubicaciones_by_etiqueta')
def test_validar_ubicacion_etiqueta_multiples_con_posicion(mock_get_etiqueta, mock_get_nombre):
    # Arrange
    mock_get_nombre.return_value = None
    mock_get_etiqueta.return_value = [
        {"CODUBICACION": 456, "POSICION": 1},
        {"CODUBICACION": 457, "POSICION": 2}
    ]
    
    # Act
    resultado = ReubicacionesService.validar_ubicacion("A1B2", posicion=2)
    
    # Assert
    assert resultado["status"] == "success"
    assert resultado["ubicacion"]["CODUBICACION"] == 457

@patch('app.services.reubicaciones_service.ReubicacionesRepository.get_ubicacion_by_nombre_corto')
@patch('app.services.reubicaciones_service.ReubicacionesRepository.get_ubicaciones_by_etiqueta')
def test_validar_ubicacion_no_encontrado(mock_get_etiqueta, mock_get_nombre):
    # Arrange
    mock_get_nombre.return_value = None
    mock_get_etiqueta.return_value = []
    
    # Act
    resultado = ReubicacionesService.validar_ubicacion("A1B2")
    
    # Assert
    assert resultado["status"] == "error"
    assert "No se encontraron ubicaciones" in resultado["message"]


# ==========================================
# Tests para validar_articulo
# ==========================================

@patch('app.services.reubicaciones_service.ReubicacionesRepository.get_articulo_por_ean')
def test_validar_articulo_ean(mock_get_ean):
    # Arrange
    mock_get_ean.return_value = {"CODARTICULO": 100}
    
    # Act
    resultado = ReubicacionesService.validar_articulo("841234567890", "ean")
    
    # Assert
    assert resultado["status"] == "success"
    assert resultado["tipo"] == "ean"

@patch('app.services.reubicaciones_service.ReubicacionesRepository.get_articulo_por_codigo_interno')
@patch('app.services.reubicaciones_service.ReubicacionesRepository.get_articulo_por_ean')
def test_validar_articulo_codigo(mock_get_ean, mock_get_codigo):
    # Arrange
    mock_get_ean.return_value = None
    mock_get_codigo.return_value = {"CODARTICULO": 101}
    
    # Act
    resultado = ReubicacionesService.validar_articulo("ART01", "auto")
    
    # Assert
    assert resultado["status"] == "success"
    assert resultado["tipo"] == "codigo"

@patch('app.utils.parametros.is_parametro_activo')
@patch('app.services.reubicaciones_service.ReubicacionesRepository.get_articulo_por_cod_fabricante')
@patch('app.services.reubicaciones_service.ReubicacionesRepository.get_articulo_por_codigo_interno')
@patch('app.services.reubicaciones_service.ReubicacionesRepository.get_articulo_por_ean')
def test_validar_articulo_fabricante_multiples(mock_get_ean, mock_get_codigo, mock_get_fabricante, mock_param):
    # Arrange
    mock_get_ean.return_value = None
    mock_get_codigo.return_value = None
    mock_param.return_value = True
    mock_get_fabricante.return_value = [{"CODARTICULO": 102}, {"CODARTICULO": 103}]
    
    # Act
    resultado = ReubicacionesService.validar_articulo("FAB01", "auto")
    
    # Assert
    assert resultado["status"] == "multiples_resultados"

@patch('app.services.reubicaciones_service.ReubicacionesRepository.get_articulo_por_descripcion')
@patch('app.utils.parametros.is_parametro_activo')
@patch('app.services.reubicaciones_service.ReubicacionesRepository.get_articulo_por_codigo_interno')
@patch('app.services.reubicaciones_service.ReubicacionesRepository.get_articulo_por_ean')
def test_validar_articulo_no_encontrado(mock_get_ean, mock_get_codigo, mock_param, mock_get_desc):
    # Arrange
    mock_get_ean.return_value = None
    mock_get_codigo.return_value = None
    mock_param.return_value = False
    mock_get_desc.return_value = []
    
    # Act
    resultado = ReubicacionesService.validar_articulo("UNKNOWN", "auto")
    
    # Assert
    assert resultado["status"] == "error"
    assert "no encontrado" in resultado["message"]


# ==========================================
# Tests para validar_cantidad
# ==========================================

@patch('app.services.reubicaciones_service.ReubicacionesRepository.get_stock_ubicacion_articulo')
def test_validar_cantidad_cero(mock_get_stock):
    # Act
    resultado = ReubicacionesService.validar_cantidad(1, 100, 0)
    
    # Assert
    assert resultado["status"] == "error"
    assert "mayor que cero" in resultado["message"]

@patch('app.services.reubicaciones_service.ReubicacionesRepository.get_stock_ubicacion_articulo')
def test_validar_cantidad_stock_insuficiente(mock_get_stock):
    # Arrange
    mock_get_stock.return_value = 10
    
    # Act
    resultado = ReubicacionesService.validar_cantidad(1, 100, 15)
    
    # Assert
    assert resultado["status"] == "error"
    assert "Stock insuficiente" in resultado["message"]

@patch('app.services.reubicaciones_service.ReubicacionesRepository.get_stock_ubicacion_articulo')
def test_validar_cantidad_valida(mock_get_stock):
    # Arrange
    mock_get_stock.return_value = 20
    
    # Act
    resultado = ReubicacionesService.validar_cantidad(1, 100, 15, 1)
    
    # Assert
    assert resultado["status"] == "success"
    assert resultado["cantidad_real"] == 15
    assert resultado["stock_disponible"] == 20


# ==========================================
# Tests para obtener_lotes_disponibles
# ==========================================

@patch('app.services.reubicaciones_service.ReubicacionesRepository.get_lotes_disponibles')
def test_obtener_lotes_disponibles_success(mock_get_lotes):
    # Arrange
    mock_get_lotes.return_value = [{"LOTE": "L1"}, {"LOTE": "L2"}]
    
    # Act
    resultado = ReubicacionesService.obtener_lotes_disponibles(1, 100)
    
    # Assert
    assert resultado["status"] == "success"
    assert len(resultado["lotes"]) == 2

@patch('app.services.reubicaciones_service.ReubicacionesRepository.get_lotes_disponibles')
def test_obtener_lotes_disponibles_error(mock_get_lotes):
    # Arrange
    mock_get_lotes.side_effect = Exception("DB Error")
    
    # Act
    resultado = ReubicacionesService.obtener_lotes_disponibles(1, 100)
    
    # Assert
    assert resultado["status"] == "error"
    assert "DB Error" in resultado["message"]


# ==========================================
# Tests para grabar_reubicacion
# ==========================================

def test_grabar_reubicacion_falta_datos():
    # Act
    resultado = ReubicacionesService.grabar_reubicacion(
        origen={}, destino={}, articulo={}, cantidad=10, terminal=1, operador=1
    )
    
    # Assert
    assert resultado["status"] == "error"
    assert "Faltan datos obligatorios" in resultado["message"]

@patch('app.services.reubicaciones_service.ReubicacionesRepository.get_stock_master_data')
def test_grabar_reubicacion_diferente_propietario(mock_get_master_data):
    # Arrange
    mock_get_master_data.return_value = {"CODTIPODATOMAESTRO": 1, "CODDATOMAESTRO": 10}
    origen = {"CODUBICACION": 1}
    destino = {"CODUBICACION": 2, "CODTIPODATOMAESTRO": 1, "CODDATOMAESTRO": 20}
    articulo = {"CODARTICULO": 100}
    
    # Act
    resultado = ReubicacionesService.grabar_reubicacion(
        origen, destino, articulo, cantidad=10, terminal=1, operador=1
    )
    
    # Assert
    assert resultado["status"] == "error"
    assert "No puede reubicar mercancía de este propietario" in resultado["message"]

@patch('app.services.reubicaciones_service.ReubicacionesRepository.get_stock_master_data')
@patch('app.services.reubicaciones_service.ReubicacionesRepository.grabar_reubicacion')
def test_grabar_reubicacion_success(mock_grabar, mock_get_master_data):
    # Arrange
    mock_get_master_data.return_value = {"CODTIPODATOMAESTRO": 1, "CODDATOMAESTRO": 10}
    mock_grabar.return_value = 0
    origen = {"CODUBICACION": 1}
    destino = {"CODUBICACION": 2, "CODTIPODATOMAESTRO": 1, "CODDATOMAESTRO": 10}
    articulo = {"CODARTICULO": 100}
    
    # Act
    resultado = ReubicacionesService.grabar_reubicacion(
        origen, destino, articulo, cantidad=10, terminal=1, operador=1
    )
    
    # Assert
    assert resultado["status"] == "success"

@patch('app.services.reubicaciones_service.ReubicacionesRepository.get_stock_master_data')
@patch('app.services.reubicaciones_service.ReubicacionesRepository.grabar_reubicacion')
def test_grabar_reubicacion_error_bd(mock_grabar, mock_get_master_data):
    # Arrange
    mock_get_master_data.return_value = None
    mock_grabar.return_value = -1
    origen = {"CODUBICACION": 1}
    destino = {"CODUBICACION": 2}
    articulo = {"CODARTICULO": 100}
    
    # Act
    resultado = ReubicacionesService.grabar_reubicacion(
        origen, destino, articulo, cantidad=10, terminal=1, operador=1
    )
    
    # Assert
    assert resultado["status"] == "error"


# ==========================================
# Tests para validar_palet
# ==========================================

@patch('app.services.reubicaciones_service.ReubicacionesRepository.get_palet_by_sscc')
def test_validar_palet_limpio_success(mock_get_palet):
    # Arrange
    mock_get_palet.return_value = {"CODPALET": 999}
    
    # Act
    resultado = ReubicacionesService.validar_palet("]C1(00)123456789012345678")
    
    # Assert
    assert resultado["status"] == "success"
    mock_get_palet.assert_called_once_with("123456789012345678")

@patch('app.services.reubicaciones_service.ReubicacionesRepository.get_palet_by_sscc')
def test_validar_palet_no_encontrado(mock_get_palet):
    # Arrange
    mock_get_palet.return_value = None
    
    # Act
    resultado = ReubicacionesService.validar_palet("UNKNOWN")
    
    # Assert
    assert resultado["status"] == "error"
    assert "No se ha encontrado ningún palet" in resultado["message"]


# ==========================================
# Tests para grabar_reubicacion_palet
# ==========================================

def test_grabar_reubicacion_palet_faltan_datos():
    # Act
    resultado = ReubicacionesService.grabar_reubicacion_palet(
        palet={}, destino={}, terminal=1, operador=1
    )
    
    # Assert
    assert resultado["status"] == "error"
    assert "Faltan datos obligatorios" in resultado["message"]

@patch('app.services.reubicaciones_service.ReubicacionesRepository.grabar_reubicacion_palet')
def test_grabar_reubicacion_palet_success(mock_grabar_palet):
    # Arrange
    mock_grabar_palet.return_value = 0
    palet = {"CODPALET": 999}
    destino = {"CODUBICACION": 2}
    
    # Act
    resultado = ReubicacionesService.grabar_reubicacion_palet(
        palet, destino, terminal=1, operador=1
    )
    
    # Assert
    assert resultado["status"] == "success"
    assert "correctamente" in resultado["message"]
