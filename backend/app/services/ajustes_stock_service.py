import logging
from datetime import datetime
from typing import List, Dict, Any, Optional

from ..repositories.ajustes_stock_repo import StockAjustesRepository

logger = logging.getLogger(__name__)

class StockAjustesService:
    @staticmethod
    def get_conceptos() -> List[Dict[str, Any]]:
        return StockAjustesRepository.get_conceptos()

    @staticmethod
    def get_lotes(cod_ubicacion: int, cod_articulo: int) -> List[Dict[str, Any]]:
        lotes = StockAjustesRepository.get_lotes_articulo_ubicacion(cod_ubicacion, cod_articulo)
        for lote in lotes:
            fecha = lote.get('FECHACADUCIDAD')
            lote['FECHACADUCIDAD_STR'] = fecha.strftime('%Y-%m-%d') if fecha else ''
        return lotes

    @staticmethod
    def _parse_fecha_caducidad(fecha_str: Optional[str]) -> Optional[datetime]:
        if not fecha_str:
            return None
        try:
            return datetime.strptime(fecha_str, '%Y-%m-%d')
        except ValueError:
            logger.warning(f"Invalid date format: {fecha_str}")
            return None

    @staticmethod
    def ejecutar_ajuste(payload: Dict[str, Any], cod_operador: int, cod_terminal: int) -> Dict[str, Any]:
        fecha_caducidad_date = StockAjustesService._parse_fecha_caducidad(payload.get('fechaCaducidad'))

        datos = {
            'cod_terminal': cod_terminal,
            'cod_operador': cod_operador,
            'cod_articulo': payload.get('codArticulo'),
            'cod_concepto': payload.get('codConcepto'),
            'cantidad': payload.get('cantidad', 0),
            'cant_segunda_unidad': payload.get('cantSegundaUnidad', 0),
            'fecha_caducidad': fecha_caducidad_date,
            'lote': payload.get('lote') or None,
            'cod_ubicacion': payload.get('codUbicacion'),
            'cod_documento': -1,
            'numeros_serie': None,
            'tipo_dato_maestro': 0,
            'cod_dato_maestro': 0
        }

        try:
            resultado = StockAjustesRepository.ejecutar_ajuste(datos)
            return {"status": "success", "result_code": resultado}
        except Exception as e:
            logger.error(f"Error executing adjustment: {e}", exc_info=True)
            raise
