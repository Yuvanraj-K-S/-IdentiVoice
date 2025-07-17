import React, { useState, useEffect, useRef } from 'react';
import { useSpeechRecognition } from 'react-speech-recognition';
import '../styles/main.css';

const Mainpage = ({ onLogout }) => {
  const [isListening, setIsListening] = useState(false);
  const [assistantResponse, setAssistantResponse] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [commandHistory, setCommandHistory] = useState([]);
  const synthRef = useRef(window.speechSynthesis);

  const handleAssistantResponse = (text) => {
    setAssistantResponse(text);
    speakText(text);
    setCommandHistory(prev => [...prev, { type: 'response', content: text }]);
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

  const startListening = () => {
    setIsListening(true);
    resetTranscript();
    setCommandHistory(prev => [...prev, { type: 'command', content: 'Listening...' }]);
  };

  const stopListening = () => {
    setIsListening(false);
    if (transcript) {
      setCommandHistory(prev => [
        ...prev.filter(item => item.content !== 'Listening...'),
        { type: 'command', content: transcript }
      ]);
    }
  };

  const commands = [
    {
      command: ['hello', 'hi', 'hey'],
      callback: () => handleAssistantResponse("Hello! How can I help you today?")
    },
    {
      command: 'what time is it',
      callback: () => {
        const time = new Date().toLocaleTimeString();
        handleAssistantResponse(`The current time is ${time}`);
      }
    },
    {
      command: 'open *',
      callback: (site) => {
        const validSites = {
          'youtube': 'https://youtube.com',
          'google': 'https://google.com',
          'stackoverflow': 'https://stackoverflow.com',
          'wikipedia': 'https://wikipedia.com'
        };
        if (validSites[site.toLowerCase()]) {
          window.open(validSites[site.toLowerCase()], '_blank');
          handleAssistantResponse(`Opening ${site}`);
        } else {
          handleAssistantResponse(`I don't know how to open ${site}`);
        }
      }
    },
    {
      command: 'search for *',
      callback: (query) => {
        window.open(`https://google.com/search?q=${encodeURIComponent(query)}`, '_blank');
        handleAssistantResponse(`Searching for ${query}`);
      }
    },
    {
      command: 'tell me a joke',
      callback: () => {
        const jokes = [
          "Why don't scientists trust atoms? Because they make up everything!",
          "What did one ocean say to the other ocean? Nothing, they just waved!",
          "Why did the scarecrow win an award? Because he was outstanding in his field!",
          "I'm reading a book about anti-gravity. It's impossible to put down!",
          "Did you hear about the mathematician who's afraid of negative numbers? He'll stop at nothing to avoid them!"
        ];
        const joke = jokes[Math.floor(Math.random() * jokes.length)];
        handleAssistantResponse(joke);
      }
    },
    {
      command: 'who are you',
      callback: () => handleAssistantResponse("I'm your voice assistant, created to help you with tasks and information")
    },
    {
      command: 'what can you do',
      callback: () => handleAssistantResponse("I can search the web, tell you jokes, give you the time, open websites, and much more. Just ask!")
    },
    // Uncomment below if you want to enable logout
    // {
    //   command: 'logout',
    //   callback: () => {
    //     handleAssistantResponse("Logging out. Goodbye!");
    //     setTimeout(() => onLogout(), 2000);
    //   }
    // },
    {
      command: 'stop',
      callback: () => {
        setIsListening(false);
        handleAssistantResponse("Stopped listening");
      }
    }
  ];

  const { transcript, resetTranscript, browserSupportsSpeechRecognition } = useSpeechRecognition({ commands });

  useEffect(() => {
    if (transcript && isListening) {
      setCommandHistory(prev => {
        const lastItem = prev[prev.length - 1];
        if (lastItem && lastItem.type === 'command' && lastItem.content === 'Listening...') {
          return [...prev.slice(0, -1), { type: 'command', content: transcript }];
        }
        return [...prev, { type: 'command', content: transcript }];
      });
    }
  }, [transcript, isListening]);

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

  if (!browserSupportsSpeechRecognition) {
    return <div className="error">Browser doesn't support speech recognition.</div>;
  }

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
        <div className="command-history">
          {commandHistory.map((item, index) => (
            <div
              key={index}
              className={`command-item ${item.type}`}
            >
              <div className="command-icon">
                {item.type === 'command' ?
                  <i className="fas fa-user"></i> :
                  <i className="fas fa-robot"></i>
                }
              </div>
              <div className="command-content">{item.content}</div>
            </div>
          ))}
        </div>

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
        <div className="quick-commands">
          <h3>Try saying:</h3>
          <div className="command-chips">
            <span>"What time is it?"</span>
            <span>"Open YouTube"</span>
            <span>"Search for React tutorials"</span>
            <span>"Tell me a joke"</span>
            <span>"What can you do?"</span>
          </div>
        </div>
        <p>Powered by React Speech Recognition and Web Speech API</p>
      </div>
    </div>
  );
};

export default Mainpage;