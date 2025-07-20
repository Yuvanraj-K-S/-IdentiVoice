import React, { useState, useEffect, useRef } from 'react';
import { sendCommand } from '../utils/api';
import '../styles/main.css';

const Mainpage = ({ onLogout }) => {
  const [isListening, setIsListening] = useState(false);
  const [assistantResponse, setAssistantResponse] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const synthRef = useRef(window.speechSynthesis);

  const handleAssistantResponse = (text) => {
    setAssistantResponse(text);
    speakText(text);
  };

  const speakText = (text) => {
    if (synthRef.current.speaking) {
      synthRef.current.cancel();
    }
    setIsSpeaking(true);
    const utterance = new window.SpeechSynthesisUtterance(text);
    utterance.voice = window.speechSynthesis.getVoices().find(voice => voice.name.includes('Google UK English Female')) ||
      window.speechSynthesis.getVoices()[0];
    utterance.onend = () => setIsSpeaking(false);
    synthRef.current.speak(utterance);
  };

  const startListening = async () => {
    setIsListening(true);
    setAssistantResponse('Listening...');
    const response = await sendCommand('start');
    if (response.success) {
      handleAssistantResponse(response.message);
    } else {
      handleAssistantResponse(response.message || 'Error starting assistant');
    }
  };

  const stopListening = async () => {
    setIsListening(false);
    setAssistantResponse('');
    const response = await sendCommand('stop');
    if (response.success) {
      handleAssistantResponse(response.message);
    } else {
      handleAssistantResponse(response.message || 'Error stopping assistant');
    }
  };

  useEffect(() => {
    const hour = new Date().getHours();
    let greeting = '';
    if (hour >= 0 && hour < 12) greeting = "Good Morning";
    else if (hour >= 12 && hour < 18) greeting = "Good Afternoon";
    else greeting = "Good Evening";
    const welcomeMessage = `${greeting}! I'm your voice assistant. How can I help you today?`;
    setAssistantResponse(welcomeMessage);
    speakText(welcomeMessage);
    // eslint-disable-next-line
  }, []);

  return (
    <div className="assistant-container">
      <div className="assistant-header">
        <h1><i className="fas fa-microphone-alt"></i> Voice Assistant</h1>
        <div className="assistant-controls">
          <button
            className={`btn ${isListening ? 'btn-danger' : 'btn-primary'}`}
            onClick={isListening ? stopListening : startListening}
          >
            <i className={`fas ${isListening ? 'fa-stop' : 'fa-microphone'}`}></i>
            {isListening ? ' Stop Listening' : ' Start Assistant'}
          </button>
          {/* <button className="btn btn-secondary" onClick={() => onLogout()}>
            <i className="fas fa-sign-out-alt"></i> Logout
          </button> */}
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
      </div>

      <div className="assistant-footer">
        <p>Powered by React Speech Recognition and Web Speech API</p>
      </div>
    </div>
  );
};

export default Mainpage;
