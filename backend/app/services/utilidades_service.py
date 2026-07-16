from ..repositories.utilidades_repo import UtilidadesRepo

class UtilidadesService:

    @staticmethod
    def get_ean_info(ean: str):
        try:
            ean_data = UtilidadesRepo.get_ean_info(ean)
            if ean_data:
                return {"status": "success", "exists": True, "data": ean_data}
            return {"status": "success", "exists": False}
        except Exception as e:
            raise Exception(f"Error al obtener información del EAN: {str(e)}")

    @staticmethod
    def crear_ean(ean: str, cod_articulo: int, factor: int):
        try:
            # Verificar si ya existe
            ean_data = UtilidadesRepo.get_ean_info(ean)
            if ean_data:
                return {"status": "error", "message": "El EAN ya existe"}
            
            UtilidadesRepo.insert_ean(ean, cod_articulo, factor)
            return {"status": "success", "message": "EAN creado exitosamente"}
        except Exception as e:
            raise Exception(f"Error al crear el EAN: {str(e)}")

    @staticmethod
    def actualizar_ean(ean: str, cod_articulo: int, factor: int):
        try:
            ean_data = UtilidadesRepo.get_ean_info(ean)
            if not ean_data:
                return {"status": "error", "message": "El EAN no existe"}

            UtilidadesRepo.update_ean(ean, cod_articulo, factor)
            return {"status": "success", "message": "EAN actualizado exitosamente"}
        except Exception as e:
            raise Exception(f"Error al actualizar el EAN: {str(e)}")
