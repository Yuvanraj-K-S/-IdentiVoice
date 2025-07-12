from app.ml.noss import generate_voice_embedding
from app.ml.speech import speech_to_text
from app.auth.models import User
from app.core.database import db
from flask import current_app
import numpy as np

def register_user(audio_path, form_data):
    # Convert speech to text
    passphrase = speech_to_text(audio_path)
    if not passphrase:
        return {"success": False, "message": "Speech recognition failed"}
    
    # Generate voice vector
    voice_vector = generate_voice_embedding(audio_path)
    if voice_vector is None:
        return {"success": False, "message": "Voice vector generation failed"}
    
    # Create user
    try:
        with current_app.app_context():
            user = User(
                fullname=form_data['fullname'],
                email=form_data['email'],
                username=form_data['username'],
                dob=form_data['dob'],
                passphrase=passphrase,
                voice_vector=voice_vector.tobytes()
            )
            db.session.add(user)
            db.session.commit()
        
        return {
            "success": True,
            "passphrase": passphrase,
            "message": "Registration successful"
        }
    except Exception as e:
        db.session.rollback()
        return {"success": False, "message": str(e)}

def authenticate_user(audio_path, username):
    try:
        with current_app.app_context():
            # Get user from database
            user = User.query.filter_by(username=username).first()
            if not user:
                return {"success": False, "message": "User not found"}
            
            # Convert speech to text
            passphrase = speech_to_text(audio_path)
            if not passphrase:
                return {"success": False, "message": "Speech recognition failed"}
            
            # Verify passphrase
            if passphrase != user.passphrase:
                return {
                    "success": False,
                    "message": "Passphrase does not match",
                    "match_percentage": 0
                }
            
            # Generate voice vector for login attempt
            current_vector = generate_voice_embedding(audio_path)
            if current_vector is None:
                return {"success": False, "message": "Voice vector generation failed"}
            
            # Compare with stored vector
            stored_vector = np.frombuffer(user.voice_vector, dtype=np.float32)
            similarity = calculate_similarity(current_vector, stored_vector)
            
            if similarity >= 0.75:
                return {
                    "success": True,
                    "message": "Login successful",
                    "match_percentage": round(similarity * 100, 2)
                }
            else:
                return {
                    "success": False,
                    "message": "Voiceprint does not match",
                    "match_percentage": round(similarity * 100, 2)
                }
    except Exception as e:
        return {"success": False, "message": str(e)}

def calculate_similarity(vec1, vec2):
    # Normalize vectors
    vec1 = vec1 / np.linalg.norm(vec1)
    vec2 = vec2 / np.linalg.norm(vec2)
    # Calculate cosine similarity
    return np.dot(vec1, vec2)