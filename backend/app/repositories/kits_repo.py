import logging
from datetime import datetime, date
from typing import List, Dict, Any, Optional
from ..database import db

logger = logging.getLogger(__name__)


class KitsRepository:
    """
    Repositorio para la gestión de kits (artículos compuestos) interactuando
    con la base de datos Oracle y el paquete GSM_LOTES.
    """

    @staticmethod
    def get_composicion_kit(cod_articulo: int, cod_ubicacion: Optional[int] = None) -> List[Dict[str, Any]]:
        """
        Obtiene los artículos componentes (hijos) de un kit padre a partir de TMST_ARTICULOSCOMPUESTOS.
        Si se especifica cod_ubicacion, obtiene también el stock disponible en dicha ubicación.
        """
        try:
            with db.get_cursor() as cursor:
                if cod_ubicacion:
                    query = """
                        SELECT 
                            C.CODARTICULOHIJO,
                            A.CODARTICULOAPLICACION,
                            A.NOMBREARTICULO,
                            C.UNIDADES,
                            NVL(A.PRM_TRAZABILIDAD, 0) AS PRM_TRAZABILIDAD,
                            NVL(A.GESTIONARCADUCIDAD, 0) AS GESTIONARCADUCIDAD,
                            NVL((
                                SELECT SUM(UA.STOCK)
                                FROM GSM.TMST_UBICACIONESARTICULO UA
                                WHERE UA.CODUBICACION = :cod_ubicacion
                                  AND UA.CODARTICULO = C.CODARTICULOHIJO
                            ), 0) AS STOCK_DISPONIBLE
                        FROM GSM.TMST_ARTICULOSCOMPUESTOS C
                        JOIN GSM.TMST_ARTICULOS A ON C.CODARTICULOHIJO = A.CODARTICULO
                        WHERE C.CODARTICULO = :cod_articulo
                        ORDER BY A.NOMBREARTICULO
                    """
                    cursor.execute(query, {
                        "cod_ubicacion": cod_ubicacion,
                        "cod_articulo": cod_articulo
                    })
                else:
                    query = """
                        SELECT 
                            C.CODARTICULOHIJO,
                            A.CODARTICULOAPLICACION,
                            A.NOMBREARTICULO,
                            C.UNIDADES,
                            NVL(A.PRM_TRAZABILIDAD, 0) AS PRM_TRAZABILIDAD,
                            NVL(A.GESTIONARCADUCIDAD, 0) AS GESTIONARCADUCIDAD,
                            0 AS STOCK_DISPONIBLE
                        FROM GSM.TMST_ARTICULOSCOMPUESTOS C
                        JOIN GSM.TMST_ARTICULOS A ON C.CODARTICULOHIJO = A.CODARTICULO
                        WHERE C.CODARTICULO = :cod_articulo
                        ORDER BY A.NOMBREARTICULO
                    """
                    cursor.execute(query, {"cod_articulo": cod_articulo})

                rows = cursor.fetchall()
                componentes = []
                for row in rows:
                    unidades_req = float(row[3]) if row[3] is not None else 1.0
                    stock_disp = float(row[6]) if row[6] is not None else 0.0
                    kits_posibles = int(stock_disp // unidades_req) if unidades_req > 0 else 0
                    
                    componentes.append({
                        "CODARTICULO": row[0],
                        "CODARTICULOAPLICACION": row[1],
                        "NOMBREARTICULO": row[2],
                        "UNIDADES": unidades_req,
                        "PRM_TRAZABILIDAD": row[4],
                        "GESTIONARCADUCIDAD": row[5],
                        "STOCK_DISPONIBLE": stock_disp,
                        "KITS_POSIBLES": kits_posibles
                    })
                return componentes
        except Exception as e:
            logger.error(f"Error al obtener composición del kit {cod_articulo}: {e}", exc_info=True)
            raise

    @staticmethod
    def es_articulo_kit(cod_articulo: int) -> bool:
        """
        Comprueba si el artículo está definido como artículo compuesto (kit) con componentes.
        """
        try:
            with db.get_cursor() as cursor:
                cursor.execute(
                    "SELECT COUNT(*) FROM GSM.TMST_ARTICULOSCOMPUESTOS WHERE CODARTICULO = :cod_articulo",
                    {"cod_articulo": cod_articulo}
                )
                count = cursor.fetchone()[0]
                return count > 0
        except Exception as e:
            logger.error(f"Error al comprobar si artículo {cod_articulo} es kit: {e}", exc_info=True)
            raise

    @staticmethod
    def get_kits_con_stock_en_ubicacion(cod_ubicacion: int) -> List[Dict[str, Any]]:
        """
        Obtiene los artículos kits que tienen stock disponible en una ubicación dada.
        """
        try:
            with db.get_cursor() as cursor:
                query = """
                    SELECT 
                        UA.CODARTICULO,
                        A.CODARTICULOAPLICACION,
                        A.NOMBREARTICULO,
                        UA.NUMEROORDEN,
                        UA.STOCK,
                        UA.FECHACADUCIDAD,
                        UA.CODNUMEROLOTE,
                        NLP.NUMEROLOTE,
                        NVL(A.PRM_TRAZABILIDAD, 0) AS PRM_TRAZABILIDAD,
                        NVL(A.GESTIONARCADUCIDAD, 0) AS GESTIONARCADUCIDAD,
                        UA.CODTIPODATOMAESTRO,
                        UA.CODDATOMAESTRO
                    FROM GSM.TMST_UBICACIONESARTICULO UA
                    JOIN GSM.TMST_ARTICULOS A ON UA.CODARTICULO = A.CODARTICULO
                    LEFT JOIN GSM.TMST_NUMEROSLOTESPROVEEDORES NLP ON UA.CODNUMEROLOTE = NLP.CODNUMEROLOTE
                    WHERE UA.CODUBICACION = :cod_ubicacion
                      AND UA.STOCK > 0
                      AND UA.CODARTICULO IN (
                          SELECT DISTINCT CODARTICULO FROM GSM.TMST_ARTICULOSCOMPUESTOS
                      )
                    ORDER BY A.NOMBREARTICULO, UA.NUMEROORDEN
                """
                cursor.execute(query, {"cod_ubicacion": cod_ubicacion})
                rows = cursor.fetchall()
                kits = []
                for row in rows:
                    fec_cad = row[5]
                    fec_cad_str = fec_cad.strftime('%Y-%m-%d') if isinstance(fec_cad, (datetime, date)) else None
                    kits.append({
                        "CODARTICULO": row[0],
                        "CODARTICULOAPLICACION": row[1],
                        "NOMBREARTICULO": row[2],
                        "NUMEROORDEN": row[3],
                        "STOCK": float(row[4]),
                        "FECHACADUCIDAD": fec_cad_str,
                        "CODNUMEROLOTE": row[6],
                        "NUMEROLOTE": row[7],
                        "PRM_TRAZABILIDAD": row[8],
                        "GESTIONARCADUCIDAD": row[9],
                        "CODTIPODATOMAESTRO": row[10],
                        "CODDATOMAESTRO": row[11]
                    })
                return kits
        except Exception as e:
            logger.error(f"Error al listar kits con stock en ubicación {cod_ubicacion}: {e}", exc_info=True)
            raise

    @staticmethod
    def check_unidades_prep_lote(cod_ubicacion: int, cod_articulo: int, cantidad: float) -> int:
        """
        Ejecuta la función GSM_LOTES.SPPRP_CHECKUNIDADESPREPLOTE.
        Retorna 0 si hay suficiente stock de todos los componentes; -1 en caso contrario.
        """
        try:
            with db.get_cursor() as cursor:
                query = """
                BEGIN
                    :ret := GSM_LOTES.SPPRP_CHECKUNIDADESPREPLOTE(
                        p_CodUbicacion => :p_CodUbicacion,
                        p_CodArticulo => :p_CodArticulo,
                        p_Cantidad => :p_Cantidad
                    );
                END;
                """
                ret_val = cursor.var(int)
                cursor.execute(query, {
                    "ret": ret_val,
                    "p_CodUbicacion": cod_ubicacion,
                    "p_CodArticulo": cod_articulo,
                    "p_Cantidad": cantidad
                })
                return ret_val.getvalue()
        except Exception as e:
            logger.error(f"Error al ejecutar GSM_LOTES.SPPRP_CHECKUNIDADESPREPLOTE: {e}", exc_info=True)
            raise

    @staticmethod
    def permitir_desmontar_lote(cod_ubicacion: int, cod_articulo: int) -> int:
        """
        Comprueba si el lote se puede desmontar en la ubicación especificada.
        Verifica mediante la función oficial del sistema GETPERMITIRUBICARARTICULOXZONA
        que todos los artículos componentes del kit puedan ubicarse en la zona de la ubicación.
        """
        try:
            with db.get_cursor() as cursor:
                cursor.execute("""
                    SELECT CODARTICULOHIJO 
                    FROM GSM.TMST_ARTICULOSCOMPUESTOS 
                    WHERE CODARTICULO = :cod_articulo
                """, {"cod_articulo": cod_articulo})
                componentes = cursor.fetchall()
                if not componentes:
                    return 0

                ret_val = cursor.var(int)
                for comp in componentes:
                    cursor.execute("""
                        BEGIN
                            :ret := GETPERMITIRUBICARARTICULOXZONA(
                                p_CodUbicacion => :p_CodUbicacion,
                                p_CodArticulo => :p_CodArticulo
                            );
                        END;
                    """, {
                        "ret": ret_val,
                        "p_CodUbicacion": cod_ubicacion,
                        "p_CodArticulo": comp[0]
                    })
                    if ret_val.getvalue() != 1:
                        logger.warning(
                            f"Componente {comp[0]} del kit {cod_articulo} no permitido en ubicación {cod_ubicacion} por zonas."
                        )
                        return 0
                return 1
        except Exception as e:
            logger.error(f"Error al verificar compatibilidad de zonas para desmontaje de kit {cod_articulo}: {e}", exc_info=True)
            raise

    @staticmethod
    def crear_lote(
        cod_terminal: int,
        cod_ubicacion_origen: int,
        cod_articulo: int,
        stock: float,
        fecha_caducidad: Optional[datetime] = None,
        peso: float = 0.0,
        cod_ubicacion_destino: Optional[int] = None,
        cod_palet: Optional[int] = None,
        cod_facturacion: Optional[str] = None,
        numero_lote: Optional[str] = None
    ) -> bool:
        """
        Ejecuta el procedimiento GSM_LOTES.SPPRP_CrearLote para montar un kit.
        """
        try:
            dest = cod_ubicacion_destino if cod_ubicacion_destino is not None else cod_ubicacion_origen
            with db.get_cursor(commit=True) as cursor:
                query = """
                BEGIN
                    GSM_LOTES.SPPRP_CrearLote(
                        p_CodTerminal => :p_CodTerminal,
                        p_CodUbicacionOrigen => :p_CodUbicacionOrigen,
                        p_CodArticulo => :p_CodArticulo,
                        p_Stock => :p_Stock,
                        p_FechaCaducidad => :p_FechaCaducidad,
                        p_Peso => :p_Peso,
                        p_CodUbicacionDestino => :p_CodUbicacionDestino,
                        p_CodPalet => :p_CodPalet,
                        p_CodFacturacion => :p_CodFacturacion,
                        p_NumeroLote => :p_NumeroLote
                    );
                END;
                """
                cursor.execute(query, {
                    "p_CodTerminal": cod_terminal,
                    "p_CodUbicacionOrigen": cod_ubicacion_origen,
                    "p_CodArticulo": cod_articulo,
                    "p_Stock": stock,
                    "p_FechaCaducidad": fecha_caducidad,
                    "p_Peso": peso,
                    "p_CodUbicacionDestino": dest,
                    "p_CodPalet": cod_palet,
                    "p_CodFacturacion": cod_facturacion,
                    "p_NumeroLote": numero_lote
                })
                return True
        except Exception as e:
            logger.error(f"Error al ejecutar GSM_LOTES.SPPRP_CrearLote: {e}", exc_info=True)
            raise

    @staticmethod
    def desmontar_lotes(
        cod_articulo: int,
        cod_ubicacion: int,
        numero_orden: int,
        unidades: float,
        cod_terminal: int,
        tipo_actualizacion: int = 0,
        cod_componente: Optional[int] = None,
        num_lote: Optional[str] = None,
        fecha_caducidad: Optional[datetime] = None,
        sol_lote_comp: Optional[int] = None,
        sol_fec_caducidad_comp: Optional[int] = None
    ) -> bool:
        """
        Ejecuta el procedimiento GSM_LOTES.SPPRP_DESMONTARLOTES para desensamblar un kit.
        """
        try:
            with db.get_cursor(commit=True) as cursor:
                query = """
                BEGIN
                    GSM_LOTES.SPPRP_DESMONTARLOTES(
                        p_CodArticulo => :p_CodArticulo,
                        p_CodUbicacion => :p_CodUbicacion,
                        p_NumeroOrden => :p_NumeroOrden,
                        p_Unidades => :p_Unidades,
                        p_CodTerminal => :p_CodTerminal,
                        p_TipoActualizacion => :p_TipoActualizacion,
                        p_CodComponente => :p_CodComponente,
                        p_NumLote => :p_NumLote,
                        p_FechaCaducidad => :p_FechaCaducidad,
                        p_SolLoteComp => :p_SolLoteComp,
                        p_SolFecCaducidadComp => :p_SolFecCaducidadComp
                    );
                END;
                """
                cursor.execute(query, {
                    "p_CodArticulo": cod_articulo,
                    "p_CodUbicacion": cod_ubicacion,
                    "p_NumeroOrden": numero_orden,
                    "p_Unidades": unidades,
                    "p_CodTerminal": cod_terminal,
                    "p_TipoActualizacion": tipo_actualizacion,
                    "p_CodComponente": cod_componente,
                    "p_NumLote": num_lote,
                    "p_FechaCaducidad": fecha_caducidad,
                    "p_SolLoteComp": sol_lote_comp,
                    "p_SolFecCaducidadComp": sol_fec_caducidad_comp
                })
                return True
        except Exception as e:
            logger.error(f"Error al ejecutar GSM_LOTES.SPPRP_DESMONTARLOTES: {e}", exc_info=True)
            raise
