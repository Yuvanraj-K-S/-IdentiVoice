from flask import Flask
from flask_cors import CORS
from config import Config
from app.core.database import db, init_db

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    # Initialize extensions
    db.init_app(app)
    
    # Configure CORS
    CORS(app,
         origins=["http://localhost:3000"],
         methods=["GET", "POST", "OPTIONS"],
         allow_headers=["Content-Type", "Authorization", "Accept"],
         supports_credentials=True)

    # Create upload folder
    import os
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

    # Import blueprints AFTER app creation to avoid circular imports
    from app.auth.routes import auth_bp  # This import must come AFTER Flask app creation
    app.register_blueprint(auth_bp, url_prefix='/api')

    # Initialize database
    with app.app_context():
        init_db(app)

    return app
from app.core.database import db