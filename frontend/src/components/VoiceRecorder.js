import React, { useState, useEffect, useRef } from 'react';
import { registerVoice, loginVoice } from '../utils/api';

const VoiceRecorder = ({ mode, userData, handleStatus }) => {
    const [isRecording, setIsRecording] = useState(false);
    const [countdown, setCountdown] = useState(10);
    const [audioBlob, setAudioBlob] = useState(null);
    const [passphrase, setPassphrase] = useState('');
    const mediaRecorderRef = useRef(null);
    const audioContextRef = useRef(null);
    const audioChunksRef = useRef([]);
    const countdownRef = useRef(null);

    // Get supported MIME type
    const getSupportedMimeType = () => {
        const types = [
            'audio/webm',
            'audio/wav',
            'audio/ogg',
            'audio/mp4'
        ];
        return types.find(type => MediaRecorder.isTypeSupported(type)) || 'audio/webm';
    };

    // Initialize AudioContext
    const initAudioContext = () => {
        if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
            audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({
                sampleRate: 16000
            });
        }
        return audioContextRef.current;
    };

    useEffect(() => {
        return () => {
            cleanupRecording();
        };
    }, []);

    const cleanupRecording = () => {
        try {
            if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
                mediaRecorderRef.current.stop();
            }
            if (mediaRecorderRef.current && mediaRecorderRef.current.stream) {
                mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
            }
            if (countdownRef.current) {
                clearInterval(countdownRef.current);
            }
            mediaRecorderRef.current = null;
            audioChunksRef.current = [];
            setIsRecording(false);
            setCountdown(10);
        } catch (err) {
            console.error('Error in cleanup:', err);
        }
    };

    const createSimpleWavFromBlob = async (blob) => {
        const arrayBuffer = await blob.arrayBuffer();
        const wavHeader = createWavHeader(arrayBuffer.byteLength);
        const fullBuffer = new Uint8Array(wavHeader.byteLength + arrayBuffer.byteLength);
        fullBuffer.set(new Uint8Array(wavHeader), 0);
        fullBuffer.set(new Uint8Array(arrayBuffer), wavHeader.byteLength);
        return new Blob([fullBuffer], { type: 'audio/wav' });
    };

    const floatTo16BitPCM = (float32Array) => {
        const buffer = new Int16Array(float32Array.length);
        for (let i = 0; i < float32Array.length; i++) {
            const s = Math.max(-1, Math.min(1, float32Array[i]));
            buffer[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }
        return buffer;
    };
    const averageChannels = (audioBuffer) => {
        const numChannels = audioBuffer.numberOfChannels;
        const length = audioBuffer.length;
        const avgData = new Float32Array(length);
    
        for (let c = 0; c < numChannels; c++) {
            const channel = audioBuffer.getChannelData(c);
            for (let i = 0; i < length; i++) {
                avgData[i] += channel[i] / numChannels;
            }
        }
        return avgData;
    };
    
    const createWavHeader = (totalSamples, sampleRate = 16000, numChannels = 1, bitsPerSample = 16) => {
        const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
        const blockAlign = numChannels * (bitsPerSample / 8);
        const subChunk2Size = totalSamples * blockAlign;
        const chunkSize = 36 + subChunk2Size;

        const buffer = new ArrayBuffer(44);
        const view = new DataView(buffer);

        // RIFF chunk descriptor
        writeString(view, 0, 'RIFF');                     // ChunkID
        view.setUint32(4, chunkSize, true);              // ChunkSize
        writeString(view, 8, 'WAVE');                     // Format

        // fmt sub-chunk
        writeString(view, 12, 'fmt ');                    // Subchunk1ID
        view.setUint32(16, 16, true);                    // Subchunk1Size (16 for PCM)
        view.setUint16(20, 1, true);                     // AudioFormat (1 for PCM)
        view.setUint16(22, numChannels, true);           // NumChannels
        view.setUint32(24, sampleRate, true);            // SampleRate
        view.setUint32(28, byteRate, true);              // ByteRate
        view.setUint16(32, blockAlign, true);            // BlockAlign
        view.setUint16(34, bitsPerSample, true);         // BitsPerSample

        // data sub-chunk
        writeString(view, 36, 'data');                    // Subchunk2ID
        view.setUint32(40, subChunk2Size, true);         // Subchunk2Size

        return buffer;
    };

    const writeString = (view, offset, string) => {
        for (let i = 0; i < string.length; i++) {
            view.setUint8(offset + i, string.charCodeAt(i));
        }
    };

    const startRecording = async () => {
        try {
            cleanupRecording();

            // Initialize AudioContext first
            const audioContext = initAudioContext();
            if (audioContext.state === 'suspended') {
                await audioContext.resume();
            }

            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    channelCount: 1,
                    sampleRate: 16000,
                    sampleSize: 16,
                    volume: 1.0
                } 
            });

            const mediaRecorder = new MediaRecorder(stream, {
                mimeType: getSupportedMimeType(),
                audioBitsPerSecond: 16000
            });

            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data && e.data.size > 0) {
                    audioChunksRef.current.push(e.data);
                }
            };

            mediaRecorder.onerror = (event) => {
                console.error('Recording error:', event.error);
                handleStatus('Error during recording. Please try again.', 'error');
                cleanupRecording();
            };

            mediaRecorder.onstop = async () => {
                try {
                    const recordedBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
            
                    const arrayBuffer = await recordedBlob.arrayBuffer();
                    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                    const audioBuffer = await new Promise((resolve, reject) => {
                        audioContext.decodeAudioData(arrayBuffer, resolve, reject);
                    });
            
                    // Convert to mono if needed
                    const channelData = audioBuffer.numberOfChannels > 1
                        ? averageChannels(audioBuffer)
                        : audioBuffer.getChannelData(0);
            
                    // Convert float32 to 16-bit PCM
                    const pcmData = floatTo16BitPCM(channelData);
            
                    // Create WAV header
                    const wavHeader = createWavHeader(pcmData.length, audioBuffer.sampleRate);
            
                    // Combine header + PCM data
                    const wavBuffer = new Uint8Array(wavHeader.byteLength + pcmData.byteLength);
                    wavBuffer.set(new Uint8Array(wavHeader), 0);
                    wavBuffer.set(new Uint8Array(pcmData.buffer), wavHeader.byteLength);
            
                    const wavBlob = new Blob([wavBuffer], { type: 'audio/wav' });
            
                    setAudioBlob(wavBlob);
                    await processRecording(wavBlob);
            
                } catch (error) {
                    console.error('Error creating WAV:', error);
                    handleStatus('Error converting recording to WAV format.', 'error');
                    cleanupRecording();
                }
            };
            

            mediaRecorder.start(100);
            setIsRecording(true);
            startCountdown();

        } catch (err) {
            console.error('Error starting recording:', err);
            handleStatus('Failed to start recording. Please check microphone permissions.', 'error');
            cleanupRecording();
        }
    };

    const startCountdown = () => {
        setCountdown(10);
        countdownRef.current = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) {
                    clearInterval(countdownRef.current);
                    stopRecording();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };

    const stopRecording = () => {
        try {
            if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
                mediaRecorderRef.current.stop();
            } else {
                cleanupRecording();
            }
        } catch (err) {
            console.error('Error stopping recording:', err);
            handleStatus('Error stopping recording. Please try again.', 'error');
            cleanupRecording();
        }
    };

    const processRecording = async (blob) => {
        try {
            let response;
            if (mode === 'register') {
                response = await registerVoice(blob, userData);
            } else {
                response = await loginVoice(blob, userData.username);
            }
            
            if (response.success) {
                setPassphrase(response.passphrase || '');
                handleStatus(response.message, 'success');
            } else {
                handleStatus(response.message, 'error');
            }
        } catch (err) {
            console.error('Error processing recording:', err);
            handleStatus('Failed to process recording. Please try again.', 'error');
        }
    };

    return (
        <div className="panel">
            <div className="panel-title">
                <i className="fas fa-microphone"></i>
                <h2>{mode === 'register' ? 'Voice Registration' : 'Voice Authentication'}</h2>
            </div>
            
            <div className="buttons">
                <button 
                    className={`btn btn-primary ${isRecording ? 'disabled' : ''}`}
                    onClick={startRecording}
                    disabled={isRecording}
                >
                    <i className="fas fa-microphone"></i> 
                    {mode === 'register' ? 'Record Passphrase' : 'Verify Identity'}
                </button>
                {isRecording && (
                    <button 
                        className="btn btn-danger"
                        onClick={stopRecording}
                    >
                        <i className="fas fa-stop"></i> Stop Recording
                    </button>
                )}
            </div>
            
            {isRecording && (
                <>
                    <div className="recording-indicator">
                        <div className="pulse"></div>
                        <div>Recording your voice... Please speak now</div>
                    </div>
                    <div className="timer">{countdown}</div>
                    <div className="voice-wave">
                        {[...Array(8)].map((_, i) => (
                            <div key={i} className="wave-bar"></div>
                        ))}
                    </div>
                </>
            )}
            
            {passphrase && (
                <div className="result-box">
                    <div className="result-text">
                        Your {mode === 'register' ? 'registered' : 'recognized'} passphrase: 
                        <span> "{passphrase}"</span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default VoiceRecorder;