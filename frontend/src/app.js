// src/App.js
import React, { useState, useEffect, useRef } from 'react';
import {
    BrowserRouter as Router,
    Routes,
    Route,
    useNavigate,
    Navigate
} from 'react-router-dom';

import AuthPanel from './components/AuthPanel';
import VoiceRecorder from './components/VoiceRecorder';
import Mainpage from './components/Mainpage';
// You can add more pages like SettingsPage, DashboardPage, etc.

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
    const logoutTimer = useRef(null);
    const AUTO_LOGOUT_TIME = 5 * 60 * 1000;

    const resetLogoutTimer = () => {
        if (logoutTimer.current) clearTimeout(logoutTimer.current);
        logoutTimer.current = setTimeout(() => {
            handleLogout('Session expired due to inactivity');
        }, AUTO_LOGOUT_TIME);
    };

    const handleStatus = (message, type) => {
        setStatus({ message, type });

        if (type === 'success' && mode === 'login') {
            const loginData = { timestamp: Date.now() };
            localStorage.setItem('loginData', JSON.stringify(loginData));
            setIsAuthenticated(true);
            navigate('/main'); // go to main after login
            resetLogoutTimer();
        }

        setTimeout(() => setStatus({ message: '', type: '' }), 5000);
    };

    const handleLogout = (message = 'Logged out successfully') => {
        setIsAuthenticated(false);
        localStorage.removeItem('loginData');
        clearTimeout(logoutTimer.current);
        navigate('/');
        setStatus({ message, type: 'info' });
    };

    useEffect(() => {
        const loginData = JSON.parse(localStorage.getItem('loginData'));
        if (loginData) {
            const { timestamp } = loginData;
            const now = Date.now();
            if (now - timestamp < AUTO_LOGOUT_TIME) {
                setIsAuthenticated(true);
                navigate('/main');
                resetLogoutTimer();
            } else {
                localStorage.removeItem('loginData');
            }
        }
    }, []);

    useEffect(() => {
        const activityEvents = ['mousemove', 'keydown', 'click', 'touchstart'];
        const resetTimerOnActivity = () => {
            if (isAuthenticated) {
                localStorage.setItem('loginData', JSON.stringify({ timestamp: Date.now() }));
                resetLogoutTimer();
            }
        };

        activityEvents.forEach(event =>
            window.addEventListener(event, resetTimerOnActivity)
        );
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                resetTimerOnActivity();
            }
        });

        return () => {
            activityEvents.forEach(event =>
                window.removeEventListener(event, resetTimerOnActivity)
            );
            document.removeEventListener('visibilitychange', resetTimerOnActivity);
            clearTimeout(logoutTimer.current);
        };
    }, [isAuthenticated]);

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
            {/* Placeholder for future routes */}
            {/* <Route path="/settings" element={<SettingsPage />} /> */}
            {/* <Route path="/dashboard" element={<DashboardPage />} /> */}
        </Routes>
    );
};

const App = () => (
    <Router>
        <AppWrapper />
    </Router>
);

export default App;
