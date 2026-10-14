import logging
from ..database import OracleDatabase

logger = logging.getLogger(__name__)

class InformesConfigRepo:
    @staticmethod
    def _fetch_with_lobs(query, params):
        with OracleDatabase.get_cursor() as cursor:
            cursor.execute(query, params)
            columns = [col[0].upper() for col in cursor.description] if cursor.description else []
            results = []
            for row in cursor.fetchall():
                row_dict = {}
                for i, col in enumerate(columns):
                    val = row[i]
                    if hasattr(val, 'read'):
                        val = val.read()
                    row_dict[col] = val
                results.append(row_dict)
            return results

    @staticmethod
    def get_all(solo_visibles=False):
        query = "SELECT * FROM SGA_INFORMES_CONFIG"
        params = {}
        if solo_visibles:
            query += " WHERE VISIBLE_USUARIOS = 1"
        query += " ORDER BY CATEGORIA, TITULO"
        try:
            return InformesConfigRepo._fetch_with_lobs(query, params)
        except Exception as e:
            if "ORA-00942" in str(e):
                logger.warning("La tabla SGA_INFORMES_CONFIG no existe. Ejecute backend/scripts/create_informes_tables.sql")
                return []
            raise

    @staticmethod
    def get_by_id(id_informe):
        query = "SELECT * FROM SGA_INFORMES_CONFIG WHERE ID = :id"
        result = InformesConfigRepo._fetch_with_lobs(query, {"id": id_informe})
        return result[0] if result else None

    @staticmethod
    def create(data_dict):
        with OracleDatabase.get_cursor(commit=True) as cursor:
            query = """
                INSERT INTO SGA_INFORMES_CONFIG (
                    ID, NOMBRE, TITULO, DESCRIPCION, CATEGORIA, SQL_QUERY, 
                    CODDEFFILTRO, COLUMNAS_CONFIG, ORDER_BY, VISIBLE_USUARIOS
                ) VALUES (
                    SGA_INFORMES_CONFIG_SEQ.NEXTVAL, :nombre, :titulo, :descripcion, 
                    :categoria, :sql_query, :coddeffiltro, :columnas_config, 
                    :order_by, :visible_usuarios
                ) RETURNING ID INTO :out_id
            """
            out_id = cursor.var(int)
            
            params = {
                "nombre": data_dict.get("nombre"),
                "titulo": data_dict.get("titulo"),
                "descripcion": data_dict.get("descripcion"),
                "categoria": data_dict.get("categoria"),
                "sql_query": data_dict.get("sql_query"),
                "coddeffiltro": data_dict.get("coddeffiltro"),
                "columnas_config": data_dict.get("columnas_config"),
                "order_by": data_dict.get("order_by"),
                "visible_usuarios": data_dict.get("visible_usuarios", 1),
                "out_id": out_id
            }
            
            cursor.execute(query, params)
            return out_id.getvalue()[0]

    @staticmethod
    def update(id_informe, data_dict):
        with OracleDatabase.get_cursor(commit=True) as cursor:
            query = """
                UPDATE SGA_INFORMES_CONFIG 
                SET NOMBRE = :nombre,
                    TITULO = :titulo,
                    DESCRIPCION = :descripcion,
                    CATEGORIA = :categoria,
                    SQL_QUERY = :sql_query,
                    CODDEFFILTRO = :coddeffiltro,
                    COLUMNAS_CONFIG = :columnas_config,
                    ORDER_BY = :order_by,
                    VISIBLE_USUARIOS = :visible_usuarios,
                    FECHA_MODIFICACION = SYSDATE
                WHERE ID = :id
            """
            params = {
                "nombre": data_dict.get("nombre"),
                "titulo": data_dict.get("titulo"),
                "descripcion": data_dict.get("descripcion"),
                "categoria": data_dict.get("categoria"),
                "sql_query": data_dict.get("sql_query"),
                "coddeffiltro": data_dict.get("coddeffiltro"),
                "columnas_config": data_dict.get("columnas_config"),
                "order_by": data_dict.get("order_by"),
                "visible_usuarios": data_dict.get("visible_usuarios", 1),
                "id": id_informe
            }
            cursor.execute(query, params)
            return True

    @staticmethod
    def delete(id_informe):
        with OracleDatabase.get_cursor(commit=True) as cursor:
            # Delete user prefs first due to FK
            cursor.execute("DELETE FROM SGA_INFORMES_USUARIO WHERE ID_INFORME = :id", {"id": id_informe})
            cursor.execute("DELETE FROM SGA_INFORMES_CONFIG WHERE ID = :id", {"id": id_informe})
            return True

    @staticmethod
    def get_columnas_tabla(nombre_tabla):
        query = """
            SELECT COLUMN_NAME, DATA_TYPE, DATA_LENGTH 
            FROM ALL_TAB_COLUMNS 
            WHERE TABLE_NAME = UPPER(:tabla) 
            ORDER BY COLUMN_ID
        """
        return OracleDatabase.execute_query(query, {"tabla": nombre_tabla})

    @staticmethod
    def get_tablas_disponibles():
        query = """
            SELECT TABLE_NAME AS NOMBRE, 'TABLE' AS TIPO FROM ALL_TABLES 
            UNION ALL 
            SELECT VIEW_NAME AS NOMBRE, 'VIEW' AS TIPO FROM ALL_VIEWS 
            ORDER BY NOMBRE
        """
        return OracleDatabase.execute_query(query, {})

    @staticmethod
    def get_preferencias_usuario(id_informe, codoperador):
        query = "SELECT * FROM SGA_INFORMES_USUARIO WHERE ID_INFORME = :id AND CODOPERADOR = :cod"
        result = InformesConfigRepo._fetch_with_lobs(query, {"id": id_informe, "cod": codoperador})
        return result[0] if result else None

    @staticmethod
    def save_preferencias_usuario(id_informe, codoperador, columnas_visibles, orden_columnas):
        with OracleDatabase.get_cursor(commit=True) as cursor:
            query = """
                MERGE INTO SGA_INFORMES_USUARIO tgt
                USING (SELECT :id_informe AS id_informe, :codoperador AS codoperador FROM DUAL) src
                ON (tgt.ID_INFORME = src.id_informe AND tgt.CODOPERADOR = src.codoperador)
                WHEN MATCHED THEN
                    UPDATE SET 
                        COLUMNAS_VISIBLES = :columnas_visibles,
                        ORDEN_COLUMNAS = :orden_columnas,
                        FECHA_MODIFICACION = SYSDATE
                WHEN NOT MATCHED THEN
                    INSERT (ID, ID_INFORME, CODOPERADOR, COLUMNAS_VISIBLES, ORDEN_COLUMNAS)
                    VALUES (SGA_INFORMES_USUARIO_SEQ.NEXTVAL, :id_informe, :codoperador, :columnas_visibles, :orden_columnas)
            """
            params = {
                "id_informe": id_informe,
                "codoperador": codoperador,
                "columnas_visibles": columnas_visibles,
                "orden_columnas": orden_columnas
            }
            cursor.execute(query, params)
            return True
