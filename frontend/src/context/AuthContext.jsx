import React, { createContext, useState, useEffect, useContext } from 'react';
import { API_BASE } from '../config';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('campussync_token'));
  const [loading, setLoading] = useState(true);

  // Set user profile using JWT token
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`${API_BASE}/api/auth/me`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
        } else {
          // Token expired or invalid
          logout();
        }
      } catch (error) {
        console.error('Error loading user profile:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [token]);

  // Login handler
  const login = async (email, password) => {
    const response = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (!response.ok) {
      const errorMsg = data.details 
        ? `${data.error} Details: ${data.details}` 
        : (data.error || 'Failed to login');
      throw new Error(errorMsg);
    }

    localStorage.setItem('campussync_token', data.token);
    setToken(data.token);
    setUser(data.user);
    return data;
  };

  // Register handler
  const register = async (userData) => {
    const response = await fetch(`${API_BASE}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(userData)
    });

    const data = await response.json();

    if (!response.ok) {
      const errorMsg = data.details 
        ? `${data.error} Details: ${data.details}` 
        : (data.error || 'Failed to register');
      throw new Error(errorMsg);
    }

    localStorage.setItem('campussync_token', data.token);
    setToken(data.token);
    setUser(data.user);
    return data;
  };

  // Logout handler
  const logout = () => {
    localStorage.removeItem('campussync_token');
    setToken(null);
    setUser(null);
  };

  // Reward XP/Coins on screen actions
  const gainReward = async (xpGained, coinsGained) => {
    if (!token) return;

    try {
      const response = await fetch(`${API_BASE}/api/auth/reward`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ xpGained, coinsGained })
      });

      if (response.ok) {
        const data = await response.json();
        setUser(prev => ({
          ...prev,
          xp: data.xp,
          level: data.level,
          coins: data.coins
        }));
        return data; // returns whether levelUp occurred
      }
    } catch (error) {
      console.error('Error rewarding player:', error);
    }
  };

  // Re-fetch profile to sync state (e.g. after psychometric test)
  const syncProfile = async () => {
    if (!token) return;
    try {
      const response = await fetch(`${API_BASE}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      }
    } catch (error) {
      console.error('Error syncing profile:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, gainReward, syncProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
