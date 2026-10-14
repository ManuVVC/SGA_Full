import logging
from typing import Dict, Any, Optional, Union

from ..repositories.reubicaciones_repo import ReubicacionesRepository
from ..utils.parametros import is_parametro_activo

logger = logging.getLogger(__name__)

class ReubicacionesService:
    
    @staticmethod
    def validar_ubicacion(input_value: str, posicion: Optional[int] = None) -> Dict[str, Any]:
        """
        Valida una ubicación. Si es numérico busca por CodUbicacion en VMST_UBICACIONES.
        Si es alfanumérico busca por CodEtiqueta en VMST_HUECOS.
        Si devuelve más de 1 resultado y no hay posicion, devuelve que necesita_posicion.
        """
        if input_value.isdigit():
            ubic = ReubicacionesRepository.get_ubicacion_by_codigo(input_value)
            if ubic:
                return {"status": "success", "ubicacion": ubic}
        
        ubic = ReubicacionesRepository.get_ubicacion_by_nombre_corto(input_value)
        if ubic:
            return {"status": "success", "ubicacion": ubic}
        
        ubicaciones = ReubicacionesRepository.get_ubicaciones_by_etiqueta(input_value)
        if not ubicaciones:
            return {"status": "error", "message": f"No se encontraron ubicaciones para la etiqueta '{input_value}'."}
            
        if len(ubicaciones) == 1:
            return {"status": "success", "ubicacion": ubicaciones[0]}
            
        if posicion is not None:
            ubic_filtrada = next((u for u in ubicaciones if u.get("POSICION") == posicion), None)
            if ubic_filtrada:
                return {"status": "success", "ubicacion": ubic_filtrada}
            return {"status": "error", "message": f"La posición {posicion} no existe para la etiqueta '{input_value}'."}
                
        return {
            "status": "necesita_posicion", 
            "message": "Múltiples ubicaciones encontradas. Indique la posición.",
            "opciones": ubicaciones
        }

    @staticmethod
    def validar_articulo(input_value: str, tipo_busqueda: str = "auto") -> Dict[str, Any]:
        """
        Resuelve el artículo basado en EAN, código interno, fabricante o descripción.
        tipo_busqueda: 'auto', 'ean', 'codigo', 'fabricante', 'codrealfabricante', 'descripcion'
        """
        param_1690_activo = is_parametro_activo(1690)

        # Configuraciones de búsqueda (tipos soportados, función repo, nombre en respuesta, es_lista, está_activo)
        busquedas = [
            (("auto", "ean"), ReubicacionesRepository.get_articulo_por_ean, "ean", False, True),
            (("auto", "codigo"), ReubicacionesRepository.get_articulo_por_codigo_interno, "codigo", False, True),
            (("auto", "fabricante", "codrealfabricante"), ReubicacionesRepository.get_articulo_por_cod_fabricante, "fabricante", True, param_1690_activo),
            (("auto", "descripcion"), ReubicacionesRepository.get_articulo_por_descripcion, "descripcion", True, True)
        ]

        for tipos, funcion_busqueda, tipo_resultado, es_lista, activo in busquedas:
            if activo and tipo_busqueda in tipos:
                resultado = funcion_busqueda(input_value)
                if resultado:
                    if es_lista:
                        if len(resultado) == 1:
                            return {"status": "success", "articulo": resultado[0], "tipo": tipo_resultado}
                        return {
                            "status": "multiples_resultados", 
                            "message": "Se encontraron múltiples artículos.",
                            "articulos": resultado
                        }
                    else:
                        return {"status": "success", "articulo": resultado, "tipo": tipo_resultado}
                        
        return {"status": "error", "message": "Artículo no encontrado."}

    @staticmethod
    def validar_cantidad(cod_ubicacion: int, cod_articulo: int, cantidad_introducida: float, unidades_conversion: float = 1) -> Dict[str, Any]:
        """
        Valida que la cantidad calculada (introducida * unidades_conversion) no supere el stock disponible.
        """
        cantidad_real = cantidad_introducida * unidades_conversion
        if cantidad_real <= 0:
            return {"status": "error", "message": "La cantidad debe ser mayor que cero."}
            
        stock_disponible = ReubicacionesRepository.get_stock_ubicacion_articulo(cod_ubicacion, cod_articulo)
        
        if cantidad_real > stock_disponible:
            return {
                "status": "error", 
                "message": f"Stock insuficiente en la ubicación origen. Disponible: {stock_disponible}, Solicitado: {cantidad_real}"
            }
            
        return {
            "status": "success", 
            "cantidad_real": cantidad_real,
            "stock_disponible": stock_disponible
        }

    @staticmethod
    def obtener_lotes_disponibles(cod_ubicacion: int, cod_articulo: int) -> Dict[str, Any]:
        """
        Retorna los lotes físicos disponibles en la ubicación para este artículo.
        """
        try:
            lotes = ReubicacionesRepository.get_lotes_disponibles(cod_ubicacion, cod_articulo)
            return {"status": "success", "lotes": lotes}
        except Exception as e:
            logger.error(f"Error al obtener lotes disponibles: {e}", exc_info=True)
            return {"status": "error", "message": str(e)}

    @classmethod
    def _validar_y_resolver_propietario(cls, tipo_ori: Any, dato_ori: Any, tipo_dest: Any, dato_dest: Any, msg_error: str) -> Union[Dict[str, str], tuple]:
        """
        Valida que no se mezcle mercancía de distintos propietarios y resuelve el propietario final.
        Devuelve el error en forma de diccionario, o la tupla (tipo_final, dato_final).
        """
        if tipo_ori and dato_ori and tipo_dest and dato_dest:
            if tipo_ori != tipo_dest or dato_ori != dato_dest:
                return {"status": "error", "message": msg_error}
                
        tipo_final = tipo_ori if tipo_ori else tipo_dest
        dato_final = dato_ori if dato_ori else dato_dest
        
        return tipo_final, dato_final

    @classmethod
    def grabar_reubicacion(cls, origen: Dict[str, Any], destino: Dict[str, Any], articulo: Dict[str, Any], cantidad: float, terminal: int, operador: int, lote: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Orquesta la grabación de la reubicación validando los parámetros finales y llamando a BD.
        """
        cod_ubicacion_origen = origen.get("CODUBICACION")
        cod_ubicacion_destino = destino.get("CODUBICACION")
        cod_articulo = articulo.get("CODARTICULO")
        
        if not all([cod_ubicacion_origen, cod_ubicacion_destino, cod_articulo, terminal, operador]):
            return {"status": "error", "message": "Faltan datos obligatorios para grabar la reubicación."}
            
        cod_numero_lote = lote.get("CODNUMEROLOTE") if lote else None
        fecha_caducidad = lote.get("FECHACADUCIDAD") if lote else None
            
        stock_md = ReubicacionesRepository.get_stock_master_data(cod_ubicacion_origen, cod_articulo, cod_numero_lote) or {}
        tipo_ori = stock_md.get("CODTIPODATOMAESTRO")
        dato_ori = stock_md.get("CODDATOMAESTRO")

        tipo_dest = destino.get("CODTIPODATOMAESTRO")
        dato_dest = destino.get("CODDATOMAESTRO")

        msg_error_propietario = "No puede reubicar mercancía de este propietario en una ubicación reservada para otro propietario."
        resultado_prop = cls._validar_y_resolver_propietario(tipo_ori, dato_ori, tipo_dest, dato_dest, msg_error_propietario)
        
        if isinstance(resultado_prop, dict):
            return resultado_prop
            
        tipo_final, dato_final = resultado_prop

        try:
            ret_val = ReubicacionesRepository.grabar_reubicacion(
                cod_terminal=terminal,
                cod_operador=operador,
                cod_ubicacion_origen=cod_ubicacion_origen,
                cod_articulo=cod_articulo,
                cantidad=cantidad,
                cod_ubicacion_destino=cod_ubicacion_destino,
                cod_numero_lote=cod_numero_lote,
                fecha_caducidad=fecha_caducidad,
                tipo_dato_maestro_ori=tipo_ori,
                dato_maestro_ori=dato_ori,
                tipo_dato_maestro_dest=tipo_final,
                dato_maestro_dest=dato_final
            )
            
            if ret_val == 0:
                return {"status": "success", "message": "Movimiento grabado correctamente."}
            return {"status": "error", "message": f"Error al grabar reubicación (código {ret_val})."}
                
        except Exception as e:
            logger.error(f"Excepción en BD al grabar reubicación: {e}", exc_info=True)
            return {"status": "error", "message": f"Excepción en BD al grabar: {str(e)}"}

    @staticmethod
    def _clean_sscc(sscc: str) -> str:
        """Limpia el SSCC de posibles prefijos GS1-128."""
        clean = sscc.strip()
        if clean.startswith("]C1"):
            clean = clean[3:]
        if clean.startswith("(00)") and len(clean) >= 22:
            return clean[4:22]
        if clean.startswith("00") and len(clean) >= 20:
            return clean[2:20]
        return clean

    @classmethod
    def validar_palet(cls, sscc: str) -> Dict[str, Any]:
        """
        Valida que un SSCC exista en TMST_PALETS y devuelve su info.
        """
        clean_sscc = cls._clean_sscc(sscc)
        palet = ReubicacionesRepository.get_palet_by_sscc(clean_sscc)
        
        if palet:
            return {"status": "success", "palet": palet}
            
        if clean_sscc != sscc.strip():
            palet_orig = ReubicacionesRepository.get_palet_by_sscc(sscc.strip())
            if palet_orig:
                return {"status": "success", "palet": palet_orig}

        return {"status": "error", "message": "No se ha encontrado ningún palet con la matrícula indicada."}

    @classmethod
    def grabar_reubicacion_palet(cls, palet: Dict[str, Any], destino: Dict[str, Any], terminal: int, operador: int) -> Dict[str, Any]:
        """
        Orquesta la grabación de reubicación de entrada de mercancía (palet completo).
        """
        cod_palet = palet.get("CODPALET")
        cod_ubicacion_destino = destino.get("CODUBICACION")
        
        if not all([cod_palet, cod_ubicacion_destino, terminal, operador]):
            return {"status": "error", "message": "Faltan datos obligatorios para grabar la reubicación del palet."}
            
        tipo_ori = palet.get("CODTIPODATOMAESTRO")
        dato_ori = palet.get("CODDATOMAESTRO")
        tipo_dest = destino.get("CODTIPODATOMAESTRO")
        dato_dest = destino.get("CODDATOMAESTRO")

        msg_error_propietario = "No puede reubicar este palet en una ubicación reservada para otro propietario."
        resultado_prop = cls._validar_y_resolver_propietario(tipo_ori, dato_ori, tipo_dest, dato_dest, msg_error_propietario)
        
        if isinstance(resultado_prop, dict):
            return resultado_prop
            
        tipo_final, dato_final = resultado_prop

        try:
            ret_val = ReubicacionesRepository.grabar_reubicacion_palet(
                cod_terminal=terminal,
                cod_operador=operador,
                cod_palet=cod_palet,
                cod_ubicacion_destino=cod_ubicacion_destino,
                tipo_dato_maestro_dest=tipo_final,
                dato_maestro_dest=dato_final
            )
            
            if ret_val == 0:
                return {"status": "success", "message": "Palet reubicado correctamente."}
            return {"status": "error", "message": f"Error al grabar reubicación del palet (código {ret_val})."}
                
        except Exception as e:
            logger.error(f"Excepción en BD al grabar palet: {e}", exc_info=True)
            return {"status": "error", "message": f"Excepción en BD al grabar palet: {str(e)}"}
