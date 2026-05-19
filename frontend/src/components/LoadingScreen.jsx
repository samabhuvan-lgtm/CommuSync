import React, { useEffect, useState } from 'react';

const LoadingScreen = ({ text = "LOADING..." }) => {
  const [dots, setDots] = useState('');

  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.');
    }, 400);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      backgroundColor: '#222222',
      color: '#ffffff',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 9999,
      fontFamily: "'Silkscreen', monospace"
    }}>
      <div style={{ textAlign: 'center', maxWidth: '400px', width: '100%', padding: '2rem' }}>
        
        {/* World Status */}
        <h2 style={{ fontSize: '1.25rem', color: '#ffb4b4', marginBottom: '2.5rem', letterSpacing: '2px' }}>
          WORLD 1-1
        </h2>

        {/* Mario Banner Title */}
        <h1 style={{ fontSize: '2rem', color: '#fbd000', marginBottom: '2.5rem', textShadow: '4px 4px 0px #000' }}>
          CAMPUSSYNC
        </h1>

        {/* Lives Counter (Gamified load screen) */}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1.5rem', marginBottom: '3.5rem' }}>
          <div style={{
            width: '40px',
            height: '40px',
            background: '#e52521',
            border: '3px solid #ffffff',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.2rem',
            boxShadow: '0 4px 0 rgba(0,0,0,0.4)'
          }}>
            🔴
          </div>
          <span style={{ fontSize: '1.5rem' }}>x</span>
          <span style={{ fontSize: '1.8rem', color: '#fbd000' }}>03</span>
        </div>

        {/* Loading details */}
        <div style={{ fontSize: '0.9rem', color: '#ffffff', letterSpacing: '1px', textTransform: 'uppercase' }}>
          {text}{dots}
        </div>

        {/* Animated brick line */}
        <div style={{
          marginTop: '3rem',
          height: '12px',
          width: '100%',
          backgroundColor: '#b84800',
          border: '3px solid #000000',
          position: 'relative'
        }}>
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            height: '100%',
            width: '70%',
            backgroundColor: '#fbd000',
            animation: 'loadingProgress 2s linear infinite'
          }}></div>
        </div>
      </div>

      <style>{`
        @keyframes loadingProgress {
          0% { left: -100%; width: 30%; }
          50% { width: 60%; }
          100% { left: 100%; width: 30%; }
        }
      `}</style>
    </div>
  );
};

export default LoadingScreen;
