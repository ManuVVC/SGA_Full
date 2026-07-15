"""
SGA Print Agent - Agente de impresion para Windows
===================================================
Vigila la carpeta print_queue y envia automaticamente cada PDF nuevo
a la impresora Windows configurada.

Uso:
    python sga_print_agent.py

Configuracion (editar las variables de la seccion CONFIG):
    WATCH_FOLDER  : Ruta de la carpeta a vigilar (relativa o absoluta)
    PRINTER_NAME  : Nombre exacto de la impresora Windows
                    (vacio = impresora predeterminada del sistema)
    POLL_INTERVAL : Segundos entre comprobaciones (por defecto 3)
    DELETE_AFTER  : True = borra el PDF tras imprimir / False = lo mueve a printed/

Dependencias opcionales (mejoran el metodo de impresion):
    pip install pywin32
    o instalar SumatraPDF (recomendado para etiquetas)
"""

import os
import sys
import time
import shutil
import logging
import subprocess
from pathlib import Path

# =============================================================================
# CONFIG - Editar segun tu entorno
# =============================================================================
WATCH_FOLDER   = r"G:\Proyectos\SGA_BACKEND\print_queue"
PRINTER_NAME   = ""          # Vacio = impresora predeterminada. Ej: "Microsoft Print to PDF"
POLL_INTERVAL  = 3           # Segundos entre comprobaciones
DELETE_AFTER   = False       # False -> mueve a subcarpeta "printed", True -> borra
# =============================================================================

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler(
            str(Path(WATCH_FOLDER).parent / "sga_print_agent.log"),
            encoding="utf-8"
        )
    ]
)
logger = logging.getLogger("SGA-PrintAgent")


def imprimir_pdf_windows(ruta_pdf, nombre_impresora=""):
    # Metodo 1: SumatraPDF (silencioso, sin dialogos, ideal para etiquetas)
    sumatras = [
        r"C:\Program Files\SumatraPDF\SumatraPDF.exe",
        r"C:\Program Files (x86)\SumatraPDF\SumatraPDF.exe",
    ]
    for sumatra in sumatras:
        if Path(sumatra).exists():
            cmd = [sumatra, "-print-to-default", "-silent", ruta_pdf]
            if nombre_impresora:
                cmd = [sumatra, "-print-to", nombre_impresora, "-silent", ruta_pdf]
            try:
                subprocess.run(cmd, timeout=30, check=True)
                logger.info(f"  OK Impreso con SumatraPDF -> {nombre_impresora or 'predeterminada'}")
                return True
            except Exception as e:
                logger.warning(f"  SumatraPDF fallo: {e}")

    # Metodo 2: pywin32
    try:
        import win32api
        if nombre_impresora:
            win32api.ShellExecute(0, "printto", ruta_pdf, f'"{nombre_impresora}"', ".", 0)
        else:
            win32api.ShellExecute(0, "print", ruta_pdf, None, ".", 0)
        time.sleep(5)
        logger.info(f"  OK Impreso con win32api -> {nombre_impresora or 'predeterminada'}")
        return True
    except ImportError:
        pass
    except Exception as e:
        logger.warning(f"  win32api fallo: {e}")

    # Metodo 3: PowerShell (siempre disponible)
    try:
        printer_arg = f'"{nombre_impresora}"' if nombre_impresora else '$null'
        ps_cmd = f'Start-Process -FilePath "{ruta_pdf}" -Verb PrintTo -ArgumentList {printer_arg} -Wait'
        result = subprocess.run(["powershell", "-Command", ps_cmd], timeout=30, capture_output=True)
        if result.returncode == 0:
            logger.info(f"  OK Impreso con PowerShell -> {nombre_impresora or 'predeterminada'}")
            return True
        else:
            logger.warning(f"  PowerShell error: {result.stderr.decode(errors='replace')}")
    except Exception as e:
        logger.warning(f"  PowerShell fallo: {e}")

    logger.error(f"  ERROR No se pudo imprimir {ruta_pdf}")
    return False


def mover_o_borrar(ruta_pdf):
    if DELETE_AFTER:
        try:
            os.remove(ruta_pdf)
        except Exception as e:
            logger.warning(f"No se pudo borrar {ruta_pdf}: {e}")
    else:
        destino = Path(ruta_pdf).parent / "printed"
        destino.mkdir(exist_ok=True)
        try:
            shutil.move(ruta_pdf, str(destino / Path(ruta_pdf).name))
        except Exception as e:
            logger.warning(f"No se pudo mover {ruta_pdf}: {e}")


def main():
    watch = Path(WATCH_FOLDER)
    watch.mkdir(parents=True, exist_ok=True)
    logger.info("=" * 60)
    logger.info("SGA Print Agent iniciado")
    logger.info(f"  Carpeta vigilada : {watch}")
    logger.info(f"  Impresora        : {PRINTER_NAME or '(predeterminada)'}")
    logger.info(f"  Intervalo        : {POLL_INTERVAL}s")
    logger.info(f"  Tras imprimir    : {'Borrar' if DELETE_AFTER else 'Mover a printed/'}")
    logger.info("=" * 60)

    while True:
        try:
            pdfs = sorted(watch.glob("etiq_palet_*.pdf"))
            for pdf in pdfs:
                logger.info(f"[NEW] {pdf.name}")
                ok = imprimir_pdf_windows(str(pdf), PRINTER_NAME)
                if ok:
                    mover_o_borrar(str(pdf))
                else:
                    error_path = pdf.with_suffix(".ERROR.pdf")
                    try:
                        pdf.rename(error_path)
                    except Exception:
                        pass
        except KeyboardInterrupt:
            logger.info("Agente detenido.")
            break
        except Exception as e:
            logger.error(f"Error en bucle principal: {e}", exc_info=True)
        time.sleep(POLL_INTERVAL)


if __name__ == "__main__":
    main()
