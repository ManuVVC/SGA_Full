import logging
from app.repositories.pedidos_repo import PedidosRepository
from app.repositories.auth_repo import AuthRepository

logger = logging.getLogger(__name__)

class PedidosService:

    @staticmethod
    def aparcar_documento(cod_documento: int, operador: dict) -> dict:
        """
        Aparca un documento actualmente en preparación.
        """
        try:
            # operador viene de g.operador, usamos 'cod_operador'
            cod_operador = int(operador.get('cod_operador', 1))
            res = PedidosRepository.aparcar_documento(cod_documento, cod_operador)
            return {"success": True, "res": res}
        except Exception as e:
            logger.error(f"Excepción al aparcar documento {cod_documento}: {e}")
            raise Exception(f"No se pudo aparcar el documento: {str(e)}")

    @staticmethod
    def get_documentos_aparcados(operador_context: dict) -> list:
        try:
            cod_operador = operador_context.get("cod_operador")
            cod_terminal = operador_context.get("terminal")
            
            # Obtener los permisos del operador de la BD
            op_db = AuthRepository.get_operador_por_codigo(str(cod_operador))
            permisos = op_db.get("permisos", {}) if op_db else {}
            
            return PedidosRepository.get_documentos_aparcados(cod_operador, cod_terminal, permisos)
        except Exception as e:
            logger.error(f"Excepción al obtener aparcados: {e}")
            raise Exception(f"No se pudieron obtener los documentos aparcados: {str(e)}")

    @staticmethod
    def get_documentos_en_preparacion(operador_context: dict) -> list:
        try:
            cod_operador = operador_context.get("cod_operador")
            cod_terminal = operador_context.get("terminal")
            
            return PedidosRepository.get_documentos_en_preparacion(cod_operador, cod_terminal)
        except Exception as e:
            logger.error(f"Excepción al obtener documentos en preparación: {e}")
            raise Exception(f"No se pudieron obtener los documentos en preparación: {str(e)}")

    @staticmethod
    def get_lineas_documento(cod_documento: int) -> list:
        try:
            return PedidosRepository.get_lineas_documento(cod_documento)
        except Exception as e:
            logger.error(f"Excepción al obtener líneas del documento {cod_documento}: {e}")
            raise Exception(f"No se pudieron obtener las líneas: {str(e)}")

    @staticmethod
    def recuperar_documento(cod_documento: int, operador_context: dict, cod_terminal: int) -> dict:
        """
        Recupera un documento aparcado.
        Verifica permisos cruzados si el documento fue aparcado por otro operario u otro terminal.
        """
        cod_operador = operador_context.get("cod_operador")
        
        # Obtener los permisos del operador de la BD
        op_db = AuthRepository.get_operador_por_codigo(str(cod_operador))
        permisos = op_db.get("permisos", {}) if op_db else {}
        
        if not permisos.get("PRM_RECUPERARDOCUMENTOAPARCADO"):
            raise PermissionError("El operador no tiene permisos para recuperar documentos aparcados.")

        # Obtener información actual del documento para validar cruces
        doc_info = PedidosRepository.get_documento_estado(cod_documento)
        if doc_info:
            doc_operador = doc_info.get("CODOPERADOR")
            doc_terminal = doc_info.get("CODTERMINAL")
            # cod_operador ya está extraído al principio de la función, no necesitamos reasignarlo


            # Si el documento estaba aparcado por otro operador y no tengo permiso para cruzar operador
            if doc_operador and str(doc_operador) != str(cod_operador) and not permisos.get("PRM_RECUPERARDOCOTROOPERARIO"):
                raise PermissionError("No tienes permiso para recuperar documentos aparcados por otro operario.")

            # Si el documento estaba aparcado en otro terminal y no tengo permiso para cruzar terminal
            if doc_terminal and str(doc_terminal) != str(cod_terminal) and not permisos.get("PRM_RECUPERARDOCOTROTERMINAL"):
                raise PermissionError("No tienes permiso para recuperar documentos aparcados en otro terminal.")
        else:
            logger.warning(f"No se pudo verificar el estado del documento {cod_documento} para permisos cruzados.")

        try:
            result = PedidosRepository.recuperar_documento(cod_documento, cod_terminal)
            return {"success": True, "codigo_resultado": result}
        except Exception as e:
            logger.error(f"Excepción en el servicio al recuperar {cod_documento}: {e}")
            raise Exception(f"No se pudo recuperar el documento: {str(e)}")
