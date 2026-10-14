import logging
from typing import Dict, List, Any
from app.repositories.pedidos_repo import PedidosRepository
from app.repositories.auth_repo import AuthRepository

logger = logging.getLogger(__name__)

class PedidosService:

    @classmethod
    def _get_permisos_operador(cls, operador_context: Dict[str, Any]) -> Dict[str, Any]:
        """Obtiene los permisos del operador, ya sea del contexto o consultando la base de datos."""
        permisos = operador_context.get("permisos")
        if permisos is not None:
            return permisos
            
        cod_operador = operador_context.get("cod_operador")
        if not cod_operador:
            return {}
            
        op_db = AuthRepository.get_operador_por_codigo(str(cod_operador))
        return op_db.get("permisos", {}) if op_db else {}

    @staticmethod
    def aparcar_documento(cod_documento: int, operador_context: Dict[str, Any]) -> Dict[str, Any]:
        """Aparca un documento actualmente en preparación."""
        try:
            cod_operador = int(operador_context.get('cod_operador', 1))
            res = PedidosRepository.aparcar_documento(cod_documento, cod_operador)
            return {"success": True, "res": res}
        except Exception as e:
            logger.exception(f"Excepción al aparcar documento {cod_documento}")
            raise Exception(f"No se pudo aparcar el documento: {str(e)}")

    @classmethod
    def get_documentos_aparcados(cls, operador_context: Dict[str, Any]) -> List[Dict[str, Any]]:
        try:
            cod_operador = operador_context.get("cod_operador")
            cod_terminal = operador_context.get("terminal")
            permisos = cls._get_permisos_operador(operador_context)
            
            return PedidosRepository.get_documentos_aparcados(cod_operador, cod_terminal, permisos)
        except Exception as e:
            logger.exception("Excepción al obtener aparcados")
            raise Exception(f"No se pudieron obtener los documentos aparcados: {str(e)}")

    @staticmethod
    def get_documentos_en_preparacion(operador_context: Dict[str, Any]) -> List[Dict[str, Any]]:
        try:
            cod_operador = operador_context.get("cod_operador")
            cod_terminal = operador_context.get("terminal")
            
            return PedidosRepository.get_documentos_en_preparacion(cod_operador, cod_terminal)
        except Exception as e:
            logger.exception("Excepción al obtener documentos en preparación")
            raise Exception(f"No se pudieron obtener los documentos en preparación: {str(e)}")

    @classmethod
    def finalizar_documento(cls, cod_documento: int, operador_context: Dict[str, Any], despreciar_restos: bool = False, num_bultos: int = None) -> Dict[str, Any]:
        try:
            permisos = cls._get_permisos_operador(operador_context)
            prm_despreciar = permisos.get("PRM_DESPRECIARRESTOSDOCCLI", False)
            
            # Solo pasamos -1 si pide despreciar y tiene permiso
            valor_despreciar = -1 if (despreciar_restos and prm_despreciar) else 0
            
            result = PedidosRepository.finalizar_documento(cod_documento, valor_despreciar, num_bultos)
            return {"success": True, "codigo_resultado": result}
        except Exception as e:
            logger.exception(f"Excepción al finalizar el documento {cod_documento}")
            raise Exception(f"No se pudo finalizar el documento: {str(e)}")

    @staticmethod
    def get_lineas_documento(cod_documento: int) -> List[Dict[str, Any]]:
        try:
            return PedidosRepository.get_lineas_documento(cod_documento)
        except Exception as e:
            logger.exception(f"Excepción al obtener líneas del documento {cod_documento}")
            raise Exception(f"No se pudieron obtener las líneas: {str(e)}")

    @classmethod
    def _validar_permisos_recuperacion(cls, cod_operador: str, cod_terminal: str, doc_info: Dict[str, Any], permisos: Dict[str, Any]) -> None:
        if not permisos.get("PRM_RECUPERARDOCUMENTOAPARCADO"):
            raise PermissionError("El operador no tiene permisos para recuperar documentos aparcados.")

        if not doc_info:
            return

        doc_operador = doc_info.get("CODOPERADOR")
        doc_terminal = doc_info.get("CODTERMINAL")

        if doc_operador and str(doc_operador) != str(cod_operador) and not permisos.get("PRM_RECUPERARDOCOTROOPERARIO"):
            raise PermissionError("No tienes permiso para recuperar documentos aparcados por otro operario.")

        if doc_terminal and str(doc_terminal) != str(cod_terminal) and not permisos.get("PRM_RECUPERARDOCOTROTERMINAL"):
            raise PermissionError("No tienes permiso para recuperar documentos aparcados en otro terminal.")

    @classmethod
    def recuperar_documento(cls, cod_documento: int, operador_context: Dict[str, Any], cod_terminal: int) -> Dict[str, Any]:
        """
        Recupera un documento aparcado.
        Verifica permisos cruzados si el documento fue aparcado por otro operario u otro terminal.
        """
        cod_operador = operador_context.get("cod_operador")
        permisos = cls._get_permisos_operador(operador_context)

        doc_info = PedidosRepository.get_documento_estado(cod_documento)
        if doc_info:
            cls._validar_permisos_recuperacion(str(cod_operador), str(cod_terminal), doc_info, permisos)
        else:
            logger.warning(f"No se pudo verificar el estado del documento {cod_documento} para permisos cruzados.")

        try:
            result = PedidosRepository.recuperar_documento(cod_documento, cod_terminal)
            return {"success": True, "codigo_resultado": result}
        except Exception as e:
            logger.exception(f"Excepción al recuperar documento {cod_documento}")
            raise Exception(f"No se pudo recuperar el documento: {str(e)}")
