import React from 'react';
import { useAuth } from '../context/AuthContext';
import { formatDate } from '../utils/demoApi';
import './Header.css';

const Header = () => {
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
  };

  return (
    <header className="header">
      <div className="header-left">
        <h1 className="header-title">LIASE</h1>
        <span className="header-subtitle">Literature Automation and Segregation</span>
      </div>
      
      <div className="header-right">
        <div className="user-info">
          <div className="user-details">
            <span className="user-name">{user?.name}</span>
            <span className="user-role">{user?.role}</span>
            {user?.lastLogin && (
              <span className="last-login">
                Last login: {formatDate(user.lastLogin)}
              </span>
            )}
          </div>
          <button onClick={handleLogout} className="btn btn-secondary logout-btn">
            Sign Out
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
