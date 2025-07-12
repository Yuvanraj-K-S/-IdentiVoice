import speech_recognition as sr

def speech_to_text(audio_path):
    """Convert audio file to text using Google's speech recognition"""
    recognizer = sr.Recognizer()
    audio_file = None
    try:
        audio_file = sr.AudioFile(audio_path)
        with audio_file as source:
            audio_data = recognizer.record(source)
            text = recognizer.recognize_google(audio_data)
            return text
    except sr.UnknownValueError:
        print("Speech recognition could not understand the audio")
        return None
    except sr.RequestError as e:
        print(f"Could not request results from Google Speech Recognition service; {e}")
        return None
    except Exception as e:
        print(f"Error in speech recognition: {e}")
        return None
    finally:
        if audio_file and hasattr(audio_file, 'close'):
            try:
                audio_file.close()
            except:
                pass