import logging
from ..repositories.devoluciones_repo import DevolucionesRepository

logger = logging.getLogger(__name__)


class DevolucionesService:
    @staticmethod
    def get_clientes(filtro: str) -> list:
        if not filtro:
            return []
        return DevolucionesRepository.get_clientes(filtro)

    @staticmethod
    def get_parametros_devolucion() -> dict:
        params = DevolucionesRepository.get_parametros_devolucion()
        # 1636: 0 = ubicación fija, resto = pedir ubicación
        # 1637: código de ubicación fija
        # 1768: serie
        return {
            "pedir_ubicacion": params.get("1636", "0") != "0",
            "cod_ubicacion_defecto": params.get("1637"),
            "serie": params.get("1768")
        }

    @staticmethod
    def crear_devolucion_cabecera(payload: dict) -> dict:
        if not payload.get("CODCLIENTE"):
            raise ValueError("El código de cliente es obligatorio.")
        return DevolucionesRepository.crear_devolucion_cabecera(payload)

    @staticmethod
    def grabar_linea_devolucion(payload: dict) -> dict:
        if not payload.get("CODDOCUMENTO"):
            raise ValueError("El código de documento es obligatorio.")
        if not payload.get("CODARTICULO"):
            raise ValueError("El código de artículo es obligatorio.")
        if not payload.get("UNIDADES") or int(payload.get("UNIDADES")) <= 0:
            raise ValueError("La cantidad debe ser mayor que 0.")

        return DevolucionesRepository.grabar_linea_devolucion(payload)

    @staticmethod
    def get_devolucion_en_curso(cod_operador: int) -> dict or None:
        return DevolucionesRepository.get_devolucion_en_curso(cod_operador)

    @staticmethod
    def get_lineas_devolucion(cod_documento: int) -> list:
        return DevolucionesRepository.get_lineas_devolucion(cod_documento)

    @staticmethod
    def finalizar_devolucion(cod_documento: int) -> dict:
        if not cod_documento:
            raise ValueError("El código de documento es obligatorio.")
        DevolucionesRepository.finalizar_devolucion(cod_documento)
        return {"status": "success", "message": "Devolución finalizada con éxito."}
