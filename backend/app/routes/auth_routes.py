import jwt
import datetime
from flask import Blueprint, jsonify, request, current_app
from ..database import db

auth_bp = Blueprint("auth", __name__)


# ── GET /auth/terminal ────────────────────────────────────────────────────────
# Identifica el terminal PDA por su IP y devuelve su estado.
# Nginx pasa la IP real del cliente en la cabecera X-Real-IP.
@auth_bp.route("/terminal", methods=["GET"])
def get_terminal():
    # Prioridad de fuentes de IP del cliente:
    # 1. X-Terminal-IP: IP auto-detectada por el navegador PDA via WebRTC
    #    (enviada por apiService.js para resolver el NAT de Docker en Windows)
    # 2. X-Real-IP: IP vista por Nginx (172.19.0.1 en Docker Desktop Windows)
    # 3. X-Forwarded-For: cabecera estándar de proxy
    # 4. remote_addr: IP del socket TCP (siempre Docker gateway en contenedor)
    client_ip = (
        request.headers.get("X-Terminal-IP")
        or request.headers.get("X-Real-IP")
        or request.headers.get("X-Forwarded-For", "").split(",")[0].strip()
        or request.remote_addr
    )

    try:
        conn = db.get_connection()
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT t.CODTERMINAL,
                   t.DESCRIPCION,
                   t.CODOPERADOR,
                   o.NOMBRE AS NOMBREOPERADOR,
                   t.PRM_BLOQUEADO
            FROM   TMST_TERMINALES t
            LEFT JOIN TMST_OPERADORES o ON t.CODOPERADOR = o.CODOPERADOR
            WHERE  t.IP = :ip
            """,
            {"ip": client_ip},
        )
        row = cursor.fetchone()
        cursor.close()
        conn.close()
    except Exception as e:
        current_app.logger.error(f"[auth/terminal] Error DB: {e}")
        return jsonify({"status": "error", "message": "Error de base de datos"}), 500

    if not row:
        return (
            jsonify(
                {
                    "status": "error",
                    "message": f"Terminal con IP {client_ip} no está registrado en el sistema",
                }
            ),
            404,
        )

    return jsonify(
        {
            "status": "success",
            "terminal": {
                "CODTERMINAL":    row[0],
                "DESCRIPCION":    row[1],
                "CODOPERADOR":    row[2],
                "NOMBREOPERADOR": row[3],
                "PRM_BLOQUEADO":  row[4],
            },
        }
    ), 200


# ── POST /auth/login ──────────────────────────────────────────────────────────
# Valida credenciales del operario contra TMST_OPERADORES y devuelve JWT + permisos.
# Body: { "username": "<CODOPERADOR>", "password": "<PASSWORD>" }
@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json(silent=True) or {}
    username = str(data.get("username", "")).strip().upper()
    password = str(data.get("password", "")).strip()

    if not username or not password:
        return jsonify({"message": "Credenciales incompletas"}), 400

    try:
        conn = db.get_connection()
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT CODOPERADOR,
                   NOMBRE,
                   PRM_ENTRADADEMERCANCIAS,
                   PRM_REUBICAR,
                   PRM_AJUSTESDESTOCK,
                   PRM_PREPARARPEDIDOCLIENTE,
                   PRM_PREPARARPEDIDODIRECTO,
                   PRM_ESTADISTICAS
            FROM   TMST_OPERADORES
            WHERE  UPPER(NOMBRE) = :username
              AND  PASSWORD      = :password
            """,
            {"username": username, "password": password},
        )
        row = cursor.fetchone()
        cursor.close()
        conn.close()
    except Exception as e:
        current_app.logger.error(f"[auth/login] Error DB: {e}")
        return jsonify({"message": "Error de base de datos"}), 500

    if not row:
        # Comprobar si el usuario existe (para diferenciar usuario inexistente de contraseña mala)
        try:
            conn = db.get_connection()
            cursor = conn.cursor()
            cursor.execute(
                "SELECT CODOPERADOR FROM TMST_OPERADORES WHERE UPPER(NOMBRE) = :username",
                {"username": username},
            )
            exists = cursor.fetchone()
            cursor.close()
            conn.close()
        except Exception:
            exists = None

        if exists:
            return jsonify({"message": "Contraseña incorrecta"}), 401
        else:
            return jsonify({"message": "Operador inexistente"}), 404

    codoperador = row[0]
    nombre = row[1]

    # Generar JWT firmado con la SECRET_KEY de la app
    secret_key = current_app.config.get("SECRET_KEY", "dev-secret")
    token = jwt.encode(
        {
            "sub":          codoperador,
            "nombre":       nombre,
            "exp":          datetime.datetime.utcnow() + datetime.timedelta(hours=12),
        },
        secret_key,
        algorithm="HS256",
    )

    permissions = {
        "PRM_RECEPCION":    bool(row[2]),   # PRM_ENTRADADEMERCANCIAS
        "PRM_REUBICAR":     bool(row[3]),
        "PRM_AJUSTES":      bool(row[4]),
        "PRM_EXPEDICION":   bool(row[5]),   # PRM_PREPARARPEDIDOCLIENTE
        "PRM_MULTIPEDIDO":  bool(row[6]),   # PRM_PREPARARPEDIDODIRECTO
        "PRM_ESTADISTICAS": bool(row[7]),
    }

    return jsonify({"token": token, "permissions": permissions}), 200


# ── POST /auth/logout ─────────────────────────────────────────────────────────
# El JWT es stateless; el logout real lo gestiona el cliente borrando el token.
@auth_bp.route("/logout", methods=["POST"])
def logout():
    return jsonify({"message": "Sesión cerrada correctamente"}), 200
