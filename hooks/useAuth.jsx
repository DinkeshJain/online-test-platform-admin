import { useState, useEffect, createContext, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../lib/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastActivity, setLastActivity] = useState(Date.now());

  // Session timeout: 24 hours
  const SESSION_TIMEOUT = 24 * 60 * 60 * 1000;

  useEffect(() => {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    const savedLastActivity = localStorage.getItem('lastActivity');
    
    if (token && savedUser && savedLastActivity) {
      const timeSinceLastActivity = Date.now() - parseInt(savedLastActivity);
      
      if (timeSinceLastActivity > SESSION_TIMEOUT) {
        // Session expired
        logout();
      } else {
        setUser(JSON.parse(savedUser));
        setLastActivity(parseInt(savedLastActivity));
      }
    }
    setLoading(false);
  }, []);

  // Update last activity on user interaction
  useEffect(() => {
    const updateActivity = () => {
      const now = Date.now();
      setLastActivity(now);
      localStorage.setItem('lastActivity', now.toString());
    };

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    if (user) {
      events.forEach(event => {
        document.addEventListener(event, updateActivity, true);
      });
    }

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, updateActivity, true);
      });
    };
  }, [user]);

  // Check for session timeout periodically
  useEffect(() => {
    if (!user) return;

    const checkSession = () => {
      const timeSinceLastActivity = Date.now() - lastActivity;
      if (timeSinceLastActivity > SESSION_TIMEOUT) {
        logout();
      }
    };

    const interval = setInterval(checkSession, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [user, lastActivity]);

  const login = async (username, password) => {
    try {
      const response = await api.post('/auth/login', { username, password });
      const { token, user } = response.data;
      
      const now = Date.now();
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('lastActivity', now.toString());
      setUser(user);
      setLastActivity(now);
      
      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      console.error('Error details:', error.response?.data);
      return { 
        success: false, 
        message: error.response?.data?.message || 'Login failed' 
      };
    }
  };

  const registerAdmin = async (name, username) => {
    try {
      const response = await api.post('/auth/register/admin', { name, username });
      const { token, user } = response.data;
      
      const now = Date.now();
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('lastActivity', now.toString());
      setUser(user);
      setLastActivity(now);
      
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.message || 'Admin registration failed' 
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('lastActivity');
    setUser(null);
    setLastActivity(Date.now());
  };

  const forceLogout = () => {
    logout();
    window.location.href = '/login';
  };

  const value = {
    user,
    login,
    registerAdmin,
    logout,
    forceLogout,
    loading,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    isEvaluator: user?.role === 'evaluator',
    isStudent: user?.role === 'student'
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

