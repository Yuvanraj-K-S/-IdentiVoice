from flask import Blueprint, request, jsonify
from werkzeug.utils import secure_filename
import os
import wave
from app.auth.services import register_user, authenticate_user
from app.ml.speech import transcribe_audio
from config import Config

auth_bp = Blueprint('auth', __name__)

def validate_wav_file(file_path):
    """Validate that the file is a proper WAV file"""
    wav_file = None
    try:
        wav_file = wave.open(file_path, 'rb')
        # Check basic WAV properties
        if wav_file.getnchannels() != 1:
            return False, "Audio must be mono channel"
        if wav_file.getsampwidth() != 2:
            return False, "Audio must be 16-bit"
        if wav_file.getframerate() < 16000:
            return False, "Sample rate must be at least 16kHz"
        return True, None
    except Exception as e:
        return False, f"Invalid WAV file: {str(e)}"
    finally:
        if wav_file:
            wav_file.close()

def safe_remove_file(file_path):
    """Safely remove a file with retries"""
    max_retries = 3
    retry_count = 0
    while retry_count < max_retries:
        try:
            if os.path.exists(file_path):
                os.close(os.open(file_path, os.O_RDONLY))  # Force close any open handles
                os.remove(file_path)
            break
        except Exception as e:
            retry_count += 1
            if retry_count == max_retries:
                print(f"Failed to remove file after {max_retries} attempts: {str(e)}")
            else:
                import time
                time.sleep(0.1)  # Wait briefly before retrying

@auth_bp.route('/register', methods=['POST'])
def register():
    audio_path = None
    try:
        if 'audio' not in request.files:
            return jsonify({"success": False, "message": "No audio file provided"}), 400
        
        audio_file = request.files['audio']
        if audio_file.filename == '':
            return jsonify({"success": False, "message": "No selected audio file"}), 400
        
        # Validate required fields
        required_fields = ['fullname', 'email', 'username', 'dob']
        missing_fields = [field for field in required_fields if field not in request.form]
        if missing_fields:
            return jsonify({
                "success": False,
                "message": f"Missing required fields: {', '.join(missing_fields)}"
            }), 400
        
        # Save and validate audio file
        filename = secure_filename(audio_file.filename)
        audio_path = os.path.join(Config.UPLOAD_FOLDER, filename)
        audio_file.save(audio_path)
        
        # Validate WAV file
        is_valid, error_message = validate_wav_file(audio_path)
        if not is_valid:
            safe_remove_file(audio_path)
            return jsonify({"success": False, "message": error_message}), 400
        
        # Process registration
        result = register_user(audio_path, request.form)
        safe_remove_file(audio_path)
        
        if not result['success']:
            return jsonify(result), 400
        
        return jsonify(result)
        
    except Exception as e:
        print(f"Registration error: {str(e)}")
        if audio_path and os.path.exists(audio_path):
            safe_remove_file(audio_path)
        return jsonify({
            "success": False,
            "message": f"Registration failed: {str(e)}"
        }), 500

@auth_bp.route('/login', methods=['POST'])
def login():
    audio_path = None
    try:
        if 'audio' not in request.files:
            return jsonify({"success": False, "message": "No audio file provided"}), 400
        
        username = request.form.get('username')
        if not username:
            return jsonify({"success": False, "message": "Username required"}), 400
        
        audio_file = request.files['audio']
        if audio_file.filename == '':
            return jsonify({"success": False, "message": "No selected audio file"}), 400
        
        # Save and validate audio file
        filename = secure_filename(audio_file.filename)
        audio_path = os.path.join(Config.UPLOAD_FOLDER, filename)
        audio_file.save(audio_path)
        
        # Validate WAV file
        is_valid, error_message = validate_wav_file(audio_path)
        if not is_valid:
            safe_remove_file(audio_path)
            return jsonify({"success": False, "message": error_message}), 400
        
        # Process authentication
        result = authenticate_user(audio_path, username)
        safe_remove_file(audio_path)
        
        if not result['success']:
            return jsonify(result), 401
        
        return jsonify(result)
        
    except Exception as e:
        print(f"Login error: {str(e)}")
        if audio_path and os.path.exists(audio_path):
            safe_remove_file(audio_path)
        return jsonify({
            "success": False,
            "message": f"Authentication failed: {str(e)}"
        }), 500

@auth_bp.route('/api/register', methods=['POST'])
def register_voice():
    try:
        file = request.files['file']
        username = request.form.get('username')

        if not file or not username:
            return jsonify({'success': False, 'message': 'Missing file or username'}), 400

        # Create temp directory if it doesn't exist
        os.makedirs("temp_audio", exist_ok=True)
        
        file_path = f"temp_audio/{username}_sample.wav"
        file.save(file_path)

        print("Saved audio file at:", file_path)
        print("File size:", os.path.getsize(file_path), "bytes")

        # Validate WAV file (using the same validation as other endpoints)
        is_valid, error_message = validate_wav_file(file_path)
        if not is_valid:
            safe_remove_file(file_path)
            return jsonify({'success': False, 'message': error_message}), 400

        # Transcribe audio
        transcript = transcribe_audio(file_path)
        print("Transcript:", transcript)

        # Clean up the temporary file
        safe_remove_file(file_path)

        # Return passphrase to frontend
        return jsonify({
            'success': True,
            'passphrase': transcript,
            'message': 'Voice registered successfully'
        }), 200

    except Exception as e:
        print("Registration failed:", str(e))
        return jsonify({'success': False, 'message': 'Speech recognition failed'}), 400