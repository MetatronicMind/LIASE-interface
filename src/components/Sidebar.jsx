import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Sidebar.css';

const Sidebar = () => {
  const location = useLocation();
  const { user } = useAuth();

  const isActive = (path) => location.pathname === path;

  const menuItems = [
    { path: '/dashboard', label: 'Dashboard', icon: '📊', roles: ['Admin', 'Pharmacovigilance', 'Sponsor/Auditor'] },
    { path: '/studies', label: 'Study Review', icon: '📄', roles: ['Admin', 'Pharmacovigilance'] },
    { path: '/drugs', label: 'Drug Management', icon: '💊', roles: ['Admin', 'Pharmacovigilance'] },
    { path: '/users', label: 'User Management', icon: '👥', roles: ['Admin'] },
    { path: '/audit', label: 'Audit Trail', icon: '📋', roles: ['Admin', 'Sponsor/Auditor'] }
  ];

  const filteredMenuItems = menuItems.filter(item => 
    item.roles.includes(user?.role)
  );

  return (
    <nav className="sidebar">
      <div className="sidebar-menu">
        {filteredMenuItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`sidebar-item ${isActive(item.path) ? 'active' : ''}`}
          >
            <span className="sidebar-icon">{item.icon}</span>
            <span className="sidebar-label">{item.label}</span>
          </Link>
        ))}
      </div>
      
      <div className="sidebar-footer">
        <div className="role-badge">
          <span className="role-icon">🔐</span>
          <span className="role-text">{user?.role}</span>
        </div>
      </div>
    </nav>
  );
};

export default Sidebar;
