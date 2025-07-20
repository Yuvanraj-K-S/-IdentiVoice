// src/App.js
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, Navigate } from 'react-router-dom';

import AuthPanel from './components/AuthPanel';
import VoiceRecorder from './components/VoiceRecorder';
import Mainpage from './components/Mainpage';
import './styles/main.css';

const AuthPage = ({ mode, setMode, status, userData, setUserData, handleStatus }) => (
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

const AppWrapper = () => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [mode, setMode] = useState('register');
    const [status, setStatus] = useState({ message: '', type: '' });
    const [userData, setUserData] = useState({
        fullname: '',
        email: '',
        username: '',
        dob: ''
    });

    const navigate = useNavigate();

    const handleStatus = (message, type) => {
        setStatus({ message, type });
        if (type === 'success' && mode === 'login') {
            setIsAuthenticated(true);
            navigate('/main');
        }
        setTimeout(() => setStatus({ message: '', type: '' }), 5000);
    };

    const handleLogout = () => {
        setIsAuthenticated(false);
        navigate('/');
    };

    return (
        <Routes>
            <Route
                path="/"
                element={
                    isAuthenticated
                        ? <Navigate to="/main" />
                        : (
                            <AuthPage
                                mode={mode}
                                setMode={setMode}
                                status={status}
                                userData={userData}
                                setUserData={setUserData}
                                handleStatus={handleStatus}
                            />
                        )
                }
            />
            <Route
                path="/main"
                element={
                    isAuthenticated
                        ? <Mainpage onLogout={handleLogout} />
                        : <Navigate to="/" />
                }
            />
        </Routes>
    );
};

const App = () => (
    <Router>
        <AppWrapper />
    </Router>
);

export default App;
