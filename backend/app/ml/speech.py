import speech_recognition as sr

def transcribe_audio(audio_path, use_google=True):
    """
    Convert audio file to text using speech recognition.
    
    Args:
        audio_path (str): Path to the audio file to transcribe
        use_google (bool): Whether to use Google's speech recognition (default) or other engines
        
    Returns:
        str: The transcribed text
        
    Raises:
        ValueError: If speech was unintelligible
        RuntimeError: If there's an API error or recognition service error
        Exception: For other unexpected errors
    """    
    recognizer = sr.Recognizer()
    audio_file = None
    
    try:
        # Open and read the audio file
        audio_file = sr.AudioFile(audio_path)
        with audio_file as source:
            # Adjust for ambient noise and record the audio data
            recognizer.adjust_for_ambient_noise(source)
            audio_data = recognizer.record(source)
        
        # Perform speech recognition
        if use_google:
            text = recognizer.recognize_google(audio_data)
        else:
            # Could add support for other recognizers here
            text = recognizer.recognize_google(audio_data)  # Default to Google
        print(f"Transcribed text: {text}")
        return text
        
    except sr.UnknownValueError:
        raise ValueError("Speech recognition could not understand the audio")
    except sr.RequestError as e:
        raise RuntimeError(f"Could not request results from speech recognition service; {e}")
    except Exception as e:
        raise RuntimeError(f"Error in speech recognition: {e}")
    finally:
        # Ensure proper cleanup of resources
        if audio_file and hasattr(audio_file, 'close'):
            try:
                audio_file.close()
            except Exception:
                pass