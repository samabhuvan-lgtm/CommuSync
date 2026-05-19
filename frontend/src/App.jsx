import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import ScheduleManager from './pages/ScheduleManager';
import PsychometricTest from './pages/PsychometricTest';
import SocialHub from './pages/SocialHub';
import LoadingScreen from './components/LoadingScreen';
import HoppingMario from './components/HoppingMario';

// Protected Route wrapper
const ProtectedRoute = ({ children, requireTest = false }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingScreen text="VERIFYING PLAYER SESSION..." />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requireTest && !user.hasCompletedTest) {
    return <Navigate to="/personality" replace />;
  }

  return children;
};

// Public Route wrapper (redirects to dashboard if already logged in)
const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingScreen text="SYNCING CHANNELS..." />;
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return children;
};

const AppContent = () => {
  return (
    <Routes>
      {/* Public Pages */}
      <Route 
        path="/login" 
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        } 
      />
      <Route 
        path="/register" 
        element={
          <PublicRoute>
            <Register />
          </PublicRoute>
        } 
      />

      {/* Protected Pages */}
      <Route 
        path="/" 
        element={
          <ProtectedRoute requireTest={true}>
            <Dashboard />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/schedule" 
        element={
          <ProtectedRoute requireTest={true}>
            <ScheduleManager />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/personality" 
        element={
          <ProtectedRoute requireTest={false}>
            <PsychometricTest />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/social" 
        element={
          <ProtectedRoute requireTest={true}>
            <SocialHub />
          </ProtectedRoute>
        } 
      />

      {/* Wildcard Redirect */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

function App() {
  useEffect(() => {
    const savedTheme = localStorage.getItem('campussync_theme');
    if (savedTheme === 'dark') {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  }, []);

  return (
    <Router>
      <AuthProvider>
        <HoppingMario />
        <AppContent />
      </AuthProvider>
    </Router>
  );
}

export default App;
