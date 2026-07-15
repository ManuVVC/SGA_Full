"""
Módulo de impresión de etiquetas para el SGA.

Lógica dual:
  - Si la impresora tiene IP configurada en TSYS_IMPRESORAS.PORT
    → Envía comandos Intermec Direct Protocol (DP) vía socket TCP (puerto 9100)
  - Si no tiene IP
    → Genera un PDF con ReportLab y lo guarda en PRINT_PDF_FOLDER
      para que el agente Windows de impresión lo recoja y lo mande
      a la impresora Windows configurada.

Dimensiones etiqueta palet: 110mm ancho x 210mm largo @ 203dpi
"""
import os
import socket
import logging
import datetime
from pathlib import Path

logger = logging.getLogger(__name__)

# Puerto TCP estándar para impresión RAW (Intermec DP)
PRINTER_PORT = 9100

# Carpeta destino de PDFs (configurable en .env)
PDF_FOLDER = os.environ.get('PRINT_PDF_FOLDER', '/app/print_queue')


# ---------------------------------------------------------------------------
# Utilidades comunes
# ---------------------------------------------------------------------------

def _format_date_etiqueta(fecha) -> str:
    """Formatea fecha como DD/MM/YYYY. Devuelve '' si es None."""
    if fecha is None:
        return ''
    if hasattr(fecha, 'strftime'):
        return fecha.strftime('%d/%m/%Y')
    return str(fecha)


def get_printer_ip(codterminal: int) -> str | None:
    """
    Obtiene la IP de la impresora de etiquetas de palet asignada al terminal.
    La IP está en TSYS_IMPRESORAS.PORT (campo PORT reutilizado para IP).
    Devuelve None si no hay IP configurada.
    """
    from app.database import db
    try:
        conn = db.get_connection()
        cursor = conn.cursor()
        cursor.execute(
            """SELECT I.PORT
               FROM GSM.TSYS_IMPRESORAS I
               JOIN GSM.VSYS_IMPRESORASXTERMINALDOC V
                 ON V.CODIMPRESORA = I.CODIMPRESORA
               WHERE V.CODTERMINAL = :1
                 AND V.CODDOCUMENTOIMPRESO = 1
                 AND ROWNUM = 1""",
            [codterminal]
        )
        row = cursor.fetchone()
        ip = row[0] if row else None
        return ip.strip() if ip else None
    except Exception as e:
        logger.error(f"Error al obtener IP de impresora (terminal {codterminal}): {e}")
        return None
    finally:
        if 'cursor' in locals():
            try: cursor.close()
            except: pass
        if 'conn' in locals():
            try: conn.close()
            except: pass


# ---------------------------------------------------------------------------
# Vía A: Intermec Direct Protocol → TCP socket
# ---------------------------------------------------------------------------

def _generar_dp_palet(datos: dict) -> bytes:
    """
    Genera el comando Intermec Direct Protocol (DP/IPL) para una etiqueta de palet.
    Etiqueta 110x210mm a 203dpi (879 x 1677 dots).
    """
    sscc        = datos.get('sscc', '').replace(' ', '')
    cod_art     = datos.get('cod_articulo', '')
    nombre      = (datos.get('nombre', '') or '')[:40]
    lote        = datos.get('lote', '') or ''
    fecha_cad   = _format_date_etiqueta(datos.get('fecha_caducidad'))

    # SSCC legible con separadores (00 + 17 dígitos)
    sscc_leg = f"(00) {sscc[:2]} {sscc[2:9]} {sscc[9:17]} {sscc[17:]}" if len(sscc) >= 18 else sscc

    lines = [
        "\x1bC",               # Clear buffer
        "\x1bP",               # Start label
        "W879",                # Ancho 879 dots (110mm)
        "Q1677,0",             # Alto 1677 dots (210mm)
        "D8",                  # Densidad
        "S2",                  # Velocidad
        # --- Bloque artículo ---
        'A30,30,0,2,1,1,N,"REFERENCIA"',
        f'A30,60,0,5,2,2,N,"{cod_art}"',
        'A380,30,0,2,1,1,N,"DESCRIPCION"',
        f'A380,60,0,3,1,1,N,"{nombre}"',
        # --- Separador 1 ---
        "L30,270,879,4",
        # --- Bloque lote / caducidad ---
        'A30,290,0,2,1,1,N,"LOTE"',
        f'A30,320,0,4,1,1,N,"{lote}"',
        'A480,290,0,2,1,1,N,"FECHA CADUCIDAD"',
        f'A480,320,0,4,1,1,N,"{fecha_cad}"',
        # --- Separador 2 ---
        "L30,500,879,4",
        # --- EAN-128 SSCC ---
        f'B150,560,0,1A,3,7,120,B,"{sscc}"',
        f'A200,700,0,2,1,1,N,"{sscc_leg}"',
        # --- Imprimir ---
        "P1",
    ]
    return ("\r\n".join(lines) + "\r\n").encode('ascii', errors='replace')


def _enviar_dp_tcp(ip: str, datos: dict, puerto: int = PRINTER_PORT) -> bool:
    """Envía el DP generado a la impresora por socket TCP. Devuelve True si OK."""
    try:
        dp = _generar_dp_palet(datos)
        logger.info(f"[PRINT-TCP] Enviando etiqueta a {ip}:{puerto} SSCC={datos.get('sscc')}")
        with socket.create_connection((ip, puerto), timeout=5) as sock:
            sock.sendall(dp)
        logger.info(f"[PRINT-TCP] OK → {ip}:{puerto}")
        return True
    except socket.timeout:
        logger.error(f"[PRINT-TCP] Timeout conectando con {ip}:{puerto}")
        return False
    except ConnectionRefusedError:
        logger.error(f"[PRINT-TCP] Conexión rechazada por {ip}:{puerto}")
        return False
    except Exception as e:
        logger.error(f"[PRINT-TCP] Error enviando a {ip}:{puerto}: {e}")
        return False


# ---------------------------------------------------------------------------
# Vía B: PDF con ReportLab → carpeta compartida
# ---------------------------------------------------------------------------

def _generar_pdf_palet(datos: dict, ruta_pdf: str) -> bool:
    """
    Genera un PDF de la etiqueta de palet (110x210mm) y lo guarda en ruta_pdf.
    Usa ReportLab. Devuelve True si se guardó correctamente.
    """
    try:
        from reportlab.pdfgen import canvas
        from reportlab.lib.units import mm
        from reportlab.lib import colors
        from reportlab.graphics.barcode import code128

        sscc        = datos.get('sscc', '').replace(' ', '')
        cod_art     = datos.get('cod_articulo', '')
        nombre      = (datos.get('nombre', '') or '')[:50]
        lote        = datos.get('lote', '') or '—'
        fecha_cad   = _format_date_etiqueta(datos.get('fecha_caducidad')) or '—'

        W = 110 * mm   # Ancho
        H = 210 * mm   # Alto

        c = canvas.Canvas(ruta_pdf, pagesize=(W, H))
        c.setTitle(f"Etiqueta Palet SSCC {sscc}")

        # --- Marco exterior ---
        c.setLineWidth(1.5)
        c.rect(3*mm, 3*mm, W - 6*mm, H - 6*mm)

        # --- REFERENCIA ---
        c.setFont("Helvetica", 7)
        c.drawString(5*mm, H - 12*mm, "REFERENCIA")
        c.setFont("Helvetica-Bold", 22)
        c.drawString(5*mm, H - 26*mm, cod_art)

        # --- DESCRIPCIÓN ---
        c.setFont("Helvetica", 7)
        c.drawString(5*mm, H - 35*mm, "DESCRIPCIÓN")
        c.setFont("Helvetica-Bold", 10)
        # Texto largo que puede necesitar ajuste
        c.drawString(5*mm, H - 43*mm, nombre)

        # --- Línea separadora 1 ---
        c.setLineWidth(0.8)
        c.line(3*mm, H - 48*mm, W - 3*mm, H - 48*mm)

        # --- LOTE ---
        c.setFont("Helvetica", 7)
        c.drawString(5*mm, H - 57*mm, "LOTE")
        c.setFont("Helvetica-Bold", 14)
        c.drawString(5*mm, H - 67*mm, lote)

        # --- FECHA CADUCIDAD ---
        c.setFont("Helvetica", 7)
        c.drawString(58*mm, H - 57*mm, "FECHA CADUCIDAD")
        c.setFont("Helvetica-Bold", 14)
        c.drawString(58*mm, H - 67*mm, fecha_cad)

        # --- Línea separadora 2 ---
        c.line(3*mm, H - 73*mm, W - 3*mm, H - 73*mm)

        # --- Código de barras EAN-128 SSCC ---
        if sscc:
            try:
                barcode = code128.Code128(
                    sscc,
                    barWidth=0.6*mm,
                    barHeight=30*mm,
                    humanReadable=True
                )
                # Centrar el código de barras horizontalmente
                bc_w = barcode.width
                x_center = (W - bc_w) / 2
                barcode.drawOn(c, x_center, H - 115*mm)
            except Exception as be:
                logger.warning(f"[PRINT-PDF] Error generando barcode: {be}")
                c.setFont("Helvetica-Bold", 10)
                c.drawCentredString(W/2, H - 100*mm, sscc)

        # --- Texto SSCC legible ---
        sscc_leg = f"(00) {sscc}" if sscc else ''
        c.setFont("Helvetica", 7)
        c.drawCentredString(W/2, H - 120*mm, sscc_leg)

        c.save()
        logger.info(f"[PRINT-PDF] Etiqueta generada: {ruta_pdf}")
        return True

    except ImportError:
        logger.error("[PRINT-PDF] ReportLab no instalado. Ejecuta: pip install reportlab")
        return False
    except Exception as e:
        logger.error(f"[PRINT-PDF] Error generando PDF: {e}", exc_info=True)
        return False


def _guardar_pdf_en_cola(datos: dict) -> dict:
    """
    Genera el PDF y lo guarda en la carpeta de cola de impresión.
    El nombre del fichero incluye timestamp + SSCC para unicidad.
    """
    try:
        folder = Path(PDF_FOLDER)
        folder.mkdir(parents=True, exist_ok=True)

        ts = datetime.datetime.now().strftime('%Y%m%d_%H%M%S_%f')
        sscc = (datos.get('sscc') or 'SSCC').replace(' ', '')
        filename = f"etiq_palet_{ts}_{sscc}.pdf"
        ruta_pdf = str(folder / filename)

        ok = _generar_pdf_palet(datos, ruta_pdf)
        if ok:
            return {'ok': True, 'mensaje': f"PDF generado en cola: {filename}", 'fichero': ruta_pdf}
        else:
            return {'ok': False, 'mensaje': 'Error al generar el PDF de la etiqueta.'}
    except Exception as e:
        logger.error(f"[PRINT-PDF] Error al guardar en cola: {e}", exc_info=True)
        return {'ok': False, 'mensaje': f"Error al guardar PDF: {e}"}


# ---------------------------------------------------------------------------
# Punto de entrada principal
# ---------------------------------------------------------------------------

def imprimir_etiqueta_palet(codterminal: int, datos: dict) -> dict:
    """
    Función principal. Decide la vía según si la impresora tiene IP:
      - Con IP  → Intermec Direct Protocol vía TCP
      - Sin IP  → PDF en carpeta de cola para agente Windows

    Returns:
        dict con 'ok': bool, 'mensaje': str y opcionalmente 'fichero': str
    """
    ip = get_printer_ip(codterminal)

    if ip:
        logger.info(f"[PRINT] Terminal {codterminal} → IP {ip} → modo TCP/DP")
        ok = _enviar_dp_tcp(ip, datos)
        if ok:
            return {'ok': True, 'mensaje': f"Etiqueta enviada a impresora {ip} (Direct Protocol)"}
        else:
            # Fallback: si falla el TCP, generar PDF igualmente
            logger.warning(f"[PRINT] Fallo TCP a {ip}. Fallback a PDF.")
            res = _guardar_pdf_en_cola(datos)
            res['mensaje'] = f"[Fallo TCP → Fallback PDF] {res['mensaje']}"
            return res
    else:
        logger.info(f"[PRINT] Terminal {codterminal} → sin IP → modo PDF")
        return _guardar_pdf_en_cola(datos)
