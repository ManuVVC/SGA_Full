import sys
import os
sys.path.append(os.path.abspath("app"))
from app import create_app
from app.utils.impresion import _generar_dp_palet, _generar_pdf_palet

print("Imports exitosos!")
datos_prueba = {
    'sscc': '00123456789012345678',
    'cod_articulo': '500143',
    'nombre': 'ZAMBU PORTA HGNCO. ABS - AVANT BLANCO',
    'lote': 'L20260713',
    'fecha_caducidad': None
}

try:
    dp = _generar_dp_palet(datos_prueba)
    print("DP Generado (longitud):", len(dp))
    
    # Intentar generar un PDF de prueba en la carpeta del contenedor
    os.makedirs("/app/print_queue", exist_ok=True)
    pdf_ok = _generar_pdf_palet(datos_prueba, "/app/print_queue/test_pda.pdf")
    print("PDF generado correctamente?:", pdf_ok)
except Exception as e:
    print("Error:", e)
