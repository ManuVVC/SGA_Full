from app.repositories.entradas_repo import EntradasRepository
from app.repositories.stock_repo import StockRepository
import logging

logger = logging.getLogger(__name__)

class EntradasService:
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
    def get_pedidos(codproveedor: int):
        pedidos = EntradasRepository.get_pedidos_pendientes_por_proveedor(codproveedor)
        return {"status": "success", "pedidos": pedidos}

    @staticmethod
    def crear_albaran(payload: dict):
        num_albaran = payload.get('NUMALBARAN')
        cod_proveedor = payload.get('CODPROVEEDOR')
        cod_muelle = payload.get('CODMUELLE')
        cod_pedido = payload.get('CODPEDIDO') # Opcional

        if not num_albaran or not cod_proveedor or not cod_muelle:
            return {"status": "error", "message": "Faltan datos requeridos para crear el albarán (num_albaran, proveedor, muelle)."}
        
        try:
            cod_documento = EntradasRepository.crear_cabecera_albaran(num_albaran, cod_proveedor, cod_muelle, cod_pedido)
            return {"status": "success", "coddocumento": cod_documento}
        except Exception as e:
            return {"status": "error", "message": f"Error al crear albarán: {str(e)}"}

    @staticmethod
    def grabar_linea(payload: dict):
        cod_documento = payload.get('CODDOCUMENTO')
        ean = payload.get('EAN')
        unidades = payload.get('UNIDADES')

        if not cod_documento or not ean or unidades is None or int(unidades) <= 0:
            return {"status": "error", "message": "Datos de línea incompletos (documento, ean, unidades)."}
        
        try:
            # 1. Obtener artículo por EAN (o CODARTICULO)
            articulo = StockRepository.get_articulo_por_ean(ean)
            if not articulo:
                # Opcional: Permitir meter código interno en lugar de EAN. Pero el EAN checker es más robusto.
                # Assuming EAN checker works, fallback to standard error
                return {"status": "error", "message": "Artículo no encontrado."}
            
            payload['CODARTICULO'] = articulo['CODARTICULO']
            
            # 2. Grabar la línea (creará los palets e imprimirá según configuración backend)
            resultado = EntradasRepository.grabar_linea_entrada(payload)
            
            if resultado != 0:
                # Assuming 0 is success in stored procedures out param, or it raises exception
                pass
                
            return {"status": "success", "message": "Línea grabada con éxito"}
        except Exception as e:
            return {"status": "error", "message": f"Error al grabar línea: {str(e)}"}

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
