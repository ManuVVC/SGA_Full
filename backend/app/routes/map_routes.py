from flask import Blueprint, jsonify
from ..database import OracleDatabase

map_bp = Blueprint("mapa", __name__)


@map_bp.route("/almacenes", methods=["GET"])
def get_almacenes():
    try:
        query = "SELECT CODALMACEN, DESCRIPCION FROM GSM.TMST_ALMACENES ORDER BY CODALMACEN"
        resultados = OracleDatabase.execute_query(query)
        return jsonify({"status": "success", "data": resultados})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@map_bp.route("/ubicacion/<int:codubicacion>", methods=["GET"])
def get_detalle_ubicacion(codubicacion):
    """Devuelve el detalle completo de la mercancía almacenada en una posición."""
    try:
        query = """
            SELECT
                v.CODUBICACION,
                v.NOMBRECORTO             AS NOMBRECORTO_UBICACION,
                v.CODARTICULOAPLICACION,
                v.NOMBREARTICULO,
                v.CODARTICULO,
                v.CODNUMEROLOTE,
                v.NUMEROLOTE,
                v.FECHACADUCIDAD,
                v.STOCK,
                v.CAJAS,
                v.STOCKTOTAL,
                v.TOTALCAJAS,
                v.PESO,
                v.CODPALET,
                v.SSCC,
                v.ULTIMOMOVIMIENTO,
                v.NOMBREPROPIETARIO,
                v.GESTIONARCADUCIDAD,
                v.POSICION
            FROM GSM.VMST_UBICACIONESARTICULO v
            WHERE v.CODUBICACION = :codubicacion
              AND v.STOCK > 0
            ORDER BY v.CODARTICULOAPLICACION, v.FECHACADUCIDAD
        """
        rows = OracleDatabase.execute_query(query, {"codubicacion": codubicacion})

        # Serializar fechas Oracle a string
        resultado = []
        for r in rows:
            resultado.append({
                "codubicacion":        r["CODUBICACION"],
                "nombrecorto":         r["NOMBRECORTO_UBICACION"],
                "codarticuloaplicacion": r["CODARTICULOAPLICACION"],
                "nombrearticulo":      r["NOMBREARTICULO"],
                "codarticulo":         r["CODARTICULO"],
                "codnumerolote":       r["CODNUMEROLOTE"],
                "numerolote":          r["NUMEROLOTE"],
                "fechacaducidad":      r["FECHACADUCIDAD"].strftime("%d/%m/%Y") if r["FECHACADUCIDAD"] else None,
                "stock":               float(r["STOCK"]) if r["STOCK"] else 0,
                "cajas":               float(r["CAJAS"]) if r["CAJAS"] else 0,
                "stocktotal":          float(r["STOCKTOTAL"]) if r["STOCKTOTAL"] else 0,
                "totalcajas":          float(r["TOTALCAJAS"]) if r["TOTALCAJAS"] else 0,
                "peso":                float(r["PESO"]) if r["PESO"] else 0,
                "codpalet":            int(r["CODPALET"]) if r["CODPALET"] else 0,
                "sscc":                r["SSCC"],
                "ultimomovimiento":    r["ULTIMOMOVIMIENTO"].strftime("%d/%m/%Y %H:%M") if r["ULTIMOMOVIMIENTO"] else None,
                "nombrepropietario":   r["NOMBREPROPIETARIO"],
                "gestionarcaducidad":  r["GESTIONARCADUCIDAD"],
                "posicion":            int(r["POSICION"]) if r["POSICION"] else 1,
            })

        return jsonify({"status": "success", "data": resultado})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@map_bp.route("/topologia/<codalmacen>", methods=["GET"])
def get_topologia(codalmacen):
    try:
        # ── 1. Obtener todas las UBICACIONES definidas (estructura física) ──────
        # TMST_UBICACIONES tiene una fila por cada posición (I/C/D) de cada hueco.
        # Es la fuente de verdad para saber cuántas posiciones tiene cada hueco.
        query_ubicaciones = """
            SELECT
                h.CODPASILLO,
                p.DESCRIPCION       AS DESC_PASILLO,
                p.NOMBRECORTO       AS NOMBRECORTO_PASILLO,
                h.CODCOLUMNA,
                c.NOMBRECORTO       AS NOMBRECORTO_COLUMNA,
                h.CODHUECO,
                h.CODALTURA,
                h.NOMBRECORTO       AS NOMBRECORTO_HUECO,
                u.CODUBICACION,
                u.POSICION,
                u.NOMBRECORTO       AS NOMBRECORTO_UBICACION
            FROM GSM.TMST_HUECOS h
            JOIN GSM.TMST_PASILLOS  p  ON p.CODALMACEN = h.CODALMACEN AND p.CODPASILLO  = h.CODPASILLO
            JOIN GSM.TMST_COLUMNAS  c  ON c.CODALMACEN = h.CODALMACEN AND c.CODPASILLO  = h.CODPASILLO
                                      AND c.CODCOLUMNA = h.CODCOLUMNA
            JOIN GSM.TMST_UBICACIONES u ON u.CODHUECO   = h.CODHUECO
            WHERE h.CODALMACEN = :codalmacen
            ORDER BY h.CODPASILLO, h.CODCOLUMNA, h.CODALTURA, u.POSICION
        """

        # ── 2. Obtener el STOCK real agrupado por ubicación ───────────────────
        # VMST_UBICACIONESARTICULO puede tener varias filas por ubicación
        # (un artículo distinto o lote por fila). Sumamos el stock total.
        # Ocupado = SUM(STOCK) > 0, independientemente de si hay CODPALET o no.
        query_stock = """
            SELECT
                CODUBICACION,
                SUM(STOCK)       AS STOCK_TOTAL,
                MAX(NOMBREARTICULO) AS NOMBREARTICULO,
                MAX(CODPALET)    AS CODPALET
            FROM GSM.VMST_UBICACIONESARTICULO
            WHERE CODALMACEN = :codalmacen
            GROUP BY CODUBICACION
        """

        raw_ubicaciones = OracleDatabase.execute_query(query_ubicaciones, {"codalmacen": codalmacen})
        raw_stock       = OracleDatabase.execute_query(query_stock,       {"codalmacen": codalmacen})

        # Índice rápido de stock por CODUBICACION
        stock_idx = {}
        for s in raw_stock:
            stock_idx[s["CODUBICACION"]] = {
                "stock":    float(s["STOCK_TOTAL"]) if s["STOCK_TOTAL"] else 0,
                "articulo": s["NOMBREARTICULO"],
                "codpalet": int(s["CODPALET"]) if s["CODPALET"] else 0,
            }

        # ── 3. Construir la jerarquía Pasillo → Columna → Hueco → Posiciones ──
        pasillos_dict = {}

        for row in raw_ubicaciones:
            pas          = row["CODPASILLO"]
            col          = row["CODCOLUMNA"]
            alt          = row["CODALTURA"]
            key_hueco    = (pas, col, alt)
            cod_ubicacion = row["CODUBICACION"]
            pos           = int(row["POSICION"])

            # Pasillo
            if pas not in pasillos_dict:
                pasillos_dict[pas] = {
                    "codpasillo":  pas,
                    "descripcion": row["DESC_PASILLO"],
                    "nombrecorto": row["NOMBRECORTO_PASILLO"],
                    "columnas":    {},
                }

            # Columna
            if col not in pasillos_dict[pas]["columnas"]:
                pasillos_dict[pas]["columnas"][col] = {
                    "codcolumna":  col,
                    "nombrecorto": row["NOMBRECORTO_COLUMNA"],
                    "huecos":      {},
                }

            # Hueco
            huecos_col = pasillos_dict[pas]["columnas"][col]["huecos"]
            if key_hueco not in huecos_col:
                huecos_col[key_hueco] = {
                    "codhueco":    row["CODHUECO"],
                    "nombrecorto": row["NOMBRECORTO_HUECO"],
                    "codaltura":   alt,
                    "posiciones":  {},
                }

            # Posición — cruzar con stock
            info = stock_idx.get(cod_ubicacion, {})
            stock_pos = info.get("stock", 0)

            huecos_col[key_hueco]["posiciones"][pos] = {
                "posicion":       pos,
                "codubicacion":   cod_ubicacion,
                "nombrecorto":    row["NOMBRECORTO_UBICACION"],
                "ocupado":        stock_pos > 0,
                "stock":          stock_pos,
                "articulo":       info.get("articulo"),
                "codpalet":       info.get("codpalet", 0),
            }

        # ── 4. Convertir a listas con métricas ────────────────────────────────
        resultado = []
        for pas in sorted(pasillos_dict.keys()):
            columnas_list = []
            for col in sorted(pasillos_dict[pas]["columnas"].keys()):
                huecos_raw  = pasillos_dict[pas]["columnas"][col]["huecos"]
                huecos_list = []
                for key in sorted(huecos_raw.keys(), key=lambda k: k[2]):   # orden por altura
                    h = huecos_raw[key]
                    h["posiciones"] = [v for _, v in sorted(h["posiciones"].items())]
                    huecos_list.append(h)
                columnas_list.append({
                    "codcolumna":  col,
                    "nombrecorto": pasillos_dict[pas]["columnas"][col]["nombrecorto"],
                    "huecos":      huecos_list,
                })

            total_pos    = sum(len(h["posiciones"]) for c in columnas_list for h in c["huecos"])
            ocupadas_pos = sum(
                sum(1 for p in h["posiciones"] if p["ocupado"])
                for c in columnas_list for h in c["huecos"]
            )

            resultado.append({
                "codpasillo":      pas,
                "descripcion":     pasillos_dict[pas]["descripcion"],
                "nombrecorto":     pasillos_dict[pas]["nombrecorto"],
                "columnas":        columnas_list,
                "total_huecos":    total_pos,
                "huecos_ocupados": ocupadas_pos,
                "pct_ocupacion":   round((ocupadas_pos / total_pos * 100) if total_pos > 0 else 0, 1),
            })

        return jsonify({"status": "success", "data": resultado})

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500
