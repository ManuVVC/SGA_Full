import logging
from ..repositories.stock_repo import StockRepository
from ..utils.exceptions import ArticuloNotFoundError

logger = logging.getLogger(__name__)

class StockService:
    @staticmethod
    def consultar_stock_articulo(cod_articulo: str) -> dict:
        """
        Consulta el catálogo para verificar la existencia del artículo.
        Si existe, obtiene su stock detallado por ubicación.
        
        Lanza ArticuloNotFoundError si el artículo no existe en el maestro.
        Retorna un diccionario estructurado con los detalles del stock.
        """
        if not cod_articulo:
            raise ArticuloNotFoundError("El código del artículo no puede estar vacío.")

        # 1. Verificar existencia en el maestro de artículos
        articulo = StockRepository.get_articulo_por_codigo(cod_articulo)
        if not articulo:
            raise ArticuloNotFoundError(f"El artículo '{cod_articulo}' no existe en el maestro del sistema.")

        # 2. Consultar el stock por ubicación
        cod_articulo_int = articulo["CODARTICULO"]
        ubicaciones = StockRepository.get_stock_por_articulo(cod_articulo_int)

        # 3. Calcular el stock total y verificar si tiene stock
        stock_total = sum(item["cantidad"] for item in ubicaciones)
        tiene_stock = len(ubicaciones) > 0 and stock_total > 0

        resultado = {
            "articulo": {
                "cod_articulo": articulo["CODARTICULO"],
                "cod_articulo_aplicacion": articulo["CODARTICULOAPLICACION"],
                "nombre": articulo["NOMBREARTICULO"]
            },
            "tiene_stock": tiene_stock,
            "stock_total": stock_total,
            "ubicaciones": ubicaciones
        }

        if not tiene_stock:
            logger.info(f"El artículo '{cod_articulo}' existe pero no tiene stock en ninguna ubicación.")
        else:
            logger.info(f"Consulta de stock exitosa para '{cod_articulo}': Total {stock_total} en {len(ubicaciones)} ubicaciones.")

        return resultado

    @staticmethod
    def actualizar_configuracion_ubicacion(cod_ubicacion: int, bloqueo_entrada: int, bloqueo_salida: int, ubicar_docs: int) -> dict:
        """
        Actualiza los parámetros de configuración de una ubicación.
        """
        if not cod_ubicacion:
            raise ValueError("El código de ubicación no puede estar vacío.")

        success = StockRepository.actualizar_configuracion_ubicacion(
            cod_ubicacion, bloqueo_entrada, bloqueo_salida, ubicar_docs
        )
        if not success:
            raise ValueError(f"No se pudo actualizar la configuración de la ubicación {cod_ubicacion}.")

        return {"status": "success", "message": "Configuración actualizada correctamente"}

    @staticmethod
    def consultar_stock_ubicacion(cod_ubicacion: int) -> dict:
        """
        Consulta el contenido (stock) de una ubicación.
        Retorna la lista de artículos, lotes y cantidades almacenadas ahí.
        """
        if not cod_ubicacion:
            raise ValueError("El código de ubicación no puede estar vacío.")

        articulos = StockRepository.get_stock_por_ubicacion(cod_ubicacion)
        stock_total = sum(item["stock"] for item in articulos)
        
        return {
            "cod_ubicacion": cod_ubicacion,
            "tiene_stock": len(articulos) > 0,
            "stock_total": stock_total,
            "articulos": articulos
        }

    @staticmethod
    def consultar_stock_ean(ean_leido: str) -> dict:
        from ..utils.exceptions import EanNoEncontrado
        if not ean_leido:
            raise EanNoEncontrado("El código EAN no puede estar vacío.")

        articulo = StockRepository.get_articulo_por_ean(ean_leido)
        if not articulo:
            raise EanNoEncontrado(f"El código EAN '{ean_leido}' no está registrado.")

        cod_articulo_int = articulo["CODARTICULO"]
        ubicaciones = StockRepository.get_stock_por_articulo(cod_articulo_int)

        resultado = {
            "articulo_comercial": articulo["CODARTICULOAPLICACION"],
            "nombre": articulo["NOMBREARTICULO"],
            "ubicaciones": ubicaciones
        }

        return resultado

    @staticmethod
    def search_articulos(search_type: str, query: str) -> list:
        if not query:
            return []
        
        articulos = StockRepository.search_articulos(search_type, query)
        
        # Formatear salida para el frontend
        resultados = []
        for a in articulos:
            resultados.append({
                "cod_articulo": a["CODARTICULO"],
                "cod_articulo_aplicacion": a["CODARTICULOAPLICACION"],
                "nombre": a["NOMBREARTICULO"],
                "factor_conversion": a["FACTORCONVERSION"]
            })
            
        return resultados

    @staticmethod
    def consultar_eans_articulo(cod_articulo: int) -> list:
        if not cod_articulo:
            return []
            
        eans = StockRepository.get_eans_por_articulo(cod_articulo)
        return eans
