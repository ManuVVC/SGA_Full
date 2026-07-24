import logging
from app.repositories.preparacion_repo import PreparacionRepository

logger = logging.getLogger(__name__)


class PreparacionService:

    @staticmethod
    def obtener_documento(operador_context: dict) -> dict:
        """Obtiene el documento asignado al terminal del operario."""
        cod_terminal = operador_context.get('terminal', 0)
        if not cod_terminal:
            raise Exception("No se pudo determinar el terminal del operario")
        cod_documento = PreparacionRepository.obtener_documento_para_preparar(int(cod_terminal))
        return {"cod_documento": cod_documento, "hay_documento": cod_documento > 0}

    @staticmethod
    def get_cabecera(cod_documento: int) -> dict:
        """Devuelve la cabecera completa del pedido."""
        return PreparacionRepository.get_cabecera_documento(cod_documento)

    @staticmethod
    def get_permisos(cod_operador: int) -> dict:
        """Devuelve los PRM_SOLICITAR* y PRM_PUEDESERVIRMAS del operario."""
        return PreparacionRepository.get_permisos_preparacion(cod_operador)

    @staticmethod
    def validar_ubicacion(cod_hueco: str, cod_ubicacion_esperada: int = None, posicion: int = None) -> dict:
        """Valida que una ubicación escaneada exista delegando a ReubicacionesService."""
        from .reubicaciones_service import ReubicacionesService
        
        # 1. Validar usando la lógica centralizada
        res = ReubicacionesService.validar_ubicacion(cod_hueco, posicion)
        
        if res.get("status") == "necesita_posicion":
            return res
            
        if res.get("status") == "success":
            ubic = res.get("ubicacion", {})
            cod_ubicacion_escaneada = ubic.get("CODUBICACION")
            
            # 2. Validar que la posición elegida es la que el sistema espera
            if cod_ubicacion_esperada:
                if cod_ubicacion_escaneada != cod_ubicacion_esperada:
                    return {
                        "status": "error", 
                        "valida": False,
                        "message": f"Ubicación incorrecta. (Esperada: {cod_ubicacion_esperada}, Escaneada: {cod_ubicacion_escaneada})"
                    }
                    
            return {
                "status": "success",
                "valida": True,
                "codubicacion": cod_ubicacion_escaneada,
                "codhueco": ubic.get("CODHUECO"),
                "descripcion": ubic.get("NOMBRECORTO", "")
            }
            
        return res

    @staticmethod
    def get_stock_lotes(cod_ubicacion: int, cod_articulo: int) -> dict:
        """Devuelve lista de lotes/caducidades disponibles en la ubicación para el artículo."""
        lotes = PreparacionRepository.get_stock_lotes(cod_ubicacion, cod_articulo)
        return {"lotes": lotes}

    @staticmethod
    def get_lineas_pendientes(cod_documento: int) -> dict:
        """Devuelve la lista de líneas pendientes para mostrar en el selector."""
        lineas = PreparacionRepository.get_lineas_pendientes(cod_documento)
        return {"lineas": lineas}

    @staticmethod
    def _enriquecer_linea(linea: dict) -> dict:
        """Añade info de trazabilidad/caducidad a la linea devuelta por ARTICULOSPARAPREPARAR."""
        if not linea:
            return linea
        cod_articulo = linea.get('codarticulo')
        if cod_articulo:
            info = PreparacionRepository.get_info_articulo(int(cod_articulo))
            linea.update(info)
        return linea

    @staticmethod
    def get_primera_linea(cod_documento: int) -> dict:
        """
        Obtiene la primera línea a preparar llamando a SPPRP_ARTICULOSPARAPREPARAR
        con parámetros vacíos (el procedimiento ya llama internamente a INSTMP).
        """
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

    @staticmethod
    def siguiente_linea(cod_documento: int, cod_ubicacion: int, numero_orden: int,
                        tipo_avance: int, cod_ubicacion_actual: int, cod_articulo: int,
                        cant_solicitada: float = None) -> dict:
        """
        Devuelve la siguiente o anterior línea a preparar.
        tipo_avance: 0 = siguiente, 1 = anterior
        SPPRP_ARTICULOSPARAPREPARAR ya llama internamente a SPPRP_INSTMP_ARTPARAPREPARAR.
        """
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

    @staticmethod
    def cargar_mercancia(operador_context: dict, cod_documento: int, cod_ubicacion: int,
                         cod_articulo: int, num_linea: int, unidades: float,
                         fecha_caducidad=None, numero_lote: str = None,
                         cod_tipo_dato_maestro: int = None, cod_dato_maestro: int = None) -> dict:
        """Registra las unidades preparadas de una línea."""
        cod_terminal = operador_context.get('terminal', 0)
        PreparacionRepository.cargar_mercancia(
            cod_ubicacion_origen=cod_ubicacion,
            cod_articulo=cod_articulo,
            fecha_caducidad=fecha_caducidad,
            cod_terminal=int(cod_terminal),
            unidades=unidades,
            cod_documento=cod_documento,
            num_linea=num_linea,
            numero_lote=numero_lote,
            cod_tipo_dato_maestro=cod_tipo_dato_maestro,
            cod_dato_maestro=cod_dato_maestro,
        )
        return {"success": True}
