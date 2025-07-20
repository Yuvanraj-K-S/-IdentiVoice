import React, { useState, useEffect, useRef } from 'react';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import '../styles/main.css';

const Mainpage = ({ onLogout }) => {
  const [assistantResponse, setAssistantResponse] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [commandHistory, setCommandHistory] = useState([]);
  const synthRef = useRef(window.speechSynthesis);

  const {
    transcript,
    resetTranscript,
    listening: isListening,
    browserSupportsSpeechRecognition
  } = useSpeechRecognition();

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

  const fetchAssistantResponse = async (commandText) => {
    try {
      const response = await fetch('http://localhost:5000/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: commandText })
      });
      
      if (!response.ok) throw new Error('Network response was not ok');
      
      const data = await response.json();
      setAssistantResponse(data.response);
      speakText(data.response);
      setCommandHistory(prev => [
        ...prev.filter(item => item.content !== 'Listening...'),
        { type: 'command', content: commandText },
        { type: 'response', content: data.response }
      ]);

      // Handle special actions from backend
      if (data.action === 'open' && data.url) {
        window.open(data.url, '_blank');
      } else if (data.action === 'search' && data.query) {
        window.open(`https://google.com/search?q=${encodeURIComponent(data.query)}`, '_blank');
      } else if (data.action === 'logout') {
        setTimeout(() => onLogout(), 2000);
      }

    } catch (error) {
      console.error("Error talking to assistant:", error);
      const errorMsg = "Sorry, there was a problem contacting the assistant.";
      setAssistantResponse(errorMsg);
      speakText(errorMsg);
    }
  };

  const startListening = () => {
    resetTranscript();
    SpeechRecognition.startListening();
    setCommandHistory(prev => [...prev, { type: 'status', content: 'Listening...' }]);
  };

  const stopListening = () => {
    SpeechRecognition.stopListening();
    if (transcript.trim()) {
      fetchAssistantResponse(transcript);
    } else {
      setCommandHistory(prev => prev.filter(item => item.content !== 'Listening...'));
      setAssistantResponse("I didn't catch that. Could you try again?");
    }
    resetTranscript();
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
            className={`btn ${isListening ? 'btn-danger' : 'btn-primary'}`}
            onClick={isListening ? stopListening : startListening}
            disabled={isSpeaking}
          >
            <i className={`fas ${isListening ? 'fa-stop' : 'fa-microphone'}`}></i>
            {isListening ? ' Stop Listening' : ' Start Assistant'}
          </button>
          <button className="btn btn-secondary" onClick={onLogout}>
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