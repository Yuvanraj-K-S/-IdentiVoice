from flask import Blueprint, request, jsonify
from werkzeug.utils import secure_filename
import os
import wave
from app.auth.services import register_user, authenticate_user
from app.ml.speech import transcribe_audio
from config import Config
from datetime import datetime 
from pydub import AudioSegment 
from app.ml.noss import generate_voice_embedding
from app.auth.services import register_user

auth_bp = Blueprint('auth', __name__)
            
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


def webm_to_wav(audio_path,username,timestamp=''):
    input_webm_file = audio_path
    output_wav_file = f"temp_audio/{username}_{timestamp}.wav"
    
    audio = AudioSegment.from_file(input_webm_file, format="webm")

    audio.export(output_wav_file, format="wav")

    print(f"Successfully converted '{input_webm_file}' to '{output_wav_file}'")
    return output_wav_file


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
        audio_path = webm_to_wav(audio_path,username)
        
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

@auth_bp.route('/register', methods=['POST'])
def register_voice():
    try:
        
        webm_file = request.files.get('webm_file')
        username = request.form.get('username')

        if not webm_file or not username:
            return jsonify({'success': False, 'message': 'Missing files or username'}), 400

        os.makedirs("temp_audio", exist_ok=True)
        
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        webm_path = f"temp_audio/{username}_{timestamp}.webm"

        
        webm_file.save(webm_path)

        print(f"Saved files:\nWebM: {webm_path} ({os.path.getsize(webm_path)} bytes)")
        
        wav_path = webm_to_wav(webm_path,username,timestamp)
        safe_remove_file(webm_path)
        
        transcript = transcribe_audio(wav_path)
        print("Transcript:", transcript)
        
        noss = generate_voice_embedding(wav_path)
        print(f"Voice Vector:{noss}")
        form_data = {}
        form_data['username'] = request.form.get('username')
        form_data['fullname'] = request.form.get('fullname')
        form_data['email'] = request.form.get('email')
        form_data['dob'] = request.form.get('dob')
        print("registering user.......")
        print(register_user(wav_path,form_data))
        
        return jsonify({
            'success': True,
            'passphrase': transcript,
            'file_paths': {
                'wav': wav_path
            },
            'message': 'Voice registered successfully'
        }), 200

    except Exception as e:
        print("Registration failed:", str(e))
        # Clean up if files were created
        if 'wav_path' in locals() and os.path.exists(wav_path):
            safe_remove_file(wav_path)
        return jsonify({'success': False, 'message': 'Registration process failed'}), 500
    


