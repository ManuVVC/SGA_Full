from flask import Blueprint, jsonify, request
from ..services.auth_service import AuthService

auth_bp = Blueprint("auth", __name__)


@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json() or {}
    username = data.get("username")
    password = data.get("password")

    if AuthService.validate_credentials(username, password):
        return jsonify({"message": "Login successful"}), 200

    return jsonify({"message": "Invalid credentials"}), 401


@auth_bp.route("/logout", methods=["POST"])
def logout():
    return jsonify({"message": "Logout successful"}), 200
