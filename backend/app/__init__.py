from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from config import Config

# Initialize SQLAlchemy without binding to app yet
db = SQLAlchemy()

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)
    
    # Initialize extensions with more permissive CORS for development
    CORS(app, 
         origins=["http://localhost:3000"],
         methods=["GET", "POST", "OPTIONS"],
         allow_headers=["Content-Type", "Authorization", "Accept"],
         supports_credentials=True)
    
    # Initialize SQLAlchemy with app context
    db.init_app(app)
    
    # Create upload folder
    import os
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    
    # Register blueprints
    from app.auth.routes import auth_bp
    app.register_blueprint(auth_bp, url_prefix='/api')
    
    # Create tables within app context
    with app.app_context():
        db.create_all()
        
    @app.before_request
    def before_request():
        if not hasattr(app, 'db'):
            app.db = db
    
    return app