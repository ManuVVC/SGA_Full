import logging
from datetime import datetime
from typing import Dict, Any, Optional

from ..repositories.kits_repo import KitsRepository
from ..repositories.stock_repo import StockRepository
from ..services.reubicaciones_service import ReubicacionesService

logger = logging.getLogger(__name__)


class KitsService:
    """
    Servicio de lógica de negocio para montaje y desmontaje de kits (artículos compuestos).
    Desacoplado completamente de la capa HTTP (flask.request).
    """

    @staticmethod
    def consultar_composicion_kit(cod_articulo: int, cod_ubicacion: Optional[int] = None) -> Dict[str, Any]:
        """
        Consulta la composición de un artículo kit y calcula la disponibilidad de sus componentes.
        Reutiliza StockRepository.get_articulo_por_codigo para los datos de cabecera.
        """
        try:
            articulo_info = StockRepository.get_articulo_por_codigo(str(cod_articulo))
            if not articulo_info:
                return {"status": "error", "message": f"Artículo con código {cod_articulo} no encontrado."}

            es_kit = KitsRepository.es_articulo_kit(cod_articulo)
            if not es_kit:
                return {
                    "status": "error",
                    "message": f"El artículo '{articulo_info.get('NOMBREARTICULO')}' no está configurado como kit o no tiene componentes."
                }

            componentes = KitsRepository.get_composicion_kit(cod_articulo, cod_ubicacion)
            if not componentes:
                return {
                    "status": "error",
                    "message": f"El kit '{articulo_info.get('NOMBREARTICULO')}' no contiene componentes registrados."
                }

            max_kits = None
            if cod_ubicacion:
                kits_posibles_lista = [c["KITS_POSIBLES"] for c in componentes]
                max_kits = min(kits_posibles_lista) if kits_posibles_lista else 0

            return {
                "status": "success",
                "articulo": articulo_info,
                "componentes": componentes,
                "max_kits": max_kits
            }
        except Exception as e:
            logger.error(f"Error al consultar composición del kit {cod_articulo}: {e}", exc_info=True)
            return {"status": "error", "message": f"Error al consultar composición del kit: {str(e)}"}

    @staticmethod
    def validar_montaje(cod_ubicacion: int, cod_articulo: int, cantidad: float) -> Dict[str, Any]:
        """
        Valida mediante GSM_LOTES.SPPRP_CHECKUNIDADESPREPLOTE si existen unidades suficientes
        de todos los componentes para preparar la cantidad solicitada.
        """
        try:
            if cantidad <= 0:
                return {"status": "error", "message": "La cantidad a montar debe ser mayor que cero."}

            if not KitsRepository.es_articulo_kit(cod_articulo):
                return {"status": "error", "message": "El artículo indicado no está configurado como kit."}

            res = KitsRepository.check_unidades_prep_lote(cod_ubicacion, cod_articulo, cantidad)
            if res != 0:
                return {
                    "status": "error",
                    "message": "Stock insuficiente de uno o varios componentes en la ubicación para montar la cantidad indicada."
                }

            return {"status": "success", "message": "Validación correcta. Hay stock suficiente de componentes."}
        except Exception as e:
            logger.error(f"Error al validar montaje de kit {cod_articulo}: {e}", exc_info=True)
            return {"status": "error", "message": f"Error al validar el montaje: {str(e)}"}

    @staticmethod
    def ejecutar_montaje(
        cod_terminal: int,
        cod_ubicacion_origen: int,
        cod_articulo: int,
        cantidad: float,
        fecha_caducidad_str: Optional[str] = None,
        peso: float = 0.0,
        cod_ubicacion_destino: Optional[int] = None,
        cod_palet: Optional[int] = None,
        cod_facturacion: Optional[str] = None,
        numero_lote: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Ejecuta el montaje del kit llamando a GSM_LOTES.SPPRP_CrearLote.
        """
        try:
            if cantidad <= 0:
                return {"status": "error", "message": "La cantidad de kits a montar debe ser superior a 0."}

            # Validar stock previo de componentes con GSM_LOTES
            check_stock = KitsRepository.check_unidades_prep_lote(cod_ubicacion_origen, cod_articulo, cantidad)
            if check_stock != 0:
                return {
                    "status": "error",
                    "message": "No hay stock suficiente de componentes en la ubicación de origen para montar este kit."
                }

            # Validar ubicación de destino si es diferente
            if cod_ubicacion_destino and cod_ubicacion_destino != cod_ubicacion_origen:
                valid_dest = ReubicacionesService.validar_ubicacion(str(cod_ubicacion_destino))
                if valid_dest.get("status") != "success":
                    return {
                        "status": "error",
                        "message": f"Ubicación de destino inválida: {valid_dest.get('message', 'No encontrada')}"
                    }

            # Parsear fecha de caducidad si se proporciona
            fecha_cad = None
            if fecha_caducidad_str:
                clean_date = fecha_caducidad_str.strip()
                formatos = ['%Y-%m-%d', '%d/%m/%Y', '%d-%m-%Y']
                for fmt in formatos:
                    try:
                        fecha_cad = datetime.strptime(clean_date, fmt)
                        break
                    except ValueError:
                        continue
                if not fecha_cad:
                    return {"status": "error", "message": f"Formato de fecha de caducidad inválido: {fecha_caducidad_str}."}

            KitsRepository.crear_lote(
                cod_terminal=cod_terminal,
                cod_ubicacion_origen=cod_ubicacion_origen,
                cod_articulo=cod_articulo,
                stock=cantidad,
                fecha_caducidad=fecha_cad,
                peso=peso,
                cod_ubicacion_destino=cod_ubicacion_destino,
                cod_palet=cod_palet,
                cod_facturacion=cod_facturacion,
                numero_lote=numero_lote
            )

            return {
                "status": "success",
                "message": f"Se han montado correctamente {cantidad} unidades del kit."
            }
        except Exception as e:
            logger.error(f"Error al ejecutar montaje de kit {cod_articulo}: {e}", exc_info=True)
            msg = str(e)
            if "ZONA_INVALIDA" in msg:
                msg = "No se puede ubicar el kit en la zona de la ubicación seleccionada."
            return {"status": "error", "message": f"Error al montar el kit: {msg}"}

    @staticmethod
    def listar_kits_desmontables(cod_ubicacion: int) -> Dict[str, Any]:
        """
        Obtiene la lista de kits que tienen stock disponible en una ubicación y evalúa
        con GSM_LOTES.GET_PERMITIRDESMONTARLOTE si su desensamblado está permitido por zonificación.
        """
        try:
            kits = KitsRepository.get_kits_con_stock_en_ubicacion(cod_ubicacion)
            for kit in kits:
                permitido = KitsRepository.permitir_desmontar_lote(cod_ubicacion, kit["CODARTICULO"])
                kit["PERMITIDO_DESMONTAR"] = (permitido == 1)

            return {"status": "success", "kits": kits}
        except Exception as e:
            logger.error(f"Error al listar kits desmontables en ubicación {cod_ubicacion}: {e}", exc_info=True)
            return {"status": "error", "message": f"Error al listar kits: {str(e)}"}

    @staticmethod
    def validar_desmontaje(cod_ubicacion: int, cod_articulo: int, numero_orden: int, unidades: float) -> Dict[str, Any]:
        """
        Valida que se cumplan las restricciones de zonificación (GET_PERMITIRDESMONTARLOTE)
        y stock antes de proceder al desmontaje.
        """
        try:
            if unidades <= 0:
                return {"status": "error", "message": "La cantidad a desmontar debe ser mayor que cero."}

            permitido = KitsRepository.permitir_desmontar_lote(cod_ubicacion, cod_articulo)
            if permitido != 1:
                return {
                    "status": "error",
                    "message": "No se permite desmontar este kit en esta ubicación porque sus componentes no pertenecen a la zona del hueco."
                }

            return {"status": "success", "message": "Validación de desmontaje correcta."}
        except Exception as e:
            logger.error(f"Error al validar desmontaje de kit {cod_articulo}: {e}", exc_info=True)
            return {"status": "error", "message": f"Error al validar el desmontaje: {str(e)}"}

    @staticmethod
    def ejecutar_desmontaje(
        cod_terminal: int,
        cod_ubicacion: int,
        cod_articulo: int,
        numero_orden: int,
        unidades: float,
        tipo_actualizacion: int = 0
    ) -> Dict[str, Any]:
        """
        Ejecuta el desensamblado del kit llamando a GSM_LOTES.SPPRP_DESMONTARLOTES.
        """
        try:
            if unidades <= 0:
                return {"status": "error", "message": "La cantidad de kits a desmontar debe ser superior a 0."}

            # Validar compatibilidad de zonas
            permitido = KitsRepository.permitir_desmontar_lote(cod_ubicacion, cod_articulo)
            if permitido != 1:
                return {
                    "status": "error",
                    "message": "Operación cancelada: los artículos componentes no pueden ubicarse en la zona de esta ubicación."
                }

            KitsRepository.desmontar_lotes(
                cod_articulo=cod_articulo,
                cod_ubicacion=cod_ubicacion,
                numero_orden=numero_orden,
                unidades=unidades,
                cod_terminal=cod_terminal,
                tipo_actualizacion=tipo_actualizacion
            )

            return {
                "status": "success",
                "message": f"Se han desmontado satisfactoriamente {unidades} unidades del kit."
            }
        except Exception as e:
            logger.error(f"Error al ejecutar desmontaje de kit {cod_articulo}: {e}", exc_info=True)
            msg = str(e)
            if "ZONA_INVALIDA" in msg:
                msg = "No se pueden ubicar los artículos hijos en la zona de la ubicación."
            return {"status": "error", "message": f"Error al desmontar el kit: {msg}"}
