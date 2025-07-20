import React, { useState, useEffect, useRef } from 'react';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import '../styles/main.css';
import { sendVoiceCommand } from '../utils/api';

const Mainpage = ({ onLogout }) => {
  const [assistantResponse, setAssistantResponse] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [commandHistory, setCommandHistory] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const synthRef = useRef(window.speechSynthesis);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const {
    transcript,
    resetTranscript,
    listening: isListening,
    browserSupportsSpeechRecognition
  } = useSpeechRecognition();

  // Set up media recorder on component mount
  useEffect(() => {
    if (!browserSupportsSpeechRecognition) return;

    const setupMediaRecorder = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorderRef.current = new MediaRecorder(stream);
        
        mediaRecorderRef.current.ondataavailable = (event) => {
          audioChunksRef.current.push(event.data);
        };
        
        mediaRecorderRef.current.onstop = async () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          audioChunksRef.current = [];
          
          // Send to backend
          const result = await sendVoiceCommand(audioBlob);
          
          if (result.success) {
            setAssistantResponse(result.response);
            speakText(result.response);
            
            setCommandHistory(prev => [
              ...prev.filter(item => item.content !== 'Listening...'),
              { type: 'command', content: transcript },
              { type: 'response', content: result.response }
            ]);
            
            // Handle actions
            if (result.action === 'open' && result.url) {
              window.open(result.url, '_blank');
            } else if (result.action === 'search' && result.query) {
              window.open(`https://google.com/search?q=${encodeURIComponent(result.query)}`, '_blank');
            } else if (result.action === 'logout') {
              setTimeout(() => onLogout(), 2000);
            }
          } else {
            const errorMsg = result.message || "Command processing failed";
            setAssistantResponse(errorMsg);
            speakText(errorMsg);
          }
        };
      } catch (err) {
        console.error("Media recorder setup failed:", err);
        setAssistantResponse("Microphone access is required for voice commands");
      }
    };
    
    setupMediaRecorder();
    
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    };
  }, [browserSupportsSpeechRecognition]);

  const speakText = (text) => {
    if (synthRef.current.speaking) {
      synthRef.current.cancel();
    }
    setIsSpeaking(true);
    const utterance = new window.SpeechSynthesisUtterance(text);
    utterance.voice = window.speechSynthesis.getVoices().find(voice => 
      voice.name.includes('Google UK English Female') || voice.name.includes('Samantha')
    ) || window.speechSynthesis.getVoices()[0];
    utterance.onend = () => setIsSpeaking(false);
    synthRef.current.speak(utterance);
  };

  const startListening = () => {
    resetTranscript();
    SpeechRecognition.startListening({ continuous: true });
    mediaRecorderRef.current?.start();
    setIsRecording(true);
    setCommandHistory(prev => [...prev, { type: 'status', content: 'Listening...' }]);
  };

  const stopListening = () => {
    SpeechRecognition.stopListening();
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  useEffect(() => {
    if (!browserSupportsSpeechRecognition) {
      setAssistantResponse("Your browser doesn't support speech recognition");
      return;
    }

    const hour = new Date().getHours();
    const greeting = hour < 12 ? "Good Morning" : hour < 18 ? "Good Afternoon" : "Good Evening";
    const welcomeMessage = `${greeting}! I'm your voice assistant. How can I help you today?`;
    
    setAssistantResponse(welcomeMessage);
    speakText(welcomeMessage);
  }, [browserSupportsSpeechRecognition]);

  // Update transcript in real-time
  useEffect(() => {
    if (isRecording && transcript) {
      setCommandHistory(prev => {
        const newHistory = [...prev];
        const listeningIndex = newHistory.findIndex(item => item.content === 'Listening...');
        
        if (listeningIndex !== -1) {
          newHistory[listeningIndex] = { 
            type: 'command', 
            content: transcript,
            provisional: true
          };
        }
        
        return newHistory;
      });
    }
  }, [transcript, isRecording]);

  if (!browserSupportsSpeechRecognition) {
    return (
      <div className="assistant-container">
        <div className="assistant-header">
          <h1><i className="fas fa-microphone-alt"></i> Voice Assistant</h1>
        </div>
        <div className="assistant-main">
          <div className="response-text error">
            Your browser doesn't support speech recognition. Please use Chrome or Edge.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="assistant-container">
      <div className="assistant-header">
        <h1><i className="fas fa-microphone-alt"></i> Voice Assistant</h1>
        <div className="assistant-controls">
          <button
            className={`btn ${isRecording ? 'btn-danger' : 'btn-primary'}`}
            onClick={isRecording ? stopListening : startListening}
            disabled={isSpeaking}
          >
            <i className={`fas ${isRecording ? 'fa-stop' : 'fa-microphone'}`}></i>
            {isRecording ? ' Stop Recording' : ' Start Assistant'}
          </button>
          <button 
            className="btn btn-secondary" 
            onClick={(e) => {
              e.preventDefault();
              onLogout();
            }}
          >
            <i className="fas fa-sign-out-alt"></i> Logout
          </button>
        </div>
      </div>

      <div className="assistant-main">
        <div className="assistant-response">
          {isSpeaking ? (
            <div className="voice-wave">
              {[...Array(8)].map((_, i) => (
                <div
                  key={i}
                  className="wave-bar"
                  style={{ animationDelay: `${i * 0.1}s` }}
                ></div>
              ))}
            </div>
          ) : (
            <div className="response-text">
              <i className="fas fa-robot"></i> {assistantResponse}
            </div>
          )}
        </div>

        <div className="command-history">
          <h3>Command History</h3>
          <ul>
            {commandHistory.map((item, index) => (
              <li key={index} className={item.type}>
                {item.type === 'command' && <><i className="fas fa-user"></i> You: </>}
                {item.type === 'response' && <><i className="fas fa-robot"></i> Assistant: </>}
                {item.type === 'status' && <><i className="fas fa-circle-notch fa-spin"></i> </>}
                {item.content}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="assistant-footer">
        <p>Powered by React Speech Recognition and Python NLP</p>
      </div>
    </div>
  );
};

export default Mainpage;