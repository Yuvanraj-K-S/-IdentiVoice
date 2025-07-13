import tensorflow as tf
import numpy as np
import librosa
from config import Config

class NOSSModel:
    def __init__(self, model_path=None):
        self.model_path = model_path or Config.NOSS_MODEL_PATH
        self.model = tf.saved_model.load(self.model_path)
        self.embedding_fn = self.model.signatures["serving_default"]
    
    def preprocess_audio(self, audio_path, target_sr=16000, duration=10.0):
        """Load and preprocess audio file"""
        try:
            waveform, sr = librosa.load(audio_path, sr=target_sr)
            
            target_length = int(target_sr * duration)
            if len(waveform) > target_length:
                waveform = waveform[:target_length]
            else:
                padding = target_length - len(waveform)
                waveform = np.pad(waveform, (0, padding), mode='constant')
                
            return waveform
        except Exception as e:
            print(f"Error preprocessing audio: {e}")
            return None
    
    def generate_embedding(self, audio_path):
        """Generate voice embedding using NOSS model"""
        try:
            waveform = self.preprocess_audio(audio_path)
            if waveform is None:
                return None
                
            input_tensor = tf.convert_to_tensor(waveform[np.newaxis, :], dtype=tf.float32)
            output = self.embedding_fn(input_tensor)
            embedding = output["distilled_output"].numpy()
            return embedding.flatten()
        except Exception as e:
            print(f"Error generating embedding: {e}")
            return None

# Global instance
noss_model = NOSSModel()

def generate_voice_embedding(audio_path):
    return noss_model.generate_embedding(audio_path)