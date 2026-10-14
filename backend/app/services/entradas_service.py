import logging
from typing import Dict, Any, Optional, List

from app.repositories.entradas_repo import EntradasRepository
from app.repositories.stock_repo import StockRepository
from app.utils.impresion import imprimir_etiqueta_palet

logger = logging.getLogger(__name__)

def _success_response(**kwargs) -> Dict[str, Any]:
    """Helper para estructurar respuestas exitosas."""
    return {"status": "success", **kwargs}

def _error_response(message: str, error: Optional[Exception] = None) -> Dict[str, Any]:
    """Helper para estructurar y loguear respuestas de error."""
    if error:
        logger.error(f"{message}: {str(error)}", exc_info=True)
    else:
        logger.warning(message)
    return {"status": "error", "message": message}


class EntradasService:
    """
    Servicio de Entradas de Almacén.
    Gestiona la lógica de negocio para la recepción de mercancías, albaranes,
    grabación de líneas y consultas de proveedores.
    """

    @staticmethod
    def get_parametros_entrada() -> Dict[str, Any]:
        try:
            params = EntradasRepository.get_parametros_entrada()
            return _success_response(parametros=params)
        except Exception as e:
            return _error_response("Error al obtener parámetros de entrada", e)

    @staticmethod
    def get_muelles() -> Dict[str, Any]:
        try:
            muelles = EntradasRepository.get_muelles()
            return _success_response(muelles=muelles)
        except Exception as e:
            return _error_response("Error al obtener muelles", e)

    @staticmethod
    def get_albaranes_en_curso(codmuelle: int) -> Dict[str, Any]:
        if not codmuelle:
            return _error_response("El muelle es requerido")
        try:
            albaranes = EntradasRepository.get_albaranes_en_curso(codmuelle)
            return _success_response(albaranes=albaranes)
        except Exception as e:
            return _error_response("Error al obtener albaranes en curso", e)

    @staticmethod
    def get_proveedores() -> Dict[str, Any]:
        try:
            proveedores = EntradasRepository.get_proveedores_con_pedidos_pendientes()
            return _success_response(proveedores=proveedores)
        except Exception as e:
            return _error_response("Error al obtener proveedores con pedidos", e)

    @staticmethod
    def get_todos_proveedores() -> Dict[str, Any]:
        try:
            proveedores = EntradasRepository.get_proveedores()
            return _success_response(proveedores=proveedores)
        except Exception as e:
            return _error_response("Error al obtener todos los proveedores", e)

    @staticmethod
    def get_pedidos(codproveedor: int) -> Dict[str, Any]:
        if not codproveedor:
            return _error_response("El código de proveedor es requerido")
        try:
            pedidos = EntradasRepository.get_pedidos_pendientes_por_proveedor(codproveedor)
            return _success_response(pedidos=pedidos)
        except Exception as e:
            return _error_response("Error al obtener pedidos pendientes", e)

    @staticmethod
    def crear_albaran(payload: Dict[str, Any]) -> Dict[str, Any]:
        if not payload:
            return _error_response("El payload no puede estar vacío")
        try:
            cod_documento = EntradasRepository.crear_albaran(payload)
            return _success_response(coddocumento=cod_documento)
        except Exception as e:
            return _error_response("Error al crear albarán", e)

    @staticmethod
    def grabar_linea(payload: Dict[str, Any]) -> Dict[str, Any]:
        ean = payload.get('EAN')
        unidades = payload.get('UNIDADES')

        if not ean or not unidades:
            return _error_response("EAN y Unidades son obligatorios")

        # Fallback para completar CODARTICULO
        if not payload.get('CODARTICULO'):
            try:
                articulo = EntradasRepository.get_info_articulo_por_ean(ean)
                if not articulo:
                    return _error_response(f"Artículo con EAN {ean} no encontrado")
                payload['CODARTICULO'] = articulo['CODARTICULO']
            except ValueError as ve:
                return _error_response(str(ve))
            except Exception as e:
                return _error_response("Error al obtener info del artículo", e)

        # Grabación de la línea de entrada
        try:
            result = EntradasRepository.grabar_linea_entrada(payload)
            return EntradasService._procesar_etiquetas_palets(
                coddocumento=result.get('coddocumento'),
                palets_imprimir=result.get('palets_imprimir', [])
            )
        except Exception as e:
            return _error_response("Error al grabar línea de entrada", e)

    @staticmethod
    def _procesar_etiquetas_palets(coddocumento: int, palets_imprimir: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Lógica privada para delegar la impresión de etiquetas y generar la respuesta.
        """
        avisos_impresion = []
        for datos_palet in palets_imprimir:
            codterminal = datos_palet.get('codterminal', 1)
            res_imp = imprimir_etiqueta_palet(codterminal, datos_palet)
            
            if not res_imp.get('ok'):
                mensaje = res_imp.get('mensaje', 'Error desconocido')
                logger.warning(f"Aviso impresión: {mensaje}")
                avisos_impresion.append(mensaje)
            else:
                logger.info(f"Etiqueta impresa: SSCC={datos_palet.get('sscc')}")

        respuesta = _success_response(coddocumento=coddocumento)
        if avisos_impresion:
            respuesta["aviso_impresion"] = " | ".join(avisos_impresion)
            
        return respuesta

    @staticmethod
    def finalizar_entrada(coddocumento: int, codoperador: int) -> Dict[str, Any]:
        if not coddocumento or not codoperador:
            return _error_response("Código de documento y operador son requeridos")
            
        try:
            EntradasRepository.finalizar_entrada(coddocumento, codoperador)
            return _success_response(message="Entrada finalizada con éxito")
        except Exception as e:
            return _error_response("Error interno al finalizar la entrada", e)

    @staticmethod
    def get_albaranes_para_finalizar() -> Dict[str, Any]:
        try:
            albaranes = EntradasRepository.get_albaranes_para_finalizar()
            return _success_response(albaranes=albaranes)
        except Exception as e:
            return _error_response("Error interno al consultar albaranes", e)

    @staticmethod
    def get_lineas_grabadas(coddocumento: int) -> Dict[str, Any]:
        if not coddocumento:
            return _error_response("El código de documento es requerido")
            
        try:
            lineas = EntradasRepository.get_lineas_grabadas(coddocumento)
            return _success_response(lineas=lineas)
        except Exception as e:
            return _error_response("Error al consultar líneas grabadas", e)

    @staticmethod
    def get_detalle_linea(codlineadocumentoproveedor: int) -> Dict[str, Any]:
        if not codlineadocumentoproveedor:
            return _error_response("El código de línea es requerido")
            
        try:
            detalle = EntradasRepository.get_detalle_linea(codlineadocumentoproveedor)
            return _success_response(detalle=detalle)
        except Exception as e:
            return _error_response("Error al consultar detalle de línea", e)

    @staticmethod
    def get_lineas_pendientes(coddocumento_albaran: int) -> Dict[str, Any]:
        if not coddocumento_albaran:
            return _error_response("El código de documento del albarán es requerido")
            
        try:
            lineas = EntradasRepository.get_lineas_pendientes(coddocumento_albaran)
            return _success_response(lineas=lineas)
        except Exception as e:
            return _error_response("Error al consultar líneas pendientes", e)

    @staticmethod
    def get_articulo_info(ean: str) -> Dict[str, Any]:
        if not ean:
            return _error_response("EAN vacío")
            
        try:
            info = EntradasRepository.get_info_articulo_por_ean(ean)
            if not info:
                return _error_response(f"EAN {ean} no encontrado")
            return _success_response(info=info)
        except ValueError as ve:
            return _error_response(str(ve))
        except Exception as e:
            return _error_response("Error al buscar EAN", e)
