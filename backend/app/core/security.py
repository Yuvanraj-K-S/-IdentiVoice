from werkzeug.security import generate_password_hash, check_password_hash
from functools import wraps
from flask import request, jsonify
import os

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')
        if not token or token != os.getenv('API_TOKEN'):
            return jsonify({"message": "Token is missing or invalid"}), 401
        return f(*args, **kwargs)
    return decorated