import React, { useState, useEffect } from 'react';
import AuthPanel from './components/AuthPanel';
import VoiceRecorder from './components/VoiceRecorder';
import './styles/main.css';

console.log('App component file loaded');

const App = () => {
    console.log('App component rendering');

    const [mode, setMode] = useState('register');
    const [status, setStatus] = useState({ message: '', type: '' });
    const [userData, setUserData] = useState({
        fullname: '',
        email: '',
        username: '',
        dob: ''
    });

    useEffect(() => {
        console.log('App component mounted');
        return () => console.log('App component unmounting');
    }, []);

    const handleStatus = (message, type) => {
        console.log('handleStatus called with:', message, type);
        setStatus({ message, type });
        setTimeout(() => setStatus({ message: '', type: '' }), 5000);
    };

    useEffect(() => {
        console.log('Current mode:', mode);
        console.log('Current userData:', userData);
        console.log('Current status:', status);
    }, [mode, userData, status]);

    return (
        <div className="container">
            <div className="header">
                <h1><i className="fas fa-microphone-alt"></i> IdentiVoice</h1>
                <p>Secure authentication using your unique voice signature</p>
            </div>

            <div className="main-content">
                <AuthPanel 
                    mode={mode} 
                    setMode={setMode}
                    status={status}
                    userData={userData}
                    setUserData={setUserData}
                    handleStatus={handleStatus}
                />
                <VoiceRecorder 
                    mode={mode}
                    userData={userData}
                    handleStatus={handleStatus}
                />
            </div>

            <div className="footer">
                <p>Powered by Google NOSS technology and Python SpeechRecognition</p>
                <p>IdentiVoice &copy; 2025 - Your voice is your password</p>
            </div>
        </div>
    );
};

export default App;