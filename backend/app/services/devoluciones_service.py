import logging
from typing import List, Dict, Any, Optional
from ..repositories.devoluciones_repo import DevolucionesRepository

logger = logging.getLogger(__name__)

class DevolucionesService:
    @staticmethod
    def get_clientes(filtro: str) -> List[Dict[str, Any]]:
        if not filtro:
            return []
        return DevolucionesRepository.get_clientes(filtro)

    @staticmethod
    def get_parametros_devolucion() -> Dict[str, Any]:
        params = DevolucionesRepository.get_parametros_devolucion()
        return {
            "pedir_ubicacion": params.get("1636", "0") != "0",
            "cod_ubicacion_defecto": params.get("1637"),
            "serie": params.get("1768")
        }

    @staticmethod
    def crear_devolucion_cabecera(payload: Dict[str, Any]) -> Dict[str, Any]:
        if not payload.get("CODCLIENTE"):
            raise ValueError("El código de cliente es obligatorio.")
        return DevolucionesRepository.crear_devolucion_cabecera(payload)

    @staticmethod
    def grabar_linea_devolucion(payload: Dict[str, Any]) -> Dict[str, Any]:
        if not payload.get("CODDOCUMENTO"):
            raise ValueError("El código de documento es obligatorio.")
        if not payload.get("CODARTICULO"):
            raise ValueError("El código de artículo es obligatorio.")
        if int(payload.get("UNIDADES", 0)) <= 0:
            raise ValueError("La cantidad debe ser mayor que 0.")

        return DevolucionesRepository.grabar_linea_devolucion(payload)

    @staticmethod
    def get_devolucion_en_curso(cod_operador: int) -> Optional[Dict[str, Any]]:
        return DevolucionesRepository.get_devolucion_en_curso(cod_operador)

    @staticmethod
    def get_lineas_devolucion(cod_documento: int) -> List[Dict[str, Any]]:
        return DevolucionesRepository.get_lineas_devolucion(cod_documento)

    @staticmethod
    def finalizar_devolucion(cod_documento: int) -> Dict[str, Any]:
        if not cod_documento:
            raise ValueError("El código de documento es obligatorio.")
        
        DevolucionesRepository.finalizar_devolucion(cod_documento)
        return {"status": "success", "message": "Devolución finalizada con éxito."}
