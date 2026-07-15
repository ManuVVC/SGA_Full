import logging
from datetime import datetime
from ..repositories.ajustes_stock_repo import StockAjustesRepository

logger = logging.getLogger(__name__)

class StockAjustesService:
    @staticmethod
    def get_conceptos():
        return StockAjustesRepository.get_conceptos()

    @staticmethod
    def get_lotes(cod_ubicacion: int, cod_articulo: int):
        # Retrieve lotes and format date if needed
        lotes = StockAjustesRepository.get_lotes_articulo_ubicacion(cod_ubicacion, cod_articulo)
        for lote in lotes:
            if lote.get('FECHACADUCIDAD'):
                # Format to YYYY-MM-DD for easier frontend handling
                lote['FECHACADUCIDAD_STR'] = lote['FECHACADUCIDAD'].strftime('%Y-%m-%d')
            else:
                lote['FECHACADUCIDAD_STR'] = ''
        return lotes

    @staticmethod
    def ejecutar_ajuste(payload: dict, cod_operador: int, cod_terminal: int):
        # Format the data according to the repo expectations
        fecha_caducidad_str = payload.get('fechaCaducidad')
        fecha_caducidad_date = None
        if fecha_caducidad_str:
            try:
                fecha_caducidad_date = datetime.strptime(fecha_caducidad_str, '%Y-%m-%d')
            except ValueError:
                fecha_caducidad_date = None

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

        # Ejecutamos en el repositorio
        resultado = StockAjustesRepository.ejecutar_ajuste(datos)
        
        # Opcionalmente se puede devolver un status success
        return {"status": "success", "result_code": resultado}
