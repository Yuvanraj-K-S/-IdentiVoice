import React from 'react';

const AuthPanel = ({ mode, setMode, status, userData, setUserData, handleStatus }) => {
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setUserData(prev => ({ ...prev, [name]: value }));
    };

    return (
        <div className="panel">
            <div className="panel-title">
                <i className={`fas ${mode === 'register' ? 'fa-user-plus' : 'fa-sign-in-alt'}`}></i>
                <h2>{mode === 'register' ? 'Create Your Voice Identity' : 'Login with Your Voice'}</h2>
            </div>
            
            <p>
                {mode === 'register' 
                    ? 'Register your voice to create a secure biometric password. Speak a passphrase of your choice for 10 seconds.'
                    : 'Speak your passphrase to authenticate. Your voiceprint will be matched against our secure records.'}
            </p>
            
            <div className="buttons">
                <button 
                    className={`btn ${mode === 'register' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setMode('register')}
                >
                    <i className="fas fa-user-plus"></i> Register
                </button>
                <button 
                    className={`btn ${mode === 'login' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setMode('login')}
                >
                    <i className="fas fa-sign-in-alt"></i> Login
                </button>
            </div>
            
            {mode === 'register' && (
                <div className="registration-form">
                    <div className="form-group">
                        <label htmlFor="fullname">Full Name</label>
                        <input 
                            type="text" 
                            id="fullname" 
                            name="fullname"
                            value={userData.fullname}
                            onChange={handleInputChange}
                            placeholder="Enter your full name"
                        />
                    </div>
                    
                    <div className="form-group">
                        <label htmlFor="email">Email Address</label>
                        <input 
                            type="email" 
                            id="email" 
                            name="email"
                            value={userData.email}
                            onChange={handleInputChange}
                            placeholder="Enter your email"
                        />
                    </div>
                    
                    <div className="form-group">
                        <label htmlFor="username">Username</label>
                        <input 
                            type="text" 
                            id="username" 
                            name="username"
                            value={userData.username}
                            onChange={handleInputChange}
                            placeholder="Choose a username"
                        />
                    </div>
                    
                    <div className="form-group">
                        <label htmlFor="dob">Date of Birth</label>
                        <input 
                            type="date" 
                            id="dob" 
                            name="dob"
                            value={userData.dob}
                            onChange={handleInputChange}
                        />
                    </div>
                </div>
            )}
            
            {mode === 'login' && (
                <div className="login-form">
                    <div className="form-group">
                        <label htmlFor="loginUsername">Username</label>
                        <input 
                            type="text" 
                            id="loginUsername" 
                            name="username"
                            value={userData.username}
                            onChange={handleInputChange}
                            placeholder="Enter your username"
                        />
                    </div>
                </div>
            )}
            
            {status.message && (
                <div className={`status-message ${status.type}`}>
                    {status.message}
                </div>
            )}
        </div>
    );
};

export default AuthPanel;