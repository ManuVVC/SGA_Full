import os
import json
import time
import logging
from typing import List, Dict, Any

logger = logging.getLogger(__name__)

# Configuración de ruta
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DATA_FILE = os.path.join(BASE_DIR, 'data', 'informes.json')


class InformesService:
    """Servicio para la gestión de informes JSON."""

    @classmethod
    def _ensure_data_dir(cls) -> None:
        """Asegura que el directorio de datos existe."""
        os.makedirs(os.path.dirname(DATA_FILE), exist_ok=True)

    @classmethod
    def _read_data(cls) -> List[Dict[str, Any]]:
        """Lee y retorna los datos del archivo JSON."""
        if not os.path.exists(DATA_FILE):
            return []
        try:
            with open(DATA_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except (IOError, json.JSONDecodeError) as e:
            logger.error(f"Error leyendo informes: {e}")
            return []

    @classmethod
    def _write_data(cls, data: List[Dict[str, Any]]) -> None:
        """Escribe los datos en el archivo JSON."""
        cls._ensure_data_dir()
        try:
            with open(DATA_FILE, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=4, ensure_ascii=False)
        except IOError as e:
            logger.error(f"Error escribiendo informes: {e}")
            raise RuntimeError("No se pudieron guardar los informes.") from e

    @classmethod
    def get_informes(cls) -> List[Dict[str, Any]]:
        """Obtiene la lista de informes."""
        return cls._read_data()

    @classmethod
    def save_informe(cls, informe: Dict[str, Any]) -> Dict[str, Any]:
        """Guarda o actualiza un informe."""
        informes = cls._read_data()
        
        if not informe.get("id"):
            informe["id"] = str(int(time.time() * 1000))
            informes.append(informe)
        else:
            # Reemplaza si existe, sino añade
            for idx, existing in enumerate(informes):
                if existing.get("id") == informe["id"]:
                    informes[idx] = informe
                    break
            else:
                informes.append(informe)

        cls._write_data(informes)
        return informe

    @classmethod
    def delete_informe(cls, id_informe: str) -> bool:
        """Elimina un informe por su ID."""
        informes = cls._read_data()
        nuevos_informes = [inf for inf in informes if inf.get("id") != id_informe]
        
        if len(informes) == len(nuevos_informes):
            return False
            
        cls._write_data(nuevos_informes)
        return True
