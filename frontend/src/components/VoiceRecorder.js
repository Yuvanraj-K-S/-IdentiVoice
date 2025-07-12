// Modified VoiceRecorder.js with proper WAV encoding and cleanup handling
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

    useEffect(() => {
        return () => {
            cleanupRecording();
        };
    }, []);

    const initAudioContext = () => {
        if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
            audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
        }
        return audioContextRef.current;
    };

    const cleanupRecording = () => {
        try {
            if (mediaRecorderRef.current?.state === 'recording') {
                mediaRecorderRef.current.stop();
            }
            mediaRecorderRef.current?.stream?.getTracks().forEach(track => track.stop());
            if (countdownRef.current) clearInterval(countdownRef.current);

            mediaRecorderRef.current = null;
            audioChunksRef.current = [];
            setIsRecording(false);
            setCountdown(10);
        } catch (err) {
            console.error('Error in cleanup:', err);
        }
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

    const createWavHeader = (length, sampleRate = 16000, numChannels = 1, bitsPerSample = 16) => {
        const byteRate = sampleRate * numChannels * bitsPerSample / 8;
        const blockAlign = numChannels * bitsPerSample / 8;
        const subChunk2Size = length * numChannels * bitsPerSample / 8;
        const chunkSize = 36 + subChunk2Size;

        const buffer = new ArrayBuffer(44);
        const view = new DataView(buffer);

        const writeString = (view, offset, string) => {
            for (let i = 0; i < string.length; i++) {
                view.setUint8(offset + i, string.charCodeAt(i));
            }
        };

        writeString(view, 0, 'RIFF');
        view.setUint32(4, chunkSize, true);
        writeString(view, 8, 'WAVE');
        writeString(view, 12, 'fmt ');
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true);
        view.setUint16(22, numChannels, true);
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, byteRate, true);
        view.setUint16(32, blockAlign, true);
        view.setUint16(34, bitsPerSample, true);
        writeString(view, 36, 'data');
        view.setUint32(40, subChunk2Size, true);

        return buffer;
    };

    const startRecording = async () => {
        try {
            cleanupRecording();
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = e => {
                if (e.data.size > 0) audioChunksRef.current.push(e.data);
            };

            mediaRecorder.onstop = async () => {
                try {
                    const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                    const arrayBuffer = await blob.arrayBuffer();
                    const audioContext = initAudioContext();
                    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

                    const monoData = audioBuffer.numberOfChannels > 1 ? averageChannels(audioBuffer) : audioBuffer.getChannelData(0);
                    const pcm = floatTo16BitPCM(monoData);
                    const header = createWavHeader(pcm.length);

                    const wav = new Uint8Array(header.byteLength + pcm.byteLength);
                    wav.set(new Uint8Array(header), 0);
                    wav.set(new Uint8Array(pcm.buffer), header.byteLength);

                    const wavBlob = new Blob([wav], { type: 'audio/wav' });
                    setAudioBlob(wavBlob);
                    await processRecording(wavBlob);

                } catch (error) {
                    console.error('Error creating WAV:', error);
                    handleStatus('Error converting recording to WAV format.', 'error');
                } finally {
                    cleanupRecording();
                }
            };

            mediaRecorder.start(100);
            setIsRecording(true);
            startCountdown();

        } catch (err) {
            console.error('Error starting recording:', err);
            handleStatus('Failed to start recording. Check mic permissions.', 'error');
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
            if (mediaRecorderRef.current?.state === 'recording') {
                mediaRecorderRef.current.stop();
            }
        } catch (err) {
            console.error('Error stopping recording:', err);
            handleStatus('Error stopping recording. Try again.', 'error');
            cleanupRecording();
        }
    };

    const processRecording = async (blob) => {
        try {
            const response = mode === 'register'
                ? await registerVoice(blob, userData)
                : await loginVoice(blob, userData.username);

            if (response.success) {
                setPassphrase(response.passphrase || '');
                handleStatus(response.message, 'success');
            } else {
                handleStatus(response.message, 'error');
            }
        } catch (err) {
            console.error('Error processing recording:', err);
            handleStatus('Failed to process recording.', 'error');
        }
    };

    return (
        <div className="panel">
            <div className="panel-title">
                <i className="fas fa-microphone"></i>
                <h2>{mode === 'register' ? 'Voice Registration' : 'Voice Authentication'}</h2>
            </div>

            <div className="buttons">
                <button className={`btn btn-primary ${isRecording ? 'disabled' : ''}`} onClick={startRecording} disabled={isRecording}>
                    <i className="fas fa-microphone"></i>
                    {mode === 'register' ? 'Record Passphrase' : 'Verify Identity'}
                </button>
                {isRecording && (
                    <button className="btn btn-danger" onClick={stopRecording}>
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
                        {[...Array(8)].map((_, i) => <div key={i} className="wave-bar"></div>)}
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
