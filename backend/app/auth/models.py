from app.core.database import db
from datetime import datetime

class User(db.Model):
    fullname = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(100), primary_key=True, nullable=False)
    username = db.Column(db.String(50), unique=True, nullable=False)
    dob = db.Column(db.Date, nullable=False)
    passphrase = db.Column(db.String(200), nullable=False)
    voice_vector = db.Column(db.LargeBinary, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f'<User {self.username}>'