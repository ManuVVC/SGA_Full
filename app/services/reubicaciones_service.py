import logging
from ..repositories.reubicaciones_repo import ReubicacionesRepository

logger = logging.getLogger(__name__)

class ReubicacionesService:
    
    @staticmethod
    def validar_ubicacion(input_value: str, posicion: int = None):
        """
        Valida una ubicación. Si es numérico busca por CodUbicacion en VMST_UBICACIONES.
        Si es alfanumérico busca por CodEtiqueta en VMST_HUECOS.
        Si devuelve más de 1 resultado y no hay posicion, devuelve que necesita_posicion.
        """
        # Si el input es estrictamente numérico, intentamos buscar primero por CodUbicacion
        if input_value.isdigit():
            ubic = ReubicacionesRepository.get_ubicacion_by_codigo(input_value)
            if ubic:
                return {"status": "success", "ubicacion": ubic}
            # Si no la encuentra como código numérico, podría ser un código de barras
            # que contenga solo números (etiqueta). Continuamos la ejecución.
        
        # Si no es numérico, o era numérico pero no existía como CodUbicacion, buscar por etiqueta en huecos
        ubicaciones = ReubicacionesRepository.get_ubicaciones_by_etiqueta(input_value)
        
        if not ubicaciones:
            return {"status": "error", "message": f"No se encontraron ubicaciones para la etiqueta '{input_value}'."}
            
        if len(ubicaciones) == 1:
            return {"status": "success", "ubicacion": ubicaciones[0]}
            
        # Hay múltiples ubicaciones
        if posicion is not None:
            # Filtrar por la posición dada
            ubic_filtrada = [u for u in ubicaciones if u["POSICION"] == posicion]
            if ubic_filtrada:
                return {"status": "success", "ubicacion": ubic_filtrada[0]}
            else:
                return {"status": "error", "message": f"La posición {posicion} no existe para la etiqueta '{input_value}'."}
                
        # Si hay múltiples y no nos pasaron la posición, avisar al cliente
        return {
            "status": "necesita_posicion", 
            "message": "Múltiples ubicaciones encontradas. Indique la posición.",
            "opciones": ubicaciones
        }

    @staticmethod
    def validar_articulo(input_value: str, tipo_busqueda: str = "auto"):
        """
        Resuelve el artículo basado en EAN, código interno o descripción.
        tipo_busqueda: 'auto', 'ean', 'codigo', 'descripcion'
        """
        if tipo_busqueda in ("auto", "ean"):
            articulo = ReubicacionesRepository.get_articulo_por_ean(input_value)
            if articulo:
                return {"status": "success", "articulo": articulo, "tipo": "ean"}
                
        if tipo_busqueda in ("auto", "codigo"):
            articulo = ReubicacionesRepository.get_articulo_por_codigo_interno(input_value)
            if articulo:
                return {"status": "success", "articulo": articulo, "tipo": "codigo"}
                
        if tipo_busqueda in ("auto", "descripcion"):
            articulos = ReubicacionesRepository.get_articulo_por_descripcion(input_value)
            if articulos:
                if len(articulos) == 1:
                    return {"status": "success", "articulo": articulos[0], "tipo": "descripcion"}
                else:
                    return {
                        "status": "multiples_resultados", 
                        "message": "Se encontraron múltiples artículos.",
                        "articulos": articulos
                    }
                    
        return {"status": "error", "message": "Artículo no encontrado."}

    @staticmethod
    def validar_cantidad(cod_ubicacion: int, cod_articulo: int, cantidad_introducida: float, unidades_conversion: float = 1):
        """
        Valida que la cantidad calculada (introducida * unidades_conversion) no supere el stock disponible.
        """
        cantidad_real = cantidad_introducida * unidades_conversion
        stock_disponible = ReubicacionesRepository.get_stock_ubicacion_articulo(cod_ubicacion, cod_articulo)
        
        if cantidad_real <= 0:
            return {"status": "error", "message": "La cantidad debe ser mayor que cero."}
            
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
    def obtener_lotes_disponibles(cod_ubicacion: int, cod_articulo: int):
        """
        Retorna los lotes físicos disponibles en la ubicación para este artículo.
        """
        try:
            lotes = ReubicacionesRepository.get_lotes_disponibles(cod_ubicacion, cod_articulo)
            return {"status": "success", "lotes": lotes}
        except Exception as e:
            return {"status": "error", "message": str(e)}

    @staticmethod
    def grabar_reubicacion(origen: dict, destino: dict, articulo: dict, cantidad: float, terminal: int, operador: int, lote: dict = None):
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
            
        # Obtenemos el master data del stock origen
        stock_md = ReubicacionesRepository.get_stock_master_data(cod_ubicacion_origen, cod_articulo, cod_numero_lote)
        tipo_dato_maestro_ori = stock_md.get("CODTIPODATOMAESTRO") if stock_md else None
        dato_maestro_ori = stock_md.get("CODDATOMAESTRO") if stock_md else None

        tipo_dato_maestro_loc_dest = destino.get("CODTIPODATOMAESTRO")
        dato_maestro_loc_dest = destino.get("CODDATOMAESTRO")

        # Control: Evitar mover mercancía de un propietario a la ubicación de otro
        if tipo_dato_maestro_ori and dato_maestro_ori and tipo_dato_maestro_loc_dest and dato_maestro_loc_dest:
            if tipo_dato_maestro_ori != tipo_dato_maestro_loc_dest or dato_maestro_ori != dato_maestro_loc_dest:
                return {
                    "status": "error", 
                    "message": "No puede reubicar mercancía de este propietario en una ubicación reservada para otro propietario."
                }

        # Si el origen no los tiene, usamos los de la ubicación destino (si existen)
        tipo_dato_maestro_dest = tipo_dato_maestro_ori if tipo_dato_maestro_ori else tipo_dato_maestro_loc_dest
        dato_maestro_dest = dato_maestro_ori if dato_maestro_ori else dato_maestro_loc_dest

        # Ejecutar procedimiento
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
                tipo_dato_maestro_ori=tipo_dato_maestro_ori,
                dato_maestro_ori=dato_maestro_ori,
                tipo_dato_maestro_dest=tipo_dato_maestro_dest,
                dato_maestro_dest=dato_maestro_dest
            )
            
            if ret_val == 0:
                return {"status": "success", "message": "Movimiento grabado correctamente."}
            else:
                return {"status": "error", "message": f"Error al grabar reubicación (código {ret_val})."}
                
        except Exception as e:
            return {"status": "error", "message": f"Excepción en BD al grabar: {str(e)}"}
