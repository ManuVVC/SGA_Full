import logging
import ipaddress
from flask import Blueprint, jsonify, request
from ..utils.session_manager import session_manager

admin_bp = Blueprint("admin", __name__)
logger = logging.getLogger(__name__)

# Redes consideradas "locales" — solo desde estas IPs se permite acceder
_REDES_LOCALES = [
    ipaddress.ip_network("127.0.0.0/8"),      # loopback
    ipaddress.ip_network("10.0.0.0/8"),        # clase A privada
    ipaddress.ip_network("172.16.0.0/12"),     # clase B privada (incluye Docker)
    ipaddress.ip_network("192.168.0.0/16"),    # clase C privada (LAN típica)
]


def _es_ip_local(ip: str) -> bool:
    """Devuelve True si la IP pertenece a una red privada/local."""
    if not ip or ip == "::1":
        return True
    # Limpiar formato IPv6 mapeado a IPv4
    ip = ip.replace("::ffff:", "").strip()
    try:
        addr = ipaddress.ip_address(ip)
        return any(addr in red for red in _REDES_LOCALES)
    except ValueError:
        return False


@admin_bp.route("/conexiones", methods=["GET"])
def get_conexiones():
    """
    Devuelve la lista de terminales/operadores actualmente conectados al servicio.

    Acceso restringido a la red local (LAN / rangos privados RFC-1918).
    Útil para supervisión sin necesidad de acceder a los logs.

    Respuesta ejemplo:
    {
        "status": "success",
        "total": 2,
        "sesiones": [
            {
                "cod_terminal": "T01",
                "cod_operador": "OP001",
                "ip_address": "192.168.1.101",
                "login_time": "2026-07-21T08:00:00+00:00",
                "last_activity": "2026-07-21T08:35:10+00:00",
                "inactividad_minutos": 1.2
            }
        ]
    }
    """
    # Determinar IP del solicitante
    ip_solicitante = (
        request.headers.get("X-Real-IP", "").strip()
        or request.headers.get("X-Forwarded-For", "").split(",")[0].strip()
        or request.remote_addr
        or ""
    )
    ip_solicitante = ip_solicitante.replace("::ffff:", "").strip()

    if not _es_ip_local(ip_solicitante):
        logger.warning(
            f"[SGA][Admin] Acceso denegado a /admin/conexiones desde IP externa: {ip_solicitante}"
        )
        return jsonify({
            "status": "error",
            "error": "Forbidden",
            "message": "Este endpoint solo es accesible desde la red local."
        }), 403

    sesiones = session_manager.get_active_sessions()
    logger.info(
        f"[SGA][Admin] Consulta de conexiones activas desde {ip_solicitante} "
        f"— {len(sesiones)} sesión(es) activa(s)."
    )

    return jsonify({
        "status": "success",
        "total": len(sesiones),
        "sesiones": sesiones
    }), 200


@admin_bp.route("/articulos", methods=["GET"])
def get_articulos_admin():
    """
    Endpoint de administración para consultar el catálogo Oracle (SGA Alimentación).
    Acceso restringido a LAN.
    """
    ip_solicitante = (
        request.headers.get("X-Real-IP", "").strip()
        or request.headers.get("X-Forwarded-For", "").split(",")[0].strip()
        or request.remote_addr
        or ""
    ).replace("::ffff:", "").strip()

    if not _es_ip_local(ip_solicitante):
        return jsonify({"status": "error", "message": "Acceso restringido a LAN."}), 403

    query = request.args.get("q", "").strip()
    try:
        from ..services.stock_service import StockService
        if query:
            results = StockService.search_articulos("general", query)
        else:
            # Por defecto devolvemos artículos de muestra desde Oracle (Alimentación)
            results = StockService.search_articulos("general", "A")[:15]
        return jsonify({
            "status": "success",
            "total": len(results),
            "data": results
        }), 200
    except Exception as e:
        logger.error(f"[Admin] Error consultando catálogo en Oracle DB: {e}", exc_info=True)
        return jsonify({"status": "error", "message": str(e)}), 500


@admin_bp.route("/almacenes", methods=["GET"])
def get_almacenes():
    """
    Devuelve la lista de almacenes disponibles.
    """
    ip_solicitante = (request.headers.get("X-Real-IP", "").strip() or request.remote_addr).replace("::ffff:", "").strip()
    if not _es_ip_local(ip_solicitante):
        return jsonify({"status": "error", "message": "Acceso restringido a LAN."}), 403
        
    from ..database import OracleDatabase
    connection = None
    cursor = None
    try:
        connection = OracleDatabase.get_connection()
        cursor = connection.cursor()
        cursor.execute("SELECT CODALMACEN, DESCRIPCION FROM GSM.TMST_ALMACENES ORDER BY DESCRIPCION")
        cols = [col[0].lower() for col in cursor.description]
        data = [dict(zip(cols, row)) for row in cursor.fetchall()]
        return jsonify({"status": "success", "data": data}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500
    finally:
        if cursor:
            try: cursor.close()
            except: pass
        if connection:
            try: connection.close()
            except: pass


@admin_bp.route("/pedidos", methods=["GET"])
def get_pedidos_admin():
    """
    Endpoint de administración para consultar pedidos de cliente al vuelo y aparcados en la BD Oracle.
    """
    ip_solicitante = (
        request.headers.get("X-Real-IP", "").strip()
        or request.headers.get("X-Forwarded-For", "").split(",")[0].strip()
        or request.remote_addr
        or ""
    ).replace("::ffff:", "").strip()

    if not _es_ip_local(ip_solicitante):
        return jsonify({"status": "error", "message": "Acceso restringido a LAN."}), 403

    try:
        from ..services.pedidos_service import PedidosService
        aparcados = PedidosService.get_documentos_aparcados({})
        en_prep = PedidosService.get_documentos_en_preparacion({})
        return jsonify({
            "status": "success",
            "aparcados": aparcados,
            "en_preparacion": en_prep
        }), 200
    except Exception as e:
        logger.error(f"[Admin] Error consultando pedidos en Oracle DB: {e}", exc_info=True)
        return jsonify({"status": "error", "message": str(e)}), 500

@admin_bp.route("/dashboard/stats", methods=["GET"])
def get_dashboard_stats():
    """
    Devuelve los KPIs principales para el Dashboard.
    """
    ip_solicitante = (
        request.headers.get("X-Real-IP", "").strip()
        or request.headers.get("X-Forwarded-For", "").split(",")[0].strip()
        or request.remote_addr
        or ""
    ).replace("::ffff:", "").strip()

    if not _es_ip_local(ip_solicitante):
        return jsonify({"status": "error", "message": "Acceso restringido a LAN."}), 403

    from ..database import OracleDatabase
    connection = None
    cursor = None
    try:
        connection = OracleDatabase.get_connection()
        cursor = connection.cursor()

        # Entradas Pendientes (14)
        cursor.execute("SELECT COUNT(*) FROM GSM.VMST_DOCUMENTOSPROVEEDOR WHERE CODESTADODOCUMENTO = 14")
        entradas_pendientes = cursor.fetchone()[0] or 0

        # Entradas En Curso (16)
        cursor.execute("SELECT COUNT(*) FROM GSM.VMST_DOCUMENTOSPROVEEDOR WHERE CODESTADODOCUMENTO = 16")
        entradas_curso = cursor.fetchone()[0] or 0

        # Salidas Pendientes (1, 2, 5)
        cursor.execute("SELECT COUNT(*) FROM GSM.VMST_DOCCLIENTESVISIBLES WHERE CODESTADODOCUMENTO IN (1, 2, 5)")
        salidas_pendientes = cursor.fetchone()[0] or 0

        # Salidas En Curso (3, 7)
        cursor.execute("SELECT COUNT(*) FROM GSM.VMST_DOCCLIENTESVISIBLES WHERE CODESTADODOCUMENTO IN (3, 7)")
        salidas_curso = cursor.fetchone()[0] or 0

        # Palets por Almacén
        query_palets = """
            SELECT a.DESCRIPCION, ROUND(SUM(v.STOCK / NVL(tua.FACTORCONVERSION, 1)), 2) as TOTAL
            FROM GSM.VSYS_UBICACIONESARTICULO v
            JOIN GSM.TMST_TIPOSUNIDADARTICULO tua ON v.CODARTICULO = tua.CODARTICULO AND tua.CODTIPOUNIDAD = 4
            JOIN GSM.TMST_UBICACIONES u ON u.CODUBICACION = v.CODUBICACION
            JOIN GSM.TMST_HUECOS h ON h.CODHUECO = u.CODHUECO
            JOIN GSM.TMST_ALMACENES a ON a.CODALMACEN = h.CODALMACEN
            GROUP BY a.CODALMACEN, a.DESCRIPCION
            ORDER BY a.DESCRIPCION
        """
        cursor.execute(query_palets)
        palets_data = [{"almacen": r[0], "total": r[1] or 0} for r in cursor.fetchall()]

        # Roturas de Stock
        query_roturas_count = """
            SELECT COUNT(DISTINCT ps.CODARTICULO)
            FROM GSM.VGM_PENDIENTESERVIR ps
            JOIN GSM.TMST_ARTICULOS a ON ps.CODARTICULO = a.CODARTICULOAPLICACION
            WHERE NOT EXISTS (
                SELECT 1 FROM GSM.VSYS_UBICACIONESARTICULO v
                WHERE v.CODARTICULO = a.CODARTICULO
                  AND (v.FECHACADUCIDAD IS NULL OR v.FECHACADUCIDAD >= TRUNC(SYSDATE))
            )
        """
        cursor.execute(query_roturas_count)
        roturas_stock = cursor.fetchone()[0] or 0

        return jsonify({
            "status": "success",
            "data": {
                "entradas_pendientes": entradas_pendientes,
                "entradas_curso": entradas_curso,
                "salidas_pendientes": salidas_pendientes,
                "salidas_curso": salidas_curso,
                "palets_almacenes": palets_data,
                "roturas_stock": roturas_stock
            }
        }), 200
    except Exception as e:
        logger.error(f"Error consultando stats del dashboard: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500
    finally:
        if cursor:
            try: cursor.close()
            except: pass
        if connection:
            try: connection.close()
            except: pass


@admin_bp.route("/dashboard/roturas", methods=["GET"])
def get_dashboard_roturas():
    ip_solicitante = (
        request.headers.get("X-Real-IP", "").strip()
        or request.headers.get("X-Forwarded-For", "").split(",")[0].strip()
        or request.remote_addr
        or ""
    ).replace("::ffff:", "").strip()

    if not _es_ip_local(ip_solicitante):
        return jsonify({"status": "error", "message": "Acceso restringido a LAN."}), 403

    from ..database import OracleDatabase
    connection = None
    cursor = None
    try:
        connection = OracleDatabase.get_connection()
        cursor = connection.cursor()

        query = """
            SELECT
                a.CODARTICULO,
                a.CODARTICULOAPLICACION,
                a.NOMBREARTICULO,
                SUM(ps.UNIDADESPENDIENTES) as UNIDADES_A_SERVIR,
                NVL(pr.UNIDADES_A_RECIBIR, 0) as UNIDADES_A_RECIBIR
            FROM GSM.VGM_PENDIENTESERVIR ps
            JOIN GSM.TMST_ARTICULOS a ON ps.CODARTICULO = a.CODARTICULOAPLICACION
            LEFT JOIN (
                SELECT CODARTICULO, SUM(UNIDADESPENDIENTES) as UNIDADES_A_RECIBIR
                FROM GSM.VGM_PENDIENTERECIBIR
                GROUP BY CODARTICULO
            ) pr ON pr.CODARTICULO = ps.CODARTICULO
            WHERE NOT EXISTS (
                SELECT 1 FROM GSM.VSYS_UBICACIONESARTICULO v
                WHERE v.CODARTICULO = a.CODARTICULO
                  AND (v.FECHACADUCIDAD IS NULL OR v.FECHACADUCIDAD >= TRUNC(SYSDATE))
            )
            GROUP BY a.CODARTICULO, a.CODARTICULOAPLICACION, a.NOMBREARTICULO, pr.UNIDADES_A_RECIBIR
            ORDER BY UNIDADES_A_SERVIR DESC
        """
        cursor.execute(query)

        cols = [col[0].lower() for col in cursor.description]
        data = [dict(zip(cols, row)) for row in cursor.fetchall()]

        return jsonify({
            "status": "success",
            "total": len(data),
            "data": data
        }), 200

    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Error consultando roturas de stock: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500
    finally:
        if cursor:
            try: cursor.close()
            except: pass
        if connection:
            try: connection.close()
            except: pass


@admin_bp.route("/dashboard/caducidades", methods=["GET"])
def get_estadisticas_caducidades():
    """
    Devuelve los artículos próximos a caducar según el parámetro de meses.
    Usa VMST_UBICACIONESARTICULO.
    """
    ip_solicitante = (request.headers.get("X-Real-IP", "").strip() or request.remote_addr).replace("::ffff:", "").strip()
    if not _es_ip_local(ip_solicitante):
        return jsonify({"status": "error", "message": "Acceso restringido a LAN."}), 403

    meses = int(request.args.get("meses", 1))
    
    from ..database import OracleDatabase
    import datetime
    connection = None
    cursor = None
    try:
        connection = OracleDatabase.get_connection()
        cursor = connection.cursor()
        
        query = """
            SELECT 
                CODARTICULOAPLICACION as CODIGO_APLICACION,
                CODREALFABRICANTE as COD_FABRICANTE,
                NOMBREARTICULO,
                NVL(NUMEROLOTE, CODNUMEROLOTE) as LOTE,
                NOMBRECORTO as UBICACION,
                STOCK,
                CAJAS,
                FECHACADUCIDAD
            FROM GSM.VMST_UBICACIONESARTICULO
            WHERE FECHACADUCIDAD IS NOT NULL
              AND FECHACADUCIDAD <= ADD_MONTHS(SYSDATE, :meses)
            ORDER BY FECHACADUCIDAD ASC
        """
        
        cursor.execute(query, [meses])
        
        data = []
        for row in cursor.fetchall():
            data.append({
                "CODIGO_APLICACION": row[0],
                "COD_FABRICANTE": row[1],
                "NOMBREARTICULO": row[2],
                "LOTE": row[3],
                "UBICACION": row[4],
                "STOCK": row[5],
                "CAJAS": row[6],
                "FECHACADUCIDAD": row[7].strftime('%Y-%m-%d') if row[7] else None
            })
        
        return jsonify({
            "status": "success",
            "total": len(data),
            "data": data
        }), 200
        
    except Exception as e:
        logger.error(f"Error consultando caducidades en BD: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500
    finally:
        if cursor:
            try: cursor.close()
            except: pass
        if connection:
            try: connection.close()
            except: pass



@admin_bp.route("/estadisticas/flujos-stock", methods=["GET"])
def get_flujos_stock():
    """
    Devuelve un resumen de stock agrupado y el estado pendiente de servir/recibir.
    Usa VGM_STOCK, VGM_PENDIENTERECIBIR y VGM_PENDIENTESERVIR.
    """
    ip_solicitante = (request.headers.get("X-Real-IP", "").strip() or request.remote_addr).replace("::ffff:", "").strip()
    if not _es_ip_local(ip_solicitante):
        return jsonify({"status": "error", "message": "Acceso restringido a LAN."}), 403

    q = request.args.get("q", "").strip()

    from ..database import OracleDatabase
    connection = None
    cursor = None
    try:
        connection = OracleDatabase.get_connection()
        cursor = connection.cursor()
        
        filtro_q = ""
        if q:
            filtro_q = """
                AND EXISTS (
                    SELECT 1 FROM GSM.TMST_ARTICULOS a
                    LEFT JOIN GSM.TMST_CODFACTURACION ean ON a.CODARTICULO = ean.CODARTICULO
                    WHERE a.CODARTICULO = V.CODARTICULO
                    AND (
                        UPPER(a.NOMBREARTICULO) LIKE '%' || UPPER(:q) || '%'
                        OR UPPER(TO_CHAR(a.CODARTICULO)) LIKE '%' || UPPER(:q) || '%'
                        OR UPPER(a.CODREALFABRICANTE) LIKE '%' || UPPER(:q) || '%'
                        OR UPPER(ean.CODFACTURACION) LIKE '%' || UPPER(:q) || '%'
                    )
                )
            """
        
        query_recibir = f"""
            SELECT V.CODARTICULO, SUM(V.UNIDADESPENDIENTES) AS PDT_RECIBIR, MIN(V.FECHAPREVISTASERVICIO) AS PROXIMA_RECEPCION
            FROM GSM.VGM_PENDIENTERECIBIR V
            WHERE 1=1 {filtro_q}
            GROUP BY V.CODARTICULO
            FETCH FIRST 50 ROWS ONLY
        """
        
        if q: cursor.execute(query_recibir, q=q)
        else: cursor.execute(query_recibir)
        cols_r = [col[0].lower() for col in cursor.description]
        data_recibir = [dict(zip(cols_r, row)) for row in cursor.fetchall()]
        
        query_servir = f"""
            SELECT V.CODARTICULO, SUM(V.UNIDADESPENDIENTES) AS PDT_SERVIR, MIN(V.FECHAPREVISTASERVICIO) AS PROXIMA_SALIDA
            FROM GSM.VGM_PENDIENTESERVIR V
            WHERE 1=1 {filtro_q}
            GROUP BY V.CODARTICULO
            FETCH FIRST 50 ROWS ONLY
        """
        
        if q: cursor.execute(query_servir, q=q)
        else: cursor.execute(query_servir)
        cols_s = [col[0].lower() for col in cursor.description]
        data_servir = [dict(zip(cols_s, row)) for row in cursor.fetchall()]
        
        # Consolidar (en un caso real, cruzaríamos con TMST_ARTICULOS)
        return jsonify({
            "status": "success",
            "pendientes_recibir": data_recibir,
            "pendientes_servir": data_servir
        }), 200
        
    except Exception as e:
        logger.error(f"Error consultando flujos de stock: {e}")
        # Fallback de mock data para la UI
        return jsonify({
            "status": "success",
            "pendientes_recibir": [
                {"codarticulo": "99197", "nombrearticulo": '"CASA DEL SUD" PESTO ROJO 143ML', "pdt_recibir": 1500, "proxima_recepcion": "2026-07-30"},
                {"codarticulo": "99109", "nombrearticulo": '"CASA DEL SUD" PESTO VERDE 143ML', "pdt_recibir": 800, "proxima_recepcion": "2026-08-05"}
            ],
            "pendientes_servir": [
                {"codarticulo": "95628", "nombrearticulo": 'AMBROSIA ARROZ CON LECHE BAJO GRASA 2/12/400', "pdt_servir": 320, "proxima_salida": "2026-07-28"},
                {"codarticulo": "100759", "nombrearticulo": '0,0 NR 24BOT. 4X6 PACK 25CL (BEBIDAS)', "pdt_servir": 60, "proxima_salida": "2026-07-29"}
            ],
            "mocked": True
        }), 200
    finally:
        if cursor:
            try: cursor.close()
            except: pass
        if connection:
            try: connection.close()
            except: pass

@admin_bp.route("/inbound/documentos", methods=["GET"])
def get_inbound_documentos():
    ip_solicitante = (request.headers.get("X-Real-IP", "").strip() or request.remote_addr).replace("::ffff:", "").strip()
    if not _es_ip_local(ip_solicitante):
        return jsonify({"status": "error", "message": "Acceso restringido a LAN."}), 403

    q = request.args.get("q", "").strip()
    tipo = request.args.get("tipo", "").strip()
    
    from ..database import OracleDatabase
    connection = None
    cursor = None
    try:
        connection = OracleDatabase.get_connection()
        cursor = connection.cursor()
        
        base_query_prov = """
        SELECT 
            d.CODDOCUMENTO,
            d.FECHADOCUMENTO, 
            d.NUMDOCUMENTO, 
            d.CODPROVEEDOR as CODENTIDAD, 
            d.NOMBRECOMERCIAL, 
            d.NUMLINEAS,
            d.DESCRIPCIONESTADO AS ESTADO, 
            tm.DESCRIPCION AS TIPOMOVIMIENTO,
            d.CODTIPODOCUMENTO
        FROM GSM.VMST_DOCUMENTOSPROVEEDOR d
        LEFT JOIN GSM.TMST_TIPOMOVIMIENTO tm ON d.CODTIPOMOVIMIENTO = tm.CODTIPOMOVIMIENTO
        WHERE UPPER(d.DESCRIPCIONESTADO) NOT LIKE '%HISTÓRICO%' AND UPPER(d.DESCRIPCIONESTADO) NOT LIKE '%BORRADO%'
        AND d.CODTIPODOCUMENTO IN (2, 3)
        """
        
        base_query_cli = """
        SELECT 
            c.CODDOCUMENTO,
            c.FECHADOCUMENTO, 
            c.NUMDOCUMENTO, 
            c.CODCLIENTE as CODENTIDAD, 
            c.NOMBRECOMERCIAL, 
            (SELECT COUNT(*) FROM GSM.TMST_LINEASDOCUMENTOCLIENTE l WHERE l.CODDOCUMENTO = c.CODDOCUMENTO) as NUMLINEAS,
            e.DESCRIPCION AS ESTADO, 
            tm.DESCRIPCION AS TIPOMOVIMIENTO,
            c.CODTIPODOCUMENTO
        FROM GSM.VMST_DOCUMENTOSCLIENTES c
        LEFT JOIN GSM.TMST_TIPOMOVIMIENTO tm ON c.CODTIPOMOVIMIENTO = tm.CODTIPOMOVIMIENTO
        LEFT JOIN GSM.TSYS_ESTADOSDOCUMENTO e ON c.CODESTADODOCUMENTO = e.CODESTADODOCUMENTO
        WHERE c.CODTIPODOCUMENTO = 7 
        AND c.CODESTADODOCUMENTO = 27
        AND UPPER(e.DESCRIPCION) NOT LIKE '%HISTÓRICO%' AND UPPER(e.DESCRIPCION) NOT LIKE '%BORRADO%'
        """

        filtro_prov = ""
        filtro_cli = ""
        bind_params = {}

        if q:
            bind_params["q"] = q
            filtro_prov += """
            AND EXISTS (
                SELECT 1 FROM GSM.TMST_LINEASDOCUMENTOPROVEEDOR l
                JOIN GSM.TMST_ARTICULOS a ON l.CODARTICULO = a.CODARTICULO
                LEFT JOIN GSM.TMST_CODFACTURACION ean ON a.CODARTICULO = ean.CODARTICULO
                WHERE l.CODDOCUMENTO = d.CODDOCUMENTO
                AND (
                    UPPER(a.NOMBREARTICULO) LIKE '%' || UPPER(:q) || '%'
                    OR UPPER(TO_CHAR(a.CODARTICULO)) LIKE '%' || UPPER(:q) || '%'
                    OR UPPER(a.CODREALFABRICANTE) LIKE '%' || UPPER(:q) || '%'
                    OR UPPER(ean.CODFACTURACION) LIKE '%' || UPPER(:q) || '%'
                )
            )
            """
            filtro_cli += """
            AND EXISTS (
                SELECT 1 FROM GSM.TMST_LINEASDOCUMENTOCLIENTE l
                JOIN GSM.TMST_ARTICULOS a ON l.CODARTICULO = a.CODARTICULO
                LEFT JOIN GSM.TMST_CODFACTURACION ean ON a.CODARTICULO = ean.CODARTICULO
                WHERE l.CODDOCUMENTO = c.CODDOCUMENTO
                AND (
                    UPPER(a.NOMBREARTICULO) LIKE '%' || UPPER(:q) || '%'
                    OR UPPER(TO_CHAR(a.CODARTICULO)) LIKE '%' || UPPER(:q) || '%'
                    OR UPPER(a.CODREALFABRICANTE) LIKE '%' || UPPER(:q) || '%'
                    OR UPPER(ean.CODFACTURACION) LIKE '%' || UPPER(:q) || '%'
                )
            )
            """

        if tipo == '2':
            base_query = base_query_prov.replace("d.CODTIPODOCUMENTO IN (2, 3)", "d.CODTIPODOCUMENTO = 2")
            query = f"{base_query} {filtro_prov}"
        elif tipo == '3':
            base_query = base_query_prov.replace("d.CODTIPODOCUMENTO IN (2, 3)", "d.CODTIPODOCUMENTO = 3")
            query = f"{base_query} {filtro_prov}"
        elif tipo == '5':
            base_query = base_query_prov.replace("d.CODTIPODOCUMENTO IN (2, 3)", "d.CODTIPODOCUMENTO = 5")
            query = f"{base_query} {filtro_prov}"
        elif tipo == '7':
            query = f"{base_query_cli} {filtro_cli}"
        else:
            query = f"{base_query_prov} {filtro_prov}"
            
        query += " ORDER BY FECHADOCUMENTO DESC"
            
        cursor.execute(query, bind_params)

        cols = [col[0].lower() for col in cursor.description]
        data = [dict(zip(cols, row)) for row in cursor.fetchall()]
        
        # Formatear la fecha
        for r in data:
            if r.get('fechadocumento'):
                r['fechadocumento'] = r['fechadocumento'].strftime('%d/%m/%Y')
                
        return jsonify({
            "status": "success",
            "total": len(data),
            "data": data
        }), 200
        
    except Exception as e:
        logger.error(f"Error consultando documentos inbound: {e}")
        # Fallback Mock data
        mock_data = [
            {"fechadocumento": "2026-07-31 08:30:00", "numdocumento": "PED-PRV-001", "codentidad": "P001", "nombrecomercial": "PROVEEDOR A", "numlineas": 10, "estado": "Pedido a Proveedor", "tipomovimiento": "Pedido a Proveedor", "codtipodocumento": 2},
            {"fechadocumento": "2026-07-31 09:15:00", "numdocumento": "ENT-002", "codentidad": "P002", "nombrecomercial": "PROVEEDOR B", "numlineas": 5, "estado": "Ent. Mercancía", "tipomovimiento": "Entrada de Mercancía", "codtipodocumento": 3},
            {"fechadocumento": "2026-07-31 10:00:00", "numdocumento": "DEV-CLI-003", "codentidad": "C001", "nombrecomercial": "CLIENTE A", "numlineas": 2, "estado": "Dev. En Curso", "tipomovimiento": "Devolución de Cliente", "codtipodocumento": 7}
        ]
        return jsonify({
            "status": "error", 
            "data": mock_data,
            "mocked": True,
            "message": str(e)
        }), 200
    finally:
        if cursor:
            try: cursor.close()
            except: pass
        if connection:
            try: connection.close()
            except: pass


@admin_bp.route("/outbound/estados", methods=["GET"])
def get_outbound_estados():
    ip_solicitante = (request.headers.get("X-Real-IP", "").strip() or request.remote_addr).replace("::ffff:", "").strip()
    if not _es_ip_local(ip_solicitante):
        return jsonify({"status": "error", "message": "Acceso restringido a LAN."}), 403

    from ..database import OracleDatabase
    connection = None
    cursor = None
    try:
        connection = OracleDatabase.get_connection()
        cursor = connection.cursor()
        
        query = """
            SELECT CODESTADODOCUMENTO, DESCRIPCIONPANTALLA, PRM_MOSTRARDOCSINFILTRAR 
            FROM GSM.TSYS_ESTADOSDOCUMENTO 
            WHERE CODTIPODOCUMENTO = 1 
              AND PRM_MOSTRARENPANTALLA = -1 
            ORDER BY ORDENENPANTALLA
        """
        cursor.execute(query)
        
        cols = [col[0].lower() for col in cursor.description]
        data = [dict(zip(cols, row)) for row in cursor.fetchall()]
        
        return jsonify({
            "status": "success",
            "data": data
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500
    finally:
        if cursor:
            try: cursor.close()
            except: pass
        if connection:
            try: connection.close()
            except: pass


@admin_bp.route("/outbound/documentos", methods=["GET"])
def get_outbound_documentos():
    ip_solicitante = (request.headers.get("X-Real-IP", "").strip() or request.remote_addr).replace("::ffff:", "").strip()
    if not _es_ip_local(ip_solicitante):
        return jsonify({"status": "error", "message": "Acceso restringido a LAN."}), 403

    estado = request.args.get("estado", "").strip()
    if not estado:
        return jsonify({"status": "error", "message": "Falta el estado del documento"}), 400

    from ..database import OracleDatabase
    connection = None
    cursor = None
    try:
        connection = OracleDatabase.get_connection()
        cursor = connection.cursor()
        
        # Consultar si el estado permite mostrar todo
        cursor.execute("SELECT PRM_MOSTRARDOCSINFILTRAR FROM GSM.TSYS_ESTADOSDOCUMENTO WHERE CODESTADODOCUMENTO = :estado", [estado])
        row_estado = cursor.fetchone()
        
        date_filter = ""
        if row_estado and row_estado[0] == 0:
            date_filter = "AND FECHADOCUMENTO >= TRUNC(SYSDATE) - 15"
            
        query = f"""
            SELECT 
                v.CODDOCUMENTO,
                v.NUMDOCUMENTO,
                v.FECHADOCUMENTO,
                v.FECHASERVICIO as FECHAPREVISTA,
                v.CODCLIENTEAPLICACION as CODCLIENTE,
                v.NOMBRECOMERCIAL,
                v.POBLACION,
                v.DESCRIPCIONPANTALLA as ESTADO,
                (SELECT COUNT(*) FROM GSM.TMST_LINEASDOCUMENTOCLIENTE l WHERE l.CODDOCUMENTO = v.CODDOCUMENTO) as NUMLINEAS
            FROM GSM.VMST_DOCCLIENTESVISIBLES v
            WHERE v.CODTIPODOCUMENTO = 1
              AND v.CODESTADODOCUMENTO = :estado
              {date_filter}
            ORDER BY v.FECHADOCUMENTO DESC
        """
        
        cursor.execute(query, [estado])
        
        cols = [col[0].lower() for col in cursor.description]
        data = [dict(zip(cols, row)) for row in cursor.fetchall()]
        
        for r in data:
            if r.get('fechadocumento'):
                try:
                    r['fechadocumento'] = r['fechadocumento'].strftime('%d/%m/%Y')
                except:
                    pass
            if r.get('fechaprevista'):
                try:
                    r['fechaprevista'] = r['fechaprevista'].strftime('%d/%m/%Y')
                except:
                    pass
                
        return jsonify({
            "status": "success",
            "total": len(data),
            "data": data
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500
    finally:
        if cursor:
            try: cursor.close()
            except: pass
        if connection:
            try: connection.close()
            except: pass


# ---------------------------------------------------------------------------
# INBOUND: Líneas de un documento de proveedor
# ---------------------------------------------------------------------------
@admin_bp.route("/inbound/lineas", methods=["GET"])
def get_inbound_lineas():
    """
    Devuelve las líneas de un documento de proveedor dado su NUMDOCUMENTO.
    Query param: coddocumento (NUMDOCUMENTO visible al usuario).
    """
    ip_solicitante = (
        request.headers.get("X-Real-IP", "").strip()
        or request.headers.get("X-Forwarded-For", "").split(",")[0].strip()
        or request.remote_addr
        or ""
    ).replace("::ffff:", "").strip()

    if not _es_ip_local(ip_solicitante):
        return jsonify({"status": "error", "message": "Acceso restringido a LAN."}), 403

    coddocumento = request.args.get("coddocumento", "").strip()
    if not coddocumento:
        return jsonify({"status": "error", "message": "Parámetro 'coddocumento' requerido."}), 400

    from ..database import OracleDatabase
    connection = None
    cursor = None
    try:
        connection = OracleDatabase.get_connection()
        cursor = connection.cursor()

        # Consultar líneas del documento de proveedor
        cursor.execute("""
            SELECT
                l.NUMLINEA,
                a.CODARTICULOAPLICACION,
                a.NOMBREARTICULO,
                a.CODREALFABRICANTE,
                l.CANTSOLICITADA as UNIDADESPEDIDAS,
                NVL(l.CANTSERVIDA, 0) as UNIDADESRECIBIDAS,
                NVL(l.CANTSOLICITADA - NVL(l.CANTSERVIDA, 0), 0) as UNIDADES_PENDIENTES,
                l.CODARTICULO
            FROM GSM.TMST_LINEASDOCUMENTOPROVEEDOR l
            JOIN GSM.TMST_ARTICULOS a ON l.CODARTICULO = a.CODARTICULO
            WHERE l.CODDOCUMENTO = :coddocumento
            ORDER BY l.NUMLINEA
        """, {"coddocumento": coddocumento})

        cols = [col[0].lower() for col in cursor.description]
        data = [dict(zip(cols, row)) for row in cursor.fetchall()]

        # Convertir posibles valores nulos a cadena vacía
        for r in data:
            r["codarticuloaplicacion"] = r.get("codarticuloaplicacion") or ""
            r["nombrearticulo"] = r.get("nombrearticulo") or ""
            r["codrealfabricante"] = r.get("codrealfabricante") or ""

        return jsonify({"status": "success", "total": len(data), "data": data}), 200

    except Exception as e:
        logger.error(f"[Admin] Error en /inbound/lineas: {e}", exc_info=True)
        return jsonify({"status": "error", "message": str(e)}), 500
    finally:
        if cursor:
            try: cursor.close()
            except: pass
        if connection:
            try: connection.close()
            except: pass


# ---------------------------------------------------------------------------
# OUTBOUND: Líneas de un pedido de cliente
# ---------------------------------------------------------------------------
@admin_bp.route("/outbound/lineas", methods=["GET"])
def get_outbound_lineas():
    """
    Devuelve las líneas de un pedido de cliente dado su NUMDOCUMENTO.
    Query param: coddocumento (NUMDOCUMENTO visible al usuario).
    """
    ip_solicitante = (
        request.headers.get("X-Real-IP", "").strip()
        or request.headers.get("X-Forwarded-For", "").split(",")[0].strip()
        or request.remote_addr
        or ""
    ).replace("::ffff:", "").strip()

    if not _es_ip_local(ip_solicitante):
        return jsonify({"status": "error", "message": "Acceso restringido a LAN."}), 403

    coddocumento = request.args.get("coddocumento", "").strip()
    if not coddocumento:
        return jsonify({"status": "error", "message": "Parámetro 'coddocumento' requerido."}), 400

    from ..database import OracleDatabase
    connection = None
    cursor = None
    try:
        connection = OracleDatabase.get_connection()
        cursor = connection.cursor()

        # Consultar líneas del pedido de cliente
        cursor.execute("""
            SELECT
                l.NUMLINEA,
                a.CODARTICULOAPLICACION,
                a.NOMBREARTICULO,
                a.CODREALFABRICANTE,
                l.CANTSOLICITADA as UNIDADESPEDIDAS,
                NVL(l.CANTPREPARADA, 0) as UNIDADESPREPARADAS,
                NVL(l.CANTSOLICITADA - NVL(l.CANTPREPARADA, 0), 0) as UNIDADES_PENDIENTES
            FROM GSM.TMST_LINEASDOCUMENTOCLIENTE l
            JOIN GSM.TMST_ARTICULOS a ON l.CODARTICULO = a.CODARTICULO
            WHERE l.CODDOCUMENTO = :coddocumento
            ORDER BY l.NUMLINEA
        """, {"coddocumento": coddocumento})

        cols = [col[0].lower() for col in cursor.description]
        data = [dict(zip(cols, row)) for row in cursor.fetchall()]

        # Convertir posibles valores nulos a cadena vacía
        for r in data:
            r["codarticuloaplicacion"] = r.get("codarticuloaplicacion") or ""
            r["nombrearticulo"] = r.get("nombrearticulo") or ""
            r["codrealfabricante"] = r.get("codrealfabricante") or ""

        return jsonify({"status": "success", "total": len(data), "data": data}), 200

    except Exception as e:
        logger.error(f"[Admin] Error en /outbound/lineas: {e}", exc_info=True)
        return jsonify({"status": "error", "message": str(e)}), 500
    finally:
        if cursor:
            try: cursor.close()
            except: pass
        if connection:
            try: connection.close()
            except: pass


# ---------------------------------------------------------------------------
# INVENTARIO: Stock por ubicación con paginación
# ---------------------------------------------------------------------------
@admin_bp.route("/inventario/stock", methods=["GET"])
def get_inventario_stock():
    """
    Consulta stock por ubicación con paginación y filtros opcionales.
    Query params:
      - q       : texto libre (busca en NOMBREARTICULO y CODARTICULOAPLICACION)
      - almacen : código de almacén (opcional)
      - pagina  : número de página, por defecto 1
      - tamano  : registros por página, por defecto 50 (máx. 500)
    Usa paginación Oracle mediante doble subconsulta con ROWNUM.
    """
    ip_solicitante = (
        request.headers.get("X-Real-IP", "").strip()
        or request.headers.get("X-Forwarded-For", "").split(",")[0].strip()
        or request.remote_addr
        or ""
    ).replace("::ffff:", "").strip()

    if not _es_ip_local(ip_solicitante):
        return jsonify({"status": "error", "message": "Acceso restringido a LAN."}), 403

    # Parámetros de paginación y filtrado
    q = request.args.get("q", "").strip()
    almacen = request.args.get("almacen", "").strip()
    try:
        pagina = max(1, int(request.args.get("pagina", 1)))
        tamano = max(1, min(500, int(request.args.get("tamano", 50))))
    except ValueError:
        return jsonify({"status": "error", "message": "Los parámetros 'pagina' y 'tamano' deben ser enteros."}), 400

    offset_inicio = (pagina - 1) * tamano + 1
    offset_fin = pagina * tamano

    from ..database import OracleDatabase
    connection = None
    cursor = None
    try:
        connection = OracleDatabase.get_connection()
        cursor = connection.cursor()

        # Construir cláusulas WHERE dinámicas
        condiciones = ["v.STOCK > 0"]
        params = {}

        if almacen:
            condiciones.append("v.CODALMACEN = :almacen")
            params["almacen"] = almacen

        if q:
            condiciones.append(
                "(UPPER(v.NOMBREARTICULO) LIKE '%'||UPPER(:q)||'%' "
                "OR UPPER(v.CODARTICULOAPLICACION) LIKE '%'||UPPER(:q)||'%')"
            )
            params["q"] = q

        where_clause = " AND ".join(condiciones)

        # Paginación Oracle: doble subconsulta con ROWNUM
        query = f"""
            SELECT * FROM (
                SELECT inner_q.*, ROWNUM as rn FROM (
                    SELECT
                        v.NOMBRECORTO            as UBICACION,
                        v.CODARTICULOAPLICACION  as CODARTICULO,
                        v.NOMBREARTICULO,
                        NVL(v.NUMEROLOTE, v.CODNUMEROLOTE) as LOTE,
                        v.STOCK,
                        v.CAJAS,
                        v.FECHACADUCIDAD,
                        v.SSCC,
                        v.CODPALET,
                        v.BLOQUEOENTRADA,
                        v.BLOQUEOSALIDA,
                        v.ULTIMOMOVIMIENTO
                    FROM GSM.VMST_UBICACIONESARTICULO v
                    WHERE {where_clause}
                    ORDER BY v.NOMBRECORTO, v.NOMBREARTICULO
                ) inner_q
                WHERE ROWNUM <= :offset_fin
            )
            WHERE rn >= :offset_inicio
        """
        params["offset_fin"] = offset_fin
        params["offset_inicio"] = offset_inicio

        cursor.execute(query, params)
        cols = [col[0].lower() for col in cursor.description]
        data = [dict(zip(cols, row)) for row in cursor.fetchall()]

        # Eliminar columna auxiliar 'rn' y formatear datos
        for r in data:
            r.pop("rn", None)
            r["ubicacion"] = r.get("ubicacion") or ""
            r["codarticulo"] = r.get("codarticulo") or ""
            r["nombrearticulo"] = r.get("nombrearticulo") or ""
            r["lote"] = r.get("lote") or ""
            if r.get("fechacaducidad"):
                try:
                    r["fechacaducidad"] = r["fechacaducidad"].strftime('%d/%m/%Y')
                except Exception:
                    pass
            if r.get("ultimomovimiento"):
                try:
                    r["ultimomovimiento"] = r["ultimomovimiento"].strftime('%d/%m/%Y %H:%M:%S')
                except Exception:
                    pass

        return jsonify({
            "status": "success",
            "pagina": pagina,
            "tamano": tamano,
            "total": len(data),
            "data": data
        }), 200

    except Exception as e:
        logger.error(f"[Admin] Error en /inventario/stock: {e}", exc_info=True)
        return jsonify({"status": "error", "message": str(e)}), 500
    finally:
        if cursor:
            try: cursor.close()
            except: pass
        if connection:
            try: connection.close()
            except: pass


# ---------------------------------------------------------------------------
# INVENTARIO: Conceptos Estadísticos
# ---------------------------------------------------------------------------
@admin_bp.route("/conceptos-estadisticos", methods=["GET"])
def get_conceptos_estadisticos():
    """Devuelve la lista de conceptos estadísticos para los filtros."""
    ip_solicitante = (request.headers.get("X-Real-IP", "").strip() or request.remote_addr or "").replace("::ffff:", "").strip()
    if not _es_ip_local(ip_solicitante):
        return jsonify({"status": "error", "message": "Acceso restringido a LAN."}), 403

    from ..database import OracleDatabase
    connection = None
    cursor = None
    try:
        connection = OracleDatabase.get_connection()
        cursor = connection.cursor()
        cursor.execute("SELECT CODCONCEPTOESTADISTICO, DESCRIPCION FROM GSM.TSYS_CONCEPTOSESTADISTICOS ORDER BY DESCRIPCION")
        cols = [col[0].lower() for col in cursor.description]
        data = [dict(zip(cols, row)) for row in cursor.fetchall()]
        return jsonify({"status": "success", "data": data}), 200
    except Exception as e:
        logger.error(f"[Admin] Error en /conceptos-estadisticos: {e}", exc_info=True)
        return jsonify({"status": "error", "message": str(e)}), 500
    finally:
        if cursor:
            try: cursor.close()
            except: pass
        if connection:
            try: connection.close()
            except: pass


# ---------------------------------------------------------------------------
# INVENTARIO: Movimientos de stock con rango de fechas
# ---------------------------------------------------------------------------
@admin_bp.route("/inventario/movimientos", methods=["GET"])
def get_inventario_movimientos():
    """
    Consulta movimientos de stock en un rango de fechas (máx. 500 registros).
    Query params:
      - fecha_desde : DD/MM/YYYY (por defecto: hace 7 días)
      - fecha_hasta : DD/MM/YYYY (por defecto: hoy)
      - almacen     : código de almacén (opcional)
    """
    ip_solicitante = (
        request.headers.get("X-Real-IP", "").strip()
        or request.headers.get("X-Forwarded-For", "").split(",")[0].strip()
        or request.remote_addr
        or ""
    ).replace("::ffff:", "").strip()

    if not _es_ip_local(ip_solicitante):
        return jsonify({"status": "error", "message": "Acceso restringido a LAN."}), 403

    from datetime import datetime, timedelta
    from ..database import OracleDatabase

    fecha_desde_str = request.args.get("fecha_desde", "").strip()
    fecha_hasta_str = request.args.get("fecha_hasta", "").strip()
    almacen = request.args.get("almacen", "").strip()

    concepto = request.args.get("concepto", "").strip()
    operador = request.args.get("operador", "").strip()
    articulo = request.args.get("articulo", "").strip()

    try:
        fecha_desde = (
            datetime.strptime(fecha_desde_str, "%Y-%m-%d")
            if fecha_desde_str
            else datetime.now() - timedelta(days=7)
        )
        fecha_hasta = (
            datetime.strptime(fecha_hasta_str, "%Y-%m-%d")
            if fecha_hasta_str
            else datetime.now()
        )
    except ValueError:
        return jsonify({"status": "error", "message": "Formato de fecha inválido. Use YYYY-MM-DD."}), 400

    connection = None
    cursor = None
    try:
        connection = OracleDatabase.get_connection()
        cursor = connection.cursor()

        # Condiciones dinámicas de filtrado
        condiciones = [
            "m.FECHAEJECUTIVA >= :fecha_desde",
            "m.FECHAEJECUTIVA <= :fecha_hasta"
        ]
        params = {"fecha_desde": fecha_desde, "fecha_hasta": fecha_hasta}

        if almacen:
            condiciones.append("m.CODALMACEN = :almacen")
            params["almacen"] = almacen
            
        if concepto:
            condiciones.append("m.CODCONCEPTOESTADISTICO = :concepto")
            params["concepto"] = concepto
            
        if operador:
            condiciones.append("m.CODOPERADOR = :operador")
            params["operador"] = operador
            
        if articulo:
            condiciones.append("(UPPER(a.CODARTICULOAPLICACION) LIKE '%'||UPPER(:articulo)||'%' OR UPPER(a.NOMBREARTICULO) LIKE '%'||UPPER(:articulo)||'%')")
            params["articulo"] = articulo

        where_clause = " AND ".join(condiciones)

        # Limitar a 500 registros mediante subconsulta ROWNUM
        query = f"""
            SELECT * FROM (
                SELECT
                    m.FECHAEJECUTIVA,
                    a.CODARTICULOAPLICACION as CODARTICULO,
                    a.NOMBREARTICULO,
                    m.UNIDADES,
                    m.CODCONCEPTOESTADISTICO,
                    CASE 
                        WHEN m.CODCONCEPTOESTADISTICO IN (3, 8, 11, 22, 24, 25, 29) THEN 'Entrada'
                        WHEN m.CODCONCEPTOESTADISTICO IN (2, 5, 9, 10, 12, 19, 21, 23, 27, 28, 66, 67) THEN 'Salida'
                        ELSE 'Otro'
                    END as TIPO,
                    NVL(ce.DESCRIPCION, 'Concepto ' || m.CODCONCEPTOESTADISTICO) as CONCEPTO,
                    m.CODALMACEN,
                    m.CODOPERADOR
                FROM GSM.TEST_MOVIMIENTOSSTOCK m
                JOIN GSM.TMST_ARTICULOS a ON m.CODARTICULO = a.CODARTICULO
                LEFT JOIN GSM.TSYS_CONCEPTOSESTADISTICOS ce ON m.CODCONCEPTOESTADISTICO = ce.CODCONCEPTOESTADISTICO
                WHERE {where_clause}
                ORDER BY m.FECHAEJECUTIVA DESC
            )
            WHERE ROWNUM <= 500
        """

        cursor.execute(query, params)
        cols = [col[0].lower() for col in cursor.description]
        data = [dict(zip(cols, row)) for row in cursor.fetchall()]

        # Formatear fechas y nulos
        for r in data:
            if r.get("fechaejecutiva"):
                try:
                    r["fechaejecutiva"] = r["fechaejecutiva"].strftime('%d/%m/%Y')
                except Exception:
                    pass
            r["codarticulo"] = r.get("codarticulo") or ""
            r["nombrearticulo"] = r.get("nombrearticulo") or ""
            r["codoperador"] = r.get("codoperador") or ""
            r["codalmacen"] = r.get("codalmacen") or ""

        return jsonify({"status": "success", "total": len(data), "data": data}), 200

    except Exception as e:
        logger.error(f"[Admin] Error en /inventario/movimientos: {e}", exc_info=True)
        return jsonify({"status": "error", "message": str(e)}), 500
    finally:
        if cursor:
            try: cursor.close()
            except: pass
        if connection:
            try: connection.close()
            except: pass


# ---------------------------------------------------------------------------
# ESTADÍSTICAS: Productividad de operadores
# ---------------------------------------------------------------------------
@admin_bp.route("/estadisticas/operadores", methods=["GET"])
def get_estadisticas_operadores():
    """
    Devuelve la productividad agrupada por operador en un rango de fechas.
    Query params:
      - fecha_desde : DD/MM/YYYY (por defecto: hoy 00:00)
      - fecha_hasta : DD/MM/YYYY (por defecto: hoy 23:59)
    """
    ip_solicitante = (
        request.headers.get("X-Real-IP", "").strip()
        or request.headers.get("X-Forwarded-For", "").split(",")[0].strip()
        or request.remote_addr
        or ""
    ).replace("::ffff:", "").strip()

    if not _es_ip_local(ip_solicitante):
        return jsonify({"status": "error", "message": "Acceso restringido a LAN."}), 403

    from datetime import datetime
    from ..database import OracleDatabase

    fecha_desde_str = request.args.get("fecha_desde", "").strip()
    fecha_hasta_str = request.args.get("fecha_hasta", "").strip()

    try:
        fecha_desde = (
            datetime.strptime(fecha_desde_str, "%Y-%m-%d")
            if fecha_desde_str
            else datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        )
        fecha_hasta = (
            datetime.strptime(fecha_hasta_str, "%Y-%m-%d")
            if fecha_hasta_str
            else datetime.now().replace(hour=23, minute=59, second=59, microsecond=0)
        )
    except ValueError:
        return jsonify({"status": "error", "message": "Formato de fecha inválido. Use YYYY-MM-DD."}), 400

    connection = None
    cursor = None
    try:
        connection = OracleDatabase.get_connection()
        cursor = connection.cursor()

        cursor.execute("""
            SELECT
                m.CODOPERADOR,
                COUNT(*) as LINEAS_PREPARADAS,
                SUM(m.UNIDADES) as UNIDADES_TOTALES,
                MIN(m.FECHA) as PRIMERA_ACTIVIDAD,
                MAX(m.FECHA) as ULTIMA_ACTIVIDAD
            FROM GSM.TEST_MOVIMIENTOSOPERADOR m
            WHERE m.FECHA >= :fecha_desde AND m.FECHA <= :fecha_hasta
            GROUP BY m.CODOPERADOR
            ORDER BY UNIDADES_TOTALES DESC
        """, {"fecha_desde": fecha_desde, "fecha_hasta": fecha_hasta})

        cols = [col[0].lower() for col in cursor.description]
        data = [dict(zip(cols, row)) for row in cursor.fetchall()]

        # Formatear fechas y garantizar nulos numéricos a 0
        for r in data:
            r["codoperador"] = r.get("codoperador") or ""
            r["lineas_preparadas"] = r.get("lineas_preparadas") or 0
            r["unidades_totales"] = r.get("unidades_totales") or 0
            if r.get("primera_actividad"):
                try:
                    r["primera_actividad"] = r["primera_actividad"].strftime('%d/%m/%Y')
                except Exception:
                    pass
            if r.get("ultima_actividad"):
                try:
                    r["ultima_actividad"] = r["ultima_actividad"].strftime('%d/%m/%Y')
                except Exception:
                    pass

        return jsonify({"status": "success", "total": len(data), "data": data}), 200

    except Exception as e:
        logger.error(f"[Admin] Error en /estadisticas/operadores: {e}", exc_info=True)
        return jsonify({"status": "error", "message": str(e)}), 500
    finally:
        if cursor:
            try: cursor.close()
            except: pass
        if connection:
            try: connection.close()
            except: pass


# ---------------------------------------------------------------------------
# DASHBOARD: KPI de movimientos del día actual
# ---------------------------------------------------------------------------
@admin_bp.route("/dashboard/movimientos-hoy", methods=["GET"])
def get_dashboard_movimientos_hoy():
    """
    Devuelve los KPIs de entradas y salidas desde TRUNC(SYSDATE).
    No requiere parámetros.
    """
    ip_solicitante = (
        request.headers.get("X-Real-IP", "").strip()
        or request.headers.get("X-Forwarded-For", "").split(",")[0].strip()
        or request.remote_addr
        or ""
    ).replace("::ffff:", "").strip()

    if not _es_ip_local(ip_solicitante):
        return jsonify({"status": "error", "message": "Acceso restringido a LAN."}), 403

    from ..database import OracleDatabase
    connection = None
    cursor = None
    try:
        connection = OracleDatabase.get_connection()
        cursor = connection.cursor()

        cursor.execute("""
            SELECT
                CASE CODCONCEPTOESTADISTICO
                    WHEN 1 THEN 'Entradas'
                    ELSE 'Salidas'
                END as TIPO,
                COUNT(*) as MOVIMIENTOS,
                SUM(UNIDADES) as UNIDADES
            FROM GSM.TEST_MOVIMIENTOSSTOCK
            WHERE FECHAEJECUTIVA >= TRUNC(SYSDATE)
            GROUP BY CODCONCEPTOESTADISTICO
        """)

        cols = [col[0].lower() for col in cursor.description]
        data = [dict(zip(cols, row)) for row in cursor.fetchall()]

        # Asegurar que los valores nulos numéricos sean 0
        for r in data:
            r["movimientos"] = r.get("movimientos") or 0
            r["unidades"] = r.get("unidades") or 0

        return jsonify({"status": "success", "data": data}), 200

    except Exception as e:
        logger.error(f"[Admin] Error en /dashboard/movimientos-hoy: {e}", exc_info=True)
        return jsonify({"status": "error", "message": str(e)}), 500
    finally:
        if cursor:
            try: cursor.close()
            except: pass
        if connection:
            try: connection.close()
            except: pass


@admin_bp.route("/filtros", methods=["GET"])
def get_filtros():
    """
    Endpoint para recuperar la lista de filtros guardados de un módulo.
    Query param: def (CODDEFFILTRO). Ej: ?def=12
    """
    ip_solicitante = (
        request.headers.get("X-Real-IP", "").strip()
        or request.headers.get("X-Forwarded-For", "").split(",")[0].strip()
        or request.remote_addr
        or ""
    ).replace("::ffff:", "").strip()

    if not _es_ip_local(ip_solicitante):
        return jsonify({"status": "error", "message": "Acceso restringido a LAN."}), 403

    cod_def = request.args.get("def")
    if not cod_def or not cod_def.isdigit():
        return jsonify({"status": "error", "message": "Parámetro 'def' requerido y numérico."}), 400

    try:
        from ..services.filter_service import FilterService
        filtros = FilterService.get_filtros_por_tipo(int(cod_def))
        return jsonify({
            "status": "success",
            "data": filtros
        }), 200
    except Exception as e:
        import logging
        logging.getLogger(__name__).error(f"[Admin] Error consultando filtros: {e}", exc_info=True)
        return jsonify({"status": "error", "message": str(e)}), 500

@admin_bp.route("/filtros/definicion", methods=["GET"])
def get_definicion_campos_filtro():
    """Retorna los metadatos de los campos de filtro permitidos."""
    cod_def = request.args.get("def")
    if not cod_def or not cod_def.isdigit():
        return jsonify({"status": "error", "message": "Parámetro 'def' requerido y numérico."}), 400

    from ..services.filter_service import FilterService
    campos = FilterService.get_definicion_campos(int(cod_def))
    return jsonify({"status": "success", "data": campos}), 200

@admin_bp.route("/filtros", methods=["POST"])
def guardar_filtro():
    """Guarda un nuevo filtro personalizado."""
    data = request.json
    cod_def_filtro = data.get("coddeffiltro")
    descripcion = data.get("descripcion")
    custom_values = data.get("custom_values")
    cod_operador = data.get("cod_operador", 1) # Default admin operador

    if not cod_def_filtro or not descripcion or not custom_values:
        return jsonify({"status": "error", "message": "Faltan parámetros requeridos"}), 400

    from ..services.filter_service import FilterService
    res = FilterService.crear_filtro(int(cod_def_filtro), descripcion, int(cod_operador), custom_values)
    if res.get("status") == "success":
        return jsonify(res), 200
    else:
        return jsonify(res), 500

# ==========================================
# INFORMES MANUALES (SQL DINAMICO)
# ==========================================
@admin_bp.route("/informes", methods=["GET"])
def listar_informes():
    from ..services.informes_service import InformesService
    informes = InformesService.get_informes()
    return jsonify({"status": "success", "data": informes}), 200

@admin_bp.route("/informes", methods=["POST"])
def guardar_informe():
    data = request.json
    if not data or not data.get("nombre") or not data.get("sql"):
        return jsonify({"status": "error", "message": "Nombre y SQL son requeridos"}), 400
    from ..services.informes_service import InformesService
    try:
        informe = InformesService.save_informe(data)
        return jsonify({"status": "success", "data": informe}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@admin_bp.route("/informes/<id_informe>", methods=["DELETE"])
def eliminar_informe(id_informe):
    from ..services.informes_service import InformesService
    deleted = InformesService.delete_informe(id_informe)
    if deleted:
        return jsonify({"status": "success"}), 200
    return jsonify({"status": "error", "message": "No encontrado"}), 404

@admin_bp.route("/informes/ejecutar", methods=["POST"])
def ejecutar_informe():
    data = request.json
    if not data or not data.get("sql"):
        return jsonify({"status": "error", "message": "SQL es requerido"}), 400
    
    sql_query = data.get("sql", "").strip()
    codfiltro = data.get("codfiltro")
    coddeffiltro = data.get("coddeffiltro")
    
    # 1. VALIDADOR DE SEGURIDAD
    # Solo permitimos SELECT o WITH (Common Table Expressions)
    # Buscamos palabras destructivas simples
    upper_sql = sql_query.upper()
    dangerous_keywords = ["INSERT ", "UPDATE ", "DELETE ", "DROP ", "ALTER ", "TRUNCATE ", "EXEC ", "GRANT ", "REVOKE "]
    for kw in dangerous_keywords:
        if kw in upper_sql:
            return jsonify({"status": "error", "message": f"Consulta rechazada por razones de seguridad: palabra no permitida ({kw.strip()}). Solo se admiten sentencias SELECT."}), 400
            
    if not (upper_sql.startswith("SELECT ") or upper_sql.startswith("WITH ")):
        return jsonify({"status": "error", "message": "Consulta rechazada. La consulta debe iniciar con SELECT o WITH."}), 400
    
    # 2. INYECCIÓN DEL FILTRO DINÁMICO
    bind_params = {}
    cond_sql = ""
    prm = {}
    
    from ..services.filter_service import FilterService
    custom_filters = data.get("custom_filters")
    
    if custom_filters and coddeffiltro and str(coddeffiltro).isdigit():
        # Usa el filtro dinámico enviado desde el frontend sin guardar
        cond_sql, prm = FilterService.build_custom_filter_condition(int(coddeffiltro), custom_filters, bind_param_prefix="f_custom_")
    elif codfiltro and str(codfiltro).isdigit():
        # Usa un filtro pre-guardado de la base de datos
        cond_sql, prm, _ = FilterService.build_filter_condition(int(codfiltro), bind_param_prefix="f_dinamico_")
        
    if cond_sql:
        if "{FILTROS_DINAMICOS}" in sql_query:
            sql_query = sql_query.replace("{FILTROS_DINAMICOS}", cond_sql)
            bind_params.update(prm)
        else:
            pass
            
    # Removemos {FILTROS_DINAMICOS} si quedó suelto porque el usuario no seleccionó un filtro
    sql_query = sql_query.replace("{FILTROS_DINAMICOS}", "")

    # 3. LÍMITE DE FILAS PARA PREVENIR OOM
    # Si no usa paginación Oracle 12c+
    if "FETCH FIRST " not in upper_sql:
        sql_query = f"SELECT * FROM ({sql_query}) WHERE ROWNUM <= 1000"

    from ..database import OracleDatabase
    try:
        import datetime
        connection = OracleDatabase.get_connection()
        cursor = connection.cursor()
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
                row_dict[col] = val
            data_rows.append(row_dict)
            
        cursor.close()
        connection.close()
        
        return jsonify({
            "status": "success",
            "columns": cols,
            "data": data_rows,
            "total": len(data_rows)
        }), 200
        
    except Exception as e:
        return jsonify({"status": "error", "message": f"Error ejecutando SQL: {str(e)}"}), 500
