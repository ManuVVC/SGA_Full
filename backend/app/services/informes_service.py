import os
import json
import logging
from typing import List, Dict, Any

logger = logging.getLogger(__name__)

# Usaremos una ruta relativa al directorio app o similar
# Considerando que estamos en backend/app/services/informes_service.py
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DATA_FILE = os.path.join(BASE_DIR, 'data', 'informes.json')

class InformesService:
    @staticmethod
    def _ensure_file_exists():
        if not os.path.exists(DATA_FILE):
            os.makedirs(os.path.dirname(DATA_FILE), exist_ok=True)
            with open(DATA_FILE, 'w', encoding='utf-8') as f:
                json.dump([], f)

    @staticmethod
    def get_informes() -> List[Dict[str, Any]]:
        InformesService._ensure_file_exists()
        try:
            with open(DATA_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Error leyendo informes: {e}")
            return []

    @staticmethod
    def save_informe(informe: Dict[str, Any]) -> Dict[str, Any]:
        """
        Guarda o actualiza un informe. Espera campos como: id, nombre, sql, coddeffiltro
        """
        informes = InformesService.get_informes()
        
        # Generar un ID simple basado en el timestamp si es nuevo
        import time
        if not informe.get("id"):
            informe["id"] = str(int(time.time() * 1000))
            informes.append(informe)
        else:
            # Actualizar existente
            found = False
            for i, existing in enumerate(informes):
                if existing.get("id") == informe["id"]:
                    informes[i] = informe
                    found = True
                    break
            if not found:
                informes.append(informe)

        try:
            with open(DATA_FILE, 'w', encoding='utf-8') as f:
                json.dump(informes, f, indent=4, ensure_ascii=False)
            return informe
        except Exception as e:
            logger.error(f"Error guardando informe: {e}")
            raise Exception("No se pudo guardar el informe")

    @staticmethod
    def delete_informe(id_informe: str) -> bool:
        informes = InformesService.get_informes()
        nuevos_informes = [i for i in informes if i.get("id") != id_informe]
        if len(informes) == len(nuevos_informes):
            return False # No se encontró
            
        try:
            with open(DATA_FILE, 'w', encoding='utf-8') as f:
                json.dump(nuevos_informes, f, indent=4, ensure_ascii=False)
            return True
        except Exception as e:
            logger.error(f"Error eliminando informe: {e}")
            return False
