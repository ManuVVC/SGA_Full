import logging
from typing import Dict, Any, Optional, List

from app.repositories.preparacion_repo import PreparacionRepository
from .reubicaciones_service import ReubicacionesService

logger = logging.getLogger(__name__)


class PreparacionService:
    """
    Servicio encargado de la lógica de negocio para la preparación de pedidos.
    """

    @staticmethod
    def _obtener_terminal(operador_context: Dict[str, Any]) -> int:
        """Extrae el terminal del contexto del operador."""
        cod_terminal = operador_context.get('terminal', 0)
        if not cod_terminal:
            logger.error("Contexto de operador sin terminal válido: %s", operador_context)
            raise ValueError("No se pudo determinar el terminal del operario.")
        return int(cod_terminal)

    @staticmethod
    def _obtener_operador(operador_context: Dict[str, Any]) -> int:
        """Extrae el código de operador del contexto."""
        cod_operador = operador_context.get('cod_operador') or operador_context.get('operador', 0)
        if not cod_operador:
            logger.error("Contexto de operador sin código de operador válido: %s", operador_context)
            raise ValueError("No se pudo determinar el código de operario.")
        return int(cod_operador)

    @staticmethod
    def obtener_documento(operador_context: Dict[str, Any]) -> Dict[str, Any]:
        """Obtiene el documento asignado al terminal del operario."""
        try:
            cod_terminal = PreparacionService._obtener_terminal(operador_context)
            cod_documento = PreparacionRepository.obtener_documento_para_preparar(cod_terminal)
            
            logger.info("Documento %s obtenido para terminal %s", cod_documento, cod_terminal)
            return {"cod_documento": cod_documento, "hay_documento": cod_documento > 0}
        except Exception as e:
            logger.exception("Error al obtener documento para el contexto %s", operador_context)
            raise

    @staticmethod
    def get_cabecera(cod_documento: int) -> Dict[str, Any]:
        """Devuelve la cabecera completa del pedido."""
        try:
            return PreparacionRepository.get_cabecera_documento(cod_documento)
        except Exception as e:
            logger.exception("Error al obtener cabecera para el documento %s", cod_documento)
            raise

    @staticmethod
    def get_permisos(cod_operador: int) -> Dict[str, Any]:
        """Devuelve los permisos de preparación del operario."""
        try:
            return PreparacionRepository.get_permisos_preparacion(cod_operador)
        except Exception as e:
            logger.exception("Error al obtener permisos para el operador %s", cod_operador)
            raise

    @staticmethod
    def validar_ubicacion(cod_hueco: str, cod_ubicacion_esperada: Optional[int] = None, posicion: Optional[int] = None) -> Dict[str, Any]:
        """Valida que una ubicación escaneada exista delegando a ReubicacionesService."""
        try:
            # 1. Validar usando la lógica centralizada
            res = ReubicacionesService.validar_ubicacion(cod_hueco, posicion)
            
            if res.get("status") != "success":
                return res
                
            ubic = res.get("ubicacion", {})
            cod_ubicacion_escaneada = ubic.get("CODUBICACION")
            
            # 2. Validar que la posición elegida es la que el sistema espera
            if cod_ubicacion_esperada and cod_ubicacion_escaneada != cod_ubicacion_esperada:
                error_msg = f"Ubicación incorrecta. (Esperada: {cod_ubicacion_esperada}, Escaneada: {cod_ubicacion_escaneada})"
                logger.warning("Fallo validación ubicación: %s", error_msg)
                return {
                    "status": "error", 
                    "valida": False,
                    "message": error_msg
                }
                        
            return {
                "status": "success",
                "valida": True,
                "codubicacion": cod_ubicacion_escaneada,
                "codhueco": ubic.get("CODHUECO"),
                "descripcion": ubic.get("NOMBRECORTO", "")
            }
        except Exception as e:
            logger.exception("Error al validar ubicación cod_hueco: %s", cod_hueco)
            raise

    @staticmethod
    def get_stock_lotes(cod_ubicacion: int, cod_articulo: int) -> Dict[str, Any]:
        """Devuelve lista de lotes/caducidades disponibles en la ubicación para el artículo."""
        try:
            lotes = PreparacionRepository.get_stock_lotes(cod_ubicacion, cod_articulo)
            return {"lotes": lotes}
        except Exception as e:
            logger.exception("Error al obtener stock de lotes para ubicacion %s y articulo %s", cod_ubicacion, cod_articulo)
            raise

    @staticmethod
    def get_lineas_pendientes(cod_documento: int, operador_context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Devuelve la lista de líneas pendientes para mostrar en el selector."""
        try:
            cod_terminal = PreparacionService._obtener_terminal(operador_context) if operador_context else None
            lineas = PreparacionRepository.get_lineas_pendientes(cod_documento, cod_terminal)
            return {"lineas": lineas}
        except Exception as e:
            logger.exception("Error al obtener lineas pendientes para documento %s", cod_documento)
            raise

    @staticmethod
    def get_num_lineas_pendientes(cod_documento: int) -> Dict[str, Any]:
        """Devuelve el conteo de líneas pendientes del documento."""
        try:
            num = PreparacionRepository.get_num_lineas_pendientes(cod_documento)
            return {"num_lineas": num}
        except Exception as e:
            logger.exception("Error al obtener numero de lineas pendientes para documento %s", cod_documento)
            raise

    @staticmethod
    def get_unids_preparadas(cod_documento: int, num_linea: int, cod_ubicacion: int,
                             cod_articulo: int, fecha_caducidad: Any, numero_lote: str,
                             cod_terminal: int) -> Dict[str, Any]:
        """Consulta cuántas unidades ya hay preparadas en el terminal para esta línea/artículo."""
        try:
            return PreparacionRepository.get_unids_preparadas(
                cod_documento=cod_documento,
                num_linea=num_linea,
                cod_ubicacion=cod_ubicacion,
                cod_articulo=cod_articulo,
                fecha_caducidad=fecha_caducidad,
                numero_lote=numero_lote,
                cod_terminal=cod_terminal,
            )
        except Exception as e:
            logger.exception("Error al consultar unidades preparadas para el documento %s linea %s", cod_documento, num_linea)
            raise

    @staticmethod
    def _enriquecer_linea(linea: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
        """Añade info de trazabilidad/caducidad a la linea devuelta por ARTICULOSPARAPREPARAR."""
        if not linea:
            return linea
            
        try:
            cod_articulo = linea.get('codarticulo')
            if cod_articulo:
                info = PreparacionRepository.get_info_articulo(int(cod_articulo))
                linea.update(info)
            return linea
        except Exception as e:
            logger.exception("Error al enriquecer linea con articulo %s", cod_articulo)
            # Retornar linea sin enriquecer si falla la obtención extra para no bloquear la operación
            return linea

    @staticmethod
    def get_primera_linea(cod_documento: int) -> Dict[str, Any]:
        """
        Obtiene la primera línea a preparar llamando a SPPRP_ARTICULOSPARAPREPARAR
        con parámetros vacíos.
        """
        try:
            linea = PreparacionRepository.get_articulo_para_preparar(
                cod_documento=cod_documento,
                cod_ubicacion=0,
                numero_orden=0,
                tipo_avance=0,
                cod_ubicacion_actual=0,
                cod_articulo=0,
                cant_solicitada=None,
            )
            return {"linea": PreparacionService._enriquecer_linea(linea)}
        except Exception as e:
            logger.exception("Error al obtener la primera linea del documento %s", cod_documento)
            raise

    @staticmethod
    def siguiente_linea(cod_documento: int, cod_ubicacion: int, numero_orden: int,
                        tipo_avance: int, cod_ubicacion_actual: int, cod_articulo: int,
                        cant_solicitada: Optional[float] = None) -> Dict[str, Any]:
        """
        Devuelve la siguiente o anterior línea a preparar.
        tipo_avance: 0 = siguiente, 1 = anterior
        """
        try:
            linea = PreparacionRepository.get_articulo_para_preparar(
                cod_documento=cod_documento,
                cod_ubicacion=cod_ubicacion,
                numero_orden=numero_orden,
                tipo_avance=tipo_avance,
                cod_ubicacion_actual=cod_ubicacion_actual,
                cod_articulo=cod_articulo,
                cant_solicitada=cant_solicitada,
            )
            return {"linea": PreparacionService._enriquecer_linea(linea)}
        except Exception as e:
            logger.exception("Error al obtener siguiente linea del documento %s", cod_documento)
            raise

    @staticmethod
    def cargar_mercancia(operador_context: Dict[str, Any], cod_documento: int, cod_ubicacion: int,
                         cod_articulo: int, num_linea: int, unidades: float,
                         fecha_caducidad: Any = None, numero_lote: Optional[str] = None,
                         cod_tipo_dato_maestro: Optional[int] = None, cod_dato_maestro: Optional[int] = None,
                         tipo_codigo_introducido: Optional[int] = None, cod_facturacion: Optional[str] = None,
                         cod_operacion_terminal: int = 1) -> Dict[str, Any]:
        """Registra las unidades preparadas de una línea."""
        try:
            cod_terminal = PreparacionService._obtener_terminal(operador_context)
            PreparacionRepository.cargar_mercancia(
                cod_ubicacion_origen=cod_ubicacion,
                cod_articulo=cod_articulo,
                fecha_caducidad=fecha_caducidad,
                cod_terminal=cod_terminal,
                unidades=unidades,
                cod_documento=cod_documento,
                num_linea=num_linea,
                numero_lote=numero_lote,
                cod_tipo_dato_maestro=cod_tipo_dato_maestro,
                cod_dato_maestro=cod_dato_maestro,
                tipo_codigo_introducido=tipo_codigo_introducido,
                cod_facturacion=cod_facturacion,
                cod_operacion_terminal=cod_operacion_terminal
            )
            logger.info("Mercancia cargada correctamente. Doc: %s, Linea: %s, Unidades: %s", cod_documento, num_linea, unidades)
            return {"success": True}
        except Exception as e:
            logger.exception("Error al cargar mercancia para doc %s linea %s", cod_documento, num_linea)
            raise

    @staticmethod
    def get_pedido_directo_en_curso(operador_context: Dict[str, Any]) -> Dict[str, Any]:
        """Obtiene un pedido directo en curso para el operador y terminal dados."""
        try:
            cod_operador = PreparacionService._obtener_operador(operador_context)
            cod_terminal = PreparacionService._obtener_terminal(operador_context)
            return PreparacionRepository.get_pedido_directo_en_curso(cod_operador, cod_terminal)
        except Exception as e:
            logger.exception("Error al obtener pedido directo en curso para contexto %s", operador_context)
            raise

    @staticmethod
    def crear_cabecera_pedido_directo(payload: Dict[str, Any], operador_context: Dict[str, Any]) -> Dict[str, Any]:
        """Crea la cabecera para un pedido directo asegurando la asignación del operador y terminal."""
        try:
            payload.setdefault('CODOPERADOR', PreparacionService._obtener_operador(operador_context))
            payload.setdefault('CODTERMINAL', PreparacionService._obtener_terminal(operador_context))
            
            return PreparacionRepository.crear_cabecera_pedido_directo(payload)
        except Exception as e:
            logger.exception("Error al crear cabecera pedido directo con payload %s", payload)
            raise

    @staticmethod
    def grabar_linea_pedido_directo(payload: Dict[str, Any], operador_context: Dict[str, Any]) -> Dict[str, Any]:
        """Graba una línea para un pedido directo."""
        try:
            payload.setdefault('CODOPERADOR', PreparacionService._obtener_operador(operador_context))
            payload.setdefault('CODTERMINAL', PreparacionService._obtener_terminal(operador_context))
            
            return PreparacionRepository.grabar_linea_pedido_directo(payload)
        except Exception as e:
            logger.exception("Error al grabar linea pedido directo con payload %s", payload)
            raise

    @staticmethod
    def get_lineas_pedido_directo(cod_documento: int) -> List[Any]:
        """Obtiene todas las líneas asociadas a un pedido directo."""
        try:
            return PreparacionRepository.get_lineas_pedido_directo(int(cod_documento))
        except Exception as e:
            logger.exception("Error al obtener lineas pedido directo para documento %s", cod_documento)
            raise

    @staticmethod
    def get_recorrido_linea(cod_documento: int, num_linea: int) -> List[Any]:
        """Devuelve el detalle del recorrido de preparación de una línea."""
        try:
            return PreparacionRepository.get_recorrido_linea(int(cod_documento), int(num_linea))
        except Exception as e:
            logger.exception("Error al obtener recorrido de la linea %s del doc %s", num_linea, cod_documento)
            raise

    @staticmethod
    def descargar_mercancia(cod_documento: int, num_linea: int,
                            cod_articulo: int, operador_context: Dict[str, Any],
                            registros_seleccionados: Optional[List[Any]] = None) -> None:
        """Revierte la preparación de una línea usando SPPRP_DESCARGARMERCANCIATERM."""
        try:
            cod_terminal = PreparacionService._obtener_terminal(operador_context)
            
            PreparacionRepository.descargar_mercancia(
                cod_terminal=cod_terminal,
                cod_articulo=int(cod_articulo),
                cod_documento=int(cod_documento),
                num_linea=int(num_linea),
                registros_seleccionados=registros_seleccionados,
            )
            logger.info("Mercancia descargada para doc %s linea %s terminal %s", cod_documento, num_linea, cod_terminal)
        except Exception as e:
            logger.exception("Error al descargar mercancia para doc %s linea %s", cod_documento, num_linea)
            raise
