import React, { useEffect, useState } from 'react';

const HoppingMario = () => {
  const [position, setPosition] = useState({ x: -100, y: 0 });

  useEffect(() => {
    let animationFrame;
    let start = null;

    const moveMario = (timestamp) => {
      if (!start) start = timestamp;
      const progress = timestamp - start;
      
      const speed = 0.15; // px per ms
      const screenWidth = window.innerWidth;
      
      let newX = -100 + (progress * speed);
      
      if (newX > screenWidth + 100) {
        start = timestamp;
        newX = -100;
      }
      
      const hopFrequency = 0.008;
      const hopHeight = 40;
      // Absolute sine wave for bounce effect
      const newY = Math.abs(Math.sin(progress * hopFrequency)) * -hopHeight;

      setPosition({ x: newX, y: newY });
      animationFrame = requestAnimationFrame(moveMario);
    };

    animationFrame = requestAnimationFrame(moveMario);
    return () => cancelAnimationFrame(animationFrame);
  }, []);

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '20px',
        left: '0px',
        transform: `translate(${position.x}px, ${position.y}px)`,
        zIndex: 9999,
        pointerEvents: 'none',
        filter: 'drop-shadow(0px 8px 4px rgba(0,0,0,0.4))'
      }}
    >
      <div style={{
        width: '40px',
        height: '40px',
        backgroundColor: 'var(--primary-red)',
        borderRadius: '20px 20px 8px 8px',
        position: 'relative',
        boxShadow: 'inset -4px -4px 0 rgba(0,0,0,0.2)'
      }}>
        {/* Hat brim */}
        <div style={{ 
          position: 'absolute', top: '12px', right: '-8px', width: '20px', height: '8px', 
          backgroundColor: 'var(--primary-red)', borderRadius: '8px' 
        }}></div>
        {/* Face */}
        <div style={{ 
          position: 'absolute', top: '18px', right: '4px', width: '24px', height: '22px', 
          backgroundColor: 'var(--mario-peach)', borderRadius: '8px',
          boxShadow: 'inset -2px -2px 0 rgba(0,0,0,0.1)'
        }}>
          {/* Mustache */}
          <div style={{ 
            position: 'absolute', top: '8px', right: '-4px', width: '16px', height: '6px', 
            backgroundColor: '#222', borderRadius: '4px' 
          }}></div>
          {/* Eye */}
          <div style={{ 
            position: 'absolute', top: '3px', right: '6px', width: '4px', height: '6px', 
            backgroundColor: '#222', borderRadius: '50%' 
          }}></div>
        </div>
        {/* Overalls (Blue bottom) */}
        <div style={{
          position: 'absolute', bottom: '-10px', left: '8px', width: '24px', height: '14px',
          backgroundColor: 'var(--secondary-blue)', borderRadius: '4px',
          boxShadow: 'inset -2px -2px 0 rgba(0,0,0,0.2)'
        }}></div>
      </div>
    </div>
  );
};

export default HoppingMario;
