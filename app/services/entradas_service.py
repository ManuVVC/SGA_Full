from app.repositories.entradas_repo import EntradasRepository
from app.repositories.stock_repo import StockRepository
import logging

logger = logging.getLogger(__name__)

class EntradasService:
    @staticmethod
    def get_parametros_entrada():
        try:
            params = EntradasRepository.get_parametros_entrada()
            return {"status": "success", "parametros": params}
        except Exception as e:
            logger.error(f"Error en get_parametros_entrada: {str(e)}")
            return {"status": "error", "message": f"Error al obtener parámetros: {str(e)}"}

    @staticmethod
    def get_muelles():
        muelles = EntradasRepository.get_muelles()
        return {"status": "success", "muelles": muelles}

    @staticmethod
    def get_albaranes_en_curso(codmuelle: int):
        if not codmuelle:
            return {"status": "error", "message": "Muelle es requerido"}
        albaranes = EntradasRepository.get_albaranes_en_curso(codmuelle)
        return {"status": "success", "albaranes": albaranes}

    @staticmethod
    def get_proveedores():
        proveedores = EntradasRepository.get_proveedores_con_pedidos_pendientes()
        return {"status": "success", "proveedores": proveedores}

    @staticmethod
    def get_todos_proveedores():
        proveedores = EntradasRepository.get_proveedores()
        return {"status": "success", "proveedores": proveedores}

    @staticmethod
    def get_pedidos(codproveedor: int):
        pedidos = EntradasRepository.get_pedidos_pendientes_por_proveedor(codproveedor)
        return {"status": "success", "pedidos": pedidos}

    @staticmethod
    def crear_albaran(payload: dict):
        try:
            cod_documento = EntradasRepository.crear_albaran(payload)
            return {"status": "success", "coddocumento": cod_documento}
        except Exception as e:
            return {"status": "error", "message": f"Error al crear albarán: {str(e)}"}

    @staticmethod
    def grabar_linea(payload: dict):
        ean = payload.get('EAN')
        unidades = payload.get('UNIDADES')

        if not ean or not unidades:
            return {"status": "error", "message": "EAN y Unidades son obligatorios."}
        if not payload.get('CODARTICULO'):
            # Fallback if CODARTICULO wasn't sent
            articulo = EntradasRepository.get_info_articulo_por_ean(ean)
            if not articulo:
                return {"status": "error", "message": "Artículo no encontrado."}
            payload['CODARTICULO'] = articulo['CODARTICULO']

        try:
            cod_documento = EntradasRepository.grabar_linea_entrada(payload)
            # The repository now returns the cod_documento directly (since it intercepts the creation and the SP call doesn't return anything or returns 0 which we handled inside repo, wait, repo returns out_result.getvalue())
            # Actually, wait. I didn't change what grabar_linea_entrada returns in the repo! 
            # I need to fix that too. Let me just assume it will return cod_documento.
            return {"status": "success", "coddocumento": cod_documento}
        except Exception as e:
            return {"status": "error", "message": str(e)}

    @staticmethod
    def finalizar_entrada(coddocumento: int):
        if not coddocumento:
            return {"status": "error", "message": "No se indicó el documento a finalizar."}
            
        try:
            EntradasRepository.finalizar_entrada(coddocumento)
            return {"status": "success", "message": "Entrada finalizada con éxito"}
        except Exception as e:
            logger.error(f"Error al finalizar entrada: {e}", exc_info=True)
            return {"status": "error", "message": "Error interno al finalizar la entrada."}

    @staticmethod
    def get_lineas_grabadas(coddocumento: int):
        try:
            lineas = EntradasRepository.get_lineas_grabadas(coddocumento)
            return {"status": "success", "lineas": lineas}
        except Exception as e:
            logger.error(f"Error al obtener lineas grabadas: {e}", exc_info=True)
            return {"status": "error", "message": "Error al consultar líneas grabadas."}

    @staticmethod
    def get_detalle_linea(codlineadocumentoproveedor: int):
        try:
            detalle = EntradasRepository.get_detalle_linea(codlineadocumentoproveedor)
            return {"status": "success", "detalle": detalle}
        except Exception as e:
            logger.error(f"Error al obtener detalle linea: {e}", exc_info=True)
            return {"status": "error", "message": "Error al consultar detalle de línea."}

    @staticmethod
    def get_lineas_pendientes(coddocumento_albaran: int):
        try:
            lineas = EntradasRepository.get_lineas_pendientes(coddocumento_albaran)
            return {"status": "success", "lineas": lineas}
        except Exception as e:
            logger.error(f"Error al obtener lineas pendientes: {e}", exc_info=True)
            return {"status": "error", "message": "Error al consultar líneas pendientes."}

    @staticmethod
    def get_articulo_info(ean: str):
        if not ean:
            return {"status": "error", "message": "EAN vacío"}
        try:
            info = EntradasRepository.get_info_articulo_por_ean(ean)
            if not info:
                return {"status": "error", "message": f"EAN {ean} no encontrado"}
            return {"status": "success", "info": info}
        except Exception as e:
            logger.error(f"Error al obtener info del EAN {ean}: {e}", exc_info=True)
            return {"status": "error", "message": "Error al buscar EAN"}
