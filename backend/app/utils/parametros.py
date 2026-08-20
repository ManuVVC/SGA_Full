import logging
from ..database import OracleDatabase

logger = logging.getLogger(__name__)

def get_parametro(cod_parametro: int) -> str:
    """
    Consulta el valor de un parámetro del sistema en GSM.TSYS_PARAMETROSXAMBITO.
    Devuelve el valor como cadena o '0' en caso de error o no encontrarse.
    """
    try:
        query = "SELECT VALOR FROM GSM.TSYS_PARAMETROSXAMBITO WHERE CODPARAMETRO = :1"
        rows = OracleDatabase.execute_query(query, [cod_parametro], as_dict=False)
        if rows and rows[0] and rows[0][0] is not None:
            return str(rows[0][0]).strip()
        return "0"
    except Exception as e:
        logger.error(f"Error al obtener parámetro {cod_parametro}: {e}")
        return "0"

def is_parametro_activo(cod_parametro: int) -> bool:
    """
    Evalúa si un parámetro del sistema está activo.
    Considera inactivos los valores: '0', '0.0', '', 'None', 'False', 'false', 'N', 'F', 'n', 'f'.
    """
    val = get_parametro(cod_parametro)
    return val not in ("0", "0.0", "", "None", "False", "false", "N", "F", "n", "f")
