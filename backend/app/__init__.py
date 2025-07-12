from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from config import Config

# ✅ Import db from the correct module
from app.core.database import db, init_db

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    # ✅ Initialize the DB correctly
    db.init_app(app)

    # ✅ Create tables
    init_db(app)

    CORS(app,
         origins=["http://localhost:3000"],
         methods=["GET", "POST", "OPTIONS"],
         allow_headers=["Content-Type", "Authorization", "Accept"],
         supports_credentials=True)

    import os
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

    from app.auth.routes import auth_bp
    app.register_blueprint(auth_bp, url_prefix='/api')

    return app
