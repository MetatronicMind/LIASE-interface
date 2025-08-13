import React, { createContext, useContext, useState, useEffect } from 'react';
import { demoApi } from '../utils/demoApi';

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
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing session
    const savedUser = localStorage.getItem('liase_user');
    if (savedUser) {
      const userData = JSON.parse(savedUser);
      setUser(userData);
      setIsAuthenticated(true);
    }
    setLoading(false);
  }, []);

  const login = async (username, password, role) => {
    try {
      setLoading(true);
      const response = await demoApi.login(username, password, role);
      
      if (response.success) {
        const userData = response.user;
        setUser(userData);
        setIsAuthenticated(true);
        localStorage.setItem('liase_user', JSON.stringify(userData));
        
        // Log the login activity
        await demoApi.logActivity('login', `User ${username} logged in with role ${role}`);
        
        return { success: true };
      } else {
        return { success: false, message: response.message };
      }
    } catch (error) {
      return { success: false, message: 'Login failed. Please try again.' };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      if (user) {
        await demoApi.logActivity('logout', `User ${user.username} logged out`);
      }
      setUser(null);
      setIsAuthenticated(false);
      localStorage.removeItem('liase_user');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const value = {
    user,
    isAuthenticated,
    loading,
    login,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
