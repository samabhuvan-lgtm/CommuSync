import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Both fields are mandatory to enter the game!');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const data = await login(email, password);
      // If the user hasn't completed the psychometric test, force them to do it!
      if (!data.user.hasCompletedTest) {
        navigate('/personality');
      } else {
        navigate('/');
      }
    } catch (err) {
      setError(err.message || 'Power-down! Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mario-sky" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', padding: '1.5rem' }}>
      
      {/* Dynamic Animated Clouds */}
      <div className="clouds-container">
        <div className="cloud cloud-small" style={{ left: '10%' }}></div>
        <div className="cloud cloud-medium" style={{ left: '45%' }}></div>
        <div className="cloud cloud-large" style={{ left: '75%' }}></div>
      </div>

      <div style={{ maxWidth: '420px', width: '100%', zIndex: 10, textAlign: 'center' }}>
        
        {/* Game Title Logo */}
        <div style={{ marginBottom: '2rem' }} className="animated-block">
          <span className="star-bounce" style={{ fontSize: '2.5rem' }}>⭐</span>
          <h1 style={{ 
            fontSize: '2.2rem', 
            color: 'var(--primary-red)', 
            textShadow: '3px 3px 0px var(--accent-yellow), 5px 5px 0px var(--nes-black)',
            marginTop: '0.5rem'
          }}>
            CAMPUSSYNC
          </h1>
          <p className="retro-font" style={{ fontSize: '0.65rem', color: '#ffffff', letterSpacing: '1px', marginTop: '0.5rem', textShadow: '2px 2px 0px #000' }}>
            PRESS START TO CONNECT
          </p>
        </div>

        {/* Form Panel */}
        <div className="retro-panel" style={{ backgroundColor: '#ffffff', border: '5px solid var(--nes-black)' }}>
          <h2 style={{ fontSize: '1.1rem', marginBottom: '1.5rem', color: 'var(--nes-black)', textAlign: 'center' }}>
            STUDENT LOGIN
          </h2>

          {error && (
            <div style={{ 
              backgroundColor: '#fff0f0', 
              border: '3px solid var(--primary-red)', 
              color: 'var(--primary-red)', 
              padding: '0.8rem', 
              borderRadius: '6px', 
              fontSize: '0.85rem', 
              marginBottom: '1.2rem',
              fontWeight: '600',
              textAlign: 'left'
            }}>
              🚨 {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', textAlign: 'left' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontFamily: 'var(--font-retro)', marginBottom: '0.4rem', color: '#555' }}>
                STUDENT EMAIL
              </label>
              <input
                type="email"
                placeholder="yourname@university.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="retro-input"
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontFamily: 'var(--font-retro)', marginBottom: '0.4rem', color: '#555' }}>
                PASSWORD
              </label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="retro-input"
                required
              />
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className={`retro-btn retro-btn-yellow ${loading ? 'retro-btn-disabled' : ''}`}
              style={{ width: '100%', marginTop: '0.5rem', fontSize: '0.9rem', padding: '0.9rem 1.5rem' }}
            >
              <span>{loading ? 'SYNCING...' : 'START GAME 🍄'}</span>
            </button>
          </form>

          {/* Quick Sandbox Account Tips */}
          <div style={{ marginTop: '1.2rem', padding: '0.8rem', backgroundColor: '#f9f9f9', border: '2px dashed #ccc', borderRadius: '6px', fontSize: '0.8rem', color: '#666', textAlign: 'left' }}>
            <span style={{ fontWeight: 'bold' }}>🎮 Quick Seed Logins (Password: password123):</span>
            <div style={{ marginTop: '4px' }}>
              • mario@mku.edu (Computer Science)<br/>
              • peach@mku.edu (Business)<br/>
              • yoshi@mku.edu (Biology)
            </div>
          </div>

          <hr style={{ margin: '1.5rem 0', border: 'none', borderTop: '2px dashed #ccc' }} />

          <p style={{ fontSize: '0.9rem', color: '#555' }}>
            New player?{' '}
            <Link to="/register" style={{ color: 'var(--secondary-blue)', fontWeight: 'bold', textDecoration: 'none' }}>
              Create an Account 🏰
            </Link>
          </p>
        </div>

      </div>

    </div>
  );
};

export default Login;
