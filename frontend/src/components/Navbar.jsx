import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, Calendar, Users, Home, Award, ChevronDown } from 'lucide-react';

const Navbar = () => {
  const { user, logout, gainReward } = useAuth();
  const location = useLocation();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(document.body.classList.contains('dark-mode'));

  // Sync state with body class on mount
  useEffect(() => {
    setDarkMode(document.body.classList.contains('dark-mode'));
  }, []);

  const toggleDarkMode = () => {
    if (document.body.classList.contains('dark-mode')) {
      document.body.classList.remove('dark-mode');
      localStorage.setItem('campussync_theme', 'light');
      setDarkMode(false);
    } else {
      document.body.classList.add('dark-mode');
      localStorage.setItem('campussync_theme', 'dark');
      setDarkMode(true);
    }
  };

  if (!user) return null;

  // Calculate XP within the current level (each level requires 500 XP)
  const currentLvlXp = user.xp % 500;
  const xpPercent = Math.round((currentLvlXp / 500) * 100);

  // Available game avatars
  const AVATARS = [
    { id: 'mario', emoji: '🔴', name: 'Mario Red' },
    { id: 'luigi', emoji: '🟢', name: 'Luigi Green' },
    { id: 'peach', emoji: '🌸', name: 'Peach Pink' },
    { id: 'toad', emoji: '🍄', name: 'Toad Mush' },
    { id: 'yoshi', emoji: '🦖', name: 'Yoshi Dino' }
  ];

  const handleAvatarChange = async (avatarId) => {
    try {
      const response = await fetch('http://localhost:5001/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('campussync_token')}`
        },
        body: JSON.stringify({ avatar: avatarId })
      });

      if (response.ok) {
        // Trigger minor XP reward (+10 XP) for profile change!
        await gainReward(10, 0);
        window.location.reload(); // Refresh to sync avatar across pages
      }
    } catch (err) {
      console.error('Failed to update avatar:', err);
    }
  };

  const getAvatarEmoji = (id) => {
    switch (id) {
      case 'mario': return '🔴';
      case 'luigi': return '🟢';
      case 'peach': return '🌸';
      case 'toad': return '🍄';
      case 'yoshi': return '🦖';
      default: return '🔴';
    }
  };

  return (
    <nav className="retro-panel" style={{
      borderRadius: '0px 0px 16px 16px',
      borderTop: 'none',
      margin: '0 auto 1.5rem auto',
      maxWidth: '1200px',
      padding: '0.8rem 1.5rem',
      backgroundColor: 'var(--cloud-white)',
      display: 'flex',
      flexDirection: 'column',
      gap: '1rem',
      boxShadow: '0 6px 0 var(--nes-black)',
      position: 'sticky',
      top: 0,
      zIndex: 1000
    }}>
      
      {/* Upper Navigation Row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        
        {/* Logo */}
        <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '1.8rem', animation: 'starBounce 2s ease-in-out infinite alternate', display: 'inline-block' }}>⭐</span>
          <span className="retro-font" style={{ 
            fontSize: '1.4rem', 
            color: 'var(--primary-red)', 
            textShadow: '2px 2px 0px #fbd000, 3px 3px 0px var(--nes-black)' 
          }}>
            CAMPUSSYNC
          </span>
        </Link>

        {/* Gamified Status Counters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.2rem', flexWrap: 'wrap' }}>
          
          {/* Level Badge */}
          <div style={{ 
            fontFamily: 'var(--font-retro)', 
            fontSize: '0.75rem', 
            background: 'var(--nes-black)', 
            color: 'var(--cloud-white)', 
            padding: '4px 8px', 
            borderRadius: '4px',
            border: '2px solid var(--cloud-white)',
            boxShadow: '2px 2px 0px var(--nes-black)'
          }}>
            LV.{user.level}
          </div>

          {/* XP Progress Bar */}
          <div style={{ width: '130px' }} title={`XP: ${user.xp} (Level progress: ${currentLvlXp}/500)`}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', fontFamily: 'var(--font-retro)', marginBottom: '3px' }}>
              <span>XP</span>
              <span>{xpPercent}%</span>
            </div>
            <div className="mario-progress-container" style={{ height: '12px' }}>
              <div className="mario-progress-bar progress-blue" style={{ width: `${xpPercent}%` }}></div>
            </div>
          </div>

          {/* Gold Coin Counter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: '#fffbeb', border: '2px solid var(--nes-black)', padding: '3px 8px', borderRadius: '6px', boxShadow: '2px 2px 0px var(--nes-black)' }}>
            <span className="coin-spin"></span>
            <span className="retro-font" style={{ fontSize: '0.8rem', color: '#b84800', fontWeight: 'bold' }}>
              x{user.coins}
            </span>
          </div>

          {/* Dark Mode Switcher */}
          <button 
            onClick={toggleDarkMode}
            className="retro-btn shake-on-hover"
            style={{
              padding: '6px 12px',
              fontSize: '0.65rem',
              backgroundColor: darkMode ? '#334155' : '#fffdeb',
              color: darkMode ? '#ffffff' : 'var(--nes-black)',
              border: '2px solid var(--nes-black)',
              boxShadow: '2px 2px 0px var(--nes-black)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              height: '34px'
            }}
          >
            <span>{darkMode ? '🌙 DARK' : '☀️ LIGHT'}</span>
          </button>

          {/* User Profile / Avatar Dropdown */}
          <div style={{ position: 'relative' }}>
            <div 
              onClick={() => setDropdownOpen(!dropdownOpen)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                cursor: 'pointer',
                background: '#f5f5f5',
                border: '2px solid var(--nes-black)',
                padding: '4px 10px',
                borderRadius: '8px',
                userSelect: 'none',
                boxShadow: '2px 2px 0px #222'
              }}
            >
              <span style={{ fontSize: '1.2rem' }}>{getAvatarEmoji(user.avatar)}</span>
              <span style={{ fontWeight: '600', fontSize: '0.9rem', color: 'var(--nes-black)' }}>{user.name.split(' ')[0]}</span>
              <ChevronDown size={16} />
            </div>

            {dropdownOpen && (
              <div className="retro-panel" style={{
                position: 'absolute',
                top: '120%',
                right: 0,
                width: '200px',
                padding: '0.8rem',
                backgroundColor: '#ffffff',
                border: '3px solid var(--nes-black)',
                boxShadow: '4px 4px 0px #222',
                borderRadius: '8px',
                zIndex: 1100
              }}>
                <div style={{ fontSize: '0.7rem', fontFamily: 'var(--font-retro)', color: '#888', marginBottom: '8px', textAlign: 'center' }}>
                  CHOOSE AVATAR
                </div>
                {AVATARS.map(av => (
                  <div 
                    key={av.id}
                    onClick={() => {
                      handleAvatarChange(av.id);
                      setDropdownOpen(false);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.6rem',
                      padding: '6px 8px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                      backgroundColor: user.avatar === av.id ? '#fffdeb' : 'transparent',
                      border: user.avatar === av.id ? '1px solid var(--accent-yellow)' : '1px solid transparent'
                    }}
                    className="shake-on-hover"
                  >
                    <span>{av.emoji}</span>
                    <span>{av.name}</span>
                  </div>
                ))}
                
                <hr style={{ margin: '8px 0', border: 'none', borderTop: '2px dashed #ddd' }} />

                <button 
                  onClick={logout}
                  style={{
                    width: '100%',
                    border: 'none',
                    background: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    color: 'var(--primary-red)',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    fontWeight: '600',
                    padding: '6px 8px'
                  }}
                >
                  <LogOut size={16} />
                  <span>Exit Game</span>
                </button>
              </div>
            )}
          </div>

        </div>

      </div>

      {/* Navigation Links Row */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        gap: '1rem', 
        flexWrap: 'wrap',
        borderTop: '2px dashed #ddd',
        paddingTop: '0.8rem'
      }}>
        
        <Link 
          to="/" 
          className="retro-btn" 
          style={{
            padding: '6px 12px',
            fontSize: '0.75rem',
            backgroundColor: location.pathname === '/' ? 'var(--secondary-blue)' : undefined,
            color: location.pathname === '/' ? '#ffffff' : undefined,
            boxShadow: location.pathname === '/' ? 'none' : (darkMode ? '2px 2px 0px #ffffff' : '2px 2px 0px #000'),
            transform: location.pathname === '/' ? 'translate(2px, 2px)' : 'none'
          }}
        >
          <Home size={14} />
          <span>Dashboard</span>
        </Link>

        <Link 
          to="/schedule" 
          className="retro-btn" 
          style={{
            padding: '6px 12px',
            fontSize: '0.75rem',
            backgroundColor: location.pathname === '/schedule' ? 'var(--primary-red)' : undefined,
            color: location.pathname === '/schedule' ? '#ffffff' : undefined,
            boxShadow: location.pathname === '/schedule' ? 'none' : (darkMode ? '2px 2px 0px #ffffff' : '2px 2px 0px #000'),
            transform: location.pathname === '/schedule' ? 'translate(2px, 2px)' : 'none'
          }}
        >
          <Calendar size={14} />
          <span>Timetable</span>
        </Link>

        <Link 
          to="/social" 
          className="retro-btn" 
          style={{
            padding: '6px 12px',
            fontSize: '0.75rem',
            backgroundColor: location.pathname === '/social' ? 'var(--accent-green)' : undefined,
            color: location.pathname === '/social' ? '#ffffff' : undefined,
            boxShadow: location.pathname === '/social' ? 'none' : (darkMode ? '2px 2px 0px #ffffff' : '2px 2px 0px #000'),
            transform: location.pathname === '/social' ? 'translate(2px, 2px)' : 'none'
          }}
        >
          <Users size={14} />
          <span>Match Hub</span>
        </Link>

        <Link 
          to="/personality" 
          className="retro-btn" 
          style={{
            padding: '6px 12px',
            fontSize: '0.75rem',
            backgroundColor: location.pathname === '/personality' ? 'var(--accent-yellow)' : undefined,
            color: location.pathname === '/personality' ? '#000000' : undefined,
            boxShadow: location.pathname === '/personality' ? 'none' : (darkMode ? '2px 2px 0px #ffffff' : '2px 2px 0px #000'),
            transform: location.pathname === '/personality' ? 'translate(2px, 2px)' : 'none'
          }}
        >
          <Award size={14} />
          <span>Personality</span>
        </Link>

      </div>

    </nav>
  );
};

export default Navbar;
