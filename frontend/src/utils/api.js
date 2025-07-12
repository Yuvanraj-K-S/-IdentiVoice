const API_BASE = 'http://localhost:5000/api';

const fetchOptions = {
    mode: 'cors',
    credentials: 'include',
    headers: {
        'Accept': 'application/json'
    }
};

const validateAudioBlob = async (blob) => {
    if (!blob) {
        throw new Error('No audio data available');
    }
    if (!(blob instanceof Blob)) {
        throw new Error('Invalid audio data format');
    }
    if (blob.size === 0) {
        throw new Error('Audio file is empty');
    }
    if (blob.size < 44) {
        throw new Error('Audio file too small to be valid WAV');
    }

    // Check WAV file format
    const buffer = await blob.arrayBuffer();
    const view = new DataView(buffer);
    
    // Check RIFF header
    const riffHeader = String.fromCharCode(
        view.getUint8(0),
        view.getUint8(1),
        view.getUint8(2),
        view.getUint8(3)
    );
    if (riffHeader !== 'RIFF') {
        throw new Error('Invalid WAV file: missing RIFF header');
    }

    // Check WAVE format
    const format = String.fromCharCode(
        view.getUint8(8),
        view.getUint8(9),
        view.getUint8(10),
        view.getUint8(11)
    );
    if (format !== 'WAVE') {
        throw new Error('Invalid WAV file: missing WAVE format');
    }

    // Check fmt chunk
    const fmtHeader = String.fromCharCode(
        view.getUint8(12),
        view.getUint8(13),
        view.getUint8(14),
        view.getUint8(15)
    );
    if (fmtHeader !== 'fmt ') {
        throw new Error('Invalid WAV file: missing fmt chunk');
    }

    // Check audio format (1 = PCM)
    const audioFormat = view.getUint16(20, true);
    if (audioFormat !== 1) {
        throw new Error('Invalid WAV file: must be PCM format');
    }

    // Check channels (must be mono)
    const channels = view.getUint16(22, true);
    if (channels !== 1) {
        throw new Error('Invalid WAV file: must be mono channel');
    }

    // Check sample rate (must be 16kHz)
    const sampleRate = view.getUint32(24, true);
    if (sampleRate !== 16000) {
        throw new Error('Invalid WAV file: sample rate must be 16kHz');
    }

    // Check bits per sample (must be 16-bit)
    const bitsPerSample = view.getUint16(34, true);
    if (bitsPerSample !== 16) {
        throw new Error('Invalid WAV file: must be 16-bit');
    }
};

export const registerVoice = async (audioBlob, userData) => {
    try {
        await validateAudioBlob(audioBlob);
        
        const formData = new FormData();
        formData.append('audio', audioBlob, 'recording.wav');
        
        // Ensure all required fields are present and properly formatted
        const requiredFields = ['fullname', 'email', 'username', 'dob'];
        for (const field of requiredFields) {
            if (!userData[field]) {
                throw new Error(`Missing required field: ${field}`);
            }
            formData.append(field, userData[field]);
        }
        
        const response = await fetch(`${API_BASE}/register`, {
            method: 'POST',
            body: formData,
            mode: 'cors',
            credentials: 'include'
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            throw new Error(errorData?.message || `Server error: ${response.status}`);
        }
        
        const data = await response.json();
        return data;
        
    } catch (err) {
        console.error('Registration error:', err);
        return { 
            success: false, 
            message: err.message || 'Failed to register voice' 
        };
    }
};

export const loginVoice = async (audioBlob, username) => {
    try {
        await validateAudioBlob(audioBlob);
        
        const formData = new FormData();
        formData.append('audio', audioBlob, 'recording.wav');
        formData.append('username', username);
        
        const response = await fetch(`${API_BASE}/login`, {
            method: 'POST',
            body: formData,
            mode: 'cors',
            credentials: 'include'
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            throw new Error(errorData?.message || `Server error: ${response.status}`);
        }
        
        const data = await response.json();
        return data;
        
    } catch (err) {
        console.error('Login error:', err);
        return { 
            success: false, 
            message: err.message || 'Failed to authenticate' 
        };
    }
};