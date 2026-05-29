import logging
from ..repositories.stock_repo import StockRepository
from ..utils.exceptions import ArticuloNoEncontrado, EanNoEncontrado

logger = logging.getLogger(__name__)


class StockService:
    @staticmethod
    def consultar_stock_articulo(cod_articulo: str) -> list:
        """
        Consulta el stock de un artículo.
        Lanza la excepción personalizada ArticuloNoEncontrado si el artículo
        no tiene stock o no existe en la base de datos.
        """
        if not cod_articulo or not cod_articulo.strip():
            raise ValueError("El código de artículo es inválido o no puede estar vacío.")

        cod_articulo = cod_articulo.strip()

        # Consultar stock desglosado desde el repositorio
        stock = StockRepository.get_stock_por_articulo(cod_articulo)

        # Regla de negocio: si no se encontraron filas, lanzar excepción
        if not stock:
            logger.info(f"Consulta de stock vacía para el artículo '{cod_articulo}'. Lanzando ArticuloNoEncontrado.")
            raise ArticuloNoEncontrado(f"El artículo '{cod_articulo}' no se encuentra en el stock o no existe.")

        return stock

    @staticmethod
    def consultar_stock_ean(ean_leido: str) -> dict:
        """
        Consulta el stock de un artículo resolviéndolo mediante su código EAN.
        Lanza la excepción EanNoEncontrado si el EAN no existe en el sistema.
        Formatea el resultado estructurado de forma legible para un terminal Seypos.
        """
        if not ean_leido or not ean_leido.strip():
            raise ValueError("El código EAN leído no puede estar vacío.")

        ean_leido = ean_leido.strip()

        # Consultar repositorio
        stock = StockRepository.get_stock_por_ean(ean_leido)

        if not stock:
            logger.info(f"Resolución de EAN fallida o sin stock para: '{ean_leido}'")
            raise EanNoEncontrado(f"El código EAN '{ean_leido}' no está registrado en el sistema o no tiene stock.")

        # Agrupar los datos para el formato del terminal Seypos
        first_row = stock[0]
        
        ubicaciones_list = [
            {
                "ubicacion": row["CODUBICACION"],
                "lote": row["LOTE"],
                "cantidad": row["CANTIDAD"]
            }
            for row in stock
        ]

        resultado = {
            "articulo_comercial": first_row["CODARTICULOAPLICACION"],
            "nombre": first_row["NOMBREARTICULO"],
            "ubicaciones": ubicaciones_list,
            "stock": ubicaciones_list
        }

        logger.info(f"Stock por EAN '{ean_leido}' resuelto. Estructura Seypos devuelta.")
        return resultado
