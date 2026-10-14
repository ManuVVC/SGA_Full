import logging
import json
import datetime
from ..database import OracleDatabase
from ..repositories.informes_config_repo import InformesConfigRepo

logger = logging.getLogger(__name__)


class InformesConfigService:
    """Servicio de lógica de negocio para informes configurables."""

    @staticmethod
    def _read_lob(val):
        """Lee el contenido de un LOB/CLOB de Oracle si es necesario."""
        return val.read() if hasattr(val, 'read') else val

    @classmethod
    def _parse_json_fields(cls, informe):
        """Parsea campos CLOB/JSON del informe a objetos Python."""
        if not informe:
            return informe
            
        if informe.get('COLUMNAS_CONFIG'):
            try:
                val = cls._read_lob(informe['COLUMNAS_CONFIG'])
                informe['COLUMNAS_CONFIG'] = json.loads(val) if isinstance(val, str) else val
            except Exception as e:
                logger.error(f"Error parseando COLUMNAS_CONFIG JSON: {e}")
                informe['COLUMNAS_CONFIG'] = []
                
        if informe.get('SQL_QUERY'):
            informe['SQL_QUERY'] = cls._read_lob(informe['SQL_QUERY'])
            
        return informe

    @classmethod
    def get_all(cls, solo_visibles=False):
        """Obtiene todos los informes, parseando los campos JSON."""
        informes = InformesConfigRepo.get_all(solo_visibles)
        return [cls._parse_json_fields(inf) for inf in informes]

    @classmethod
    def get_by_id(cls, id_informe):
        """Obtiene un informe por ID."""
        informe = InformesConfigRepo.get_by_id(id_informe)
        return cls._parse_json_fields(informe) if informe else None

    @staticmethod
    def _serialize_config(data):
        """Serializa campos de configuración antes de persistir."""
        if 'columnas_config' in data and isinstance(data['columnas_config'], (dict, list)):
            data['columnas_config'] = json.dumps(data['columnas_config'], ensure_ascii=False)
        return data

    @classmethod
    def create(cls, data):
        """Crea un nuevo informe, serializando campos JSON."""
        return InformesConfigRepo.create(cls._serialize_config(data))

    @classmethod
    def update(cls, id_informe, data):
        """Actualiza un informe existente."""
        return InformesConfigRepo.update(id_informe, cls._serialize_config(data))

    @staticmethod
    def delete(id_informe):
        """Elimina un informe y sus preferencias de usuario."""
        return InformesConfigRepo.delete(id_informe)

    @staticmethod
    def _validar_sql(sql_query):
        """Valida por seguridad que la consulta sea SELECT o WITH."""
        sql_upper = sql_query.upper().strip()
        if not (sql_upper.startswith("SELECT") or sql_upper.startswith("WITH")):
            raise ValueError("La consulta SQL solo permite SELECT o WITH")

        prohibited_keywords = [
            "INSERT ", "UPDATE ", "DELETE ", "DROP ", "ALTER ",
            "TRUNCATE ", "EXEC ", "GRANT ", "REVOKE "
        ]
        if any(kw in sql_upper for kw in prohibited_keywords):
            raise ValueError("Consulta rechazada: contiene palabras no permitidas")

        return sql_upper

    @staticmethod
    def _inyectar_filtros(sql_query, coddeffiltro, filtros, custom_filters):
        """Inyecta los filtros dinámicos en la consulta."""
        from .filter_service import FilterService
        
        bind_params = {}
        cond_sql = ""

        if custom_filters and coddeffiltro:
            cond_sql, bind_params = FilterService.build_custom_filter_condition(
                int(coddeffiltro), custom_filters, bind_param_prefix="f_custom_"
            )
        elif filtros and str(filtros).isdigit():
            cond_sql, bind_params, _ = FilterService.build_filter_condition(
                int(filtros), bind_param_prefix="f_dinamico_"
            )

        if cond_sql:
            if "{FILTROS_DINAMICOS}" in sql_query:
                sql_query = sql_query.replace("{FILTROS_DINAMICOS}", cond_sql)
            else:
                sql_query = f"SELECT * FROM ({sql_query}) WHERE 1=1 {cond_sql}"

        return sql_query.replace("{FILTROS_DINAMICOS}", ""), bind_params

    @classmethod
    def ejecutar_informe(cls, id_informe, filtros=None, custom_filters=None):
        """
        Ejecuta un informe configurado con inyección de filtros dinámicos.
        Reutiliza FilterService para los filtros Oracle existentes.
        """
        informe = cls.get_by_id(id_informe)
        if not informe:
            raise ValueError("Informe no encontrado")

        sql_query = informe.get("SQL_QUERY", "")
        sql_upper = cls._validar_sql(sql_query)

        sql_query, bind_params = cls._inyectar_filtros(
            sql_query, informe.get("CODDEFFILTRO"), filtros, custom_filters
        )

        # Límite de registros
        if "FETCH FIRST" not in sql_upper:
            sql_query = f"SELECT * FROM ({sql_query}) WHERE ROWNUM <= 1000"

        return cls._ejecutar_consulta(sql_query, bind_params, id_informe)

    @classmethod
    def _ejecutar_consulta(cls, sql_query, bind_params, id_informe):
        """Maneja la conexión y ejecución de la consulta de informe."""
        try:
            # Assumes OracleDatabase.get_connection returns a context manager compatible object
            # or requires explicit close.
            connection = OracleDatabase.get_connection()
            cursor = connection.cursor()
            
            try:
                cursor.execute(sql_query, bind_params)
                cols = [col[0] for col in cursor.description]
                
                data_rows = []
                for row in cursor.fetchall():
                    row_dict = {}
                    for idx, col in enumerate(cols):
                        val = row[idx]
                        if isinstance(val, datetime.datetime):
                            val = val.strftime('%Y-%m-%d %H:%M:%S')
                        elif isinstance(val, datetime.date):
                            val = val.strftime('%Y-%m-%d')
                        else:
                            val = cls._read_lob(val)
                        row_dict[col] = val
                    data_rows.append(row_dict)

                return {
                    "columns": cols,
                    "data": data_rows,
                    "total": len(data_rows)
                }
            finally:
                cursor.close()
                connection.close()
                
        except Exception as e:
            logger.error(f"Error ejecutando informe {id_informe}: {e}")
            raise ValueError(f"Error ejecutando SQL: {str(e)}")

    @staticmethod
    def get_columnas_tabla(nombre_tabla):
        """Introspección de columnas de una tabla/vista Oracle."""
        return InformesConfigRepo.get_columnas_tabla(nombre_tabla)

    @staticmethod
    def get_tablas_disponibles():
        """Lista de tablas y vistas disponibles en el esquema."""
        return InformesConfigRepo.get_tablas_disponibles()

    @classmethod
    def get_preferencias_usuario(cls, id_informe, codoperador):
        """Obtiene las preferencias de un usuario para un informe."""
        prefs = InformesConfigRepo.get_preferencias_usuario(id_informe, codoperador)
        if prefs:
            for field in ('COLUMNAS_VISIBLES', 'ORDEN_COLUMNAS'):
                if prefs.get(field):
                    try:
                        val = cls._read_lob(prefs[field])
                        prefs[field] = json.loads(val)
                    except Exception:
                        prefs[field] = []
        return prefs

    @staticmethod
    def save_preferencias_usuario(id_informe, codoperador, columnas_visibles, orden_columnas):
        """Guarda las preferencias de un usuario para un informe."""
        col_vis = json.dumps(columnas_visibles) if isinstance(columnas_visibles, (dict, list)) else columnas_visibles
        ord_col = json.dumps(orden_columnas) if isinstance(orden_columnas, (dict, list)) else orden_columnas
        return InformesConfigRepo.save_preferencias_usuario(id_informe, codoperador, col_vis, ord_col)
