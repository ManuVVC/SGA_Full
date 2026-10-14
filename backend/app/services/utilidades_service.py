from ..repositories.utilidades_repo import UtilidadesRepo
import logging

logger = logging.getLogger(__name__)

class UtilidadesService:
    """Servicio para la gestión de utilidades como EAN."""

    @staticmethod
    def get_ean_info(ean: str) -> dict:
        """Obtiene información sobre un EAN dado."""
        ean_data = UtilidadesRepo.get_ean_info(ean)
        return {
            "status": "success",
            "exists": bool(ean_data),
            "data": ean_data if ean_data else None
        }

    @staticmethod
    def crear_ean(ean: str, cod_articulo: int, factor: int) -> dict:
        """Crea un nuevo EAN verificando que no exista previamente."""
        if UtilidadesRepo.get_ean_info(ean):
            return {"status": "error", "message": "El EAN ya existe"}
        
        UtilidadesRepo.insert_ean(ean, cod_articulo, factor)
        return {"status": "success", "message": "EAN creado exitosamente"}

    @staticmethod
    def actualizar_ean(ean: str, cod_articulo: int, factor: int) -> dict:
        """Actualiza un EAN existente."""
        if not UtilidadesRepo.get_ean_info(ean):
            return {"status": "error", "message": "El EAN no existe"}

        UtilidadesRepo.update_ean(ean, cod_articulo, factor)
        return {"status": "success", "message": "EAN actualizado exitosamente"}
