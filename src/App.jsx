import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';

// Components
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import DrugManagement from './components/DrugManagement';
import StudyReview from './components/StudyReview';
import UserManagement from './components/UserManagement';
import AuditTrail from './components/AuditTrail';
import Header from './components/Header';
import Sidebar from './components/Sidebar';

// Context
import { AuthProvider, useAuth } from './context/AuthContext';

function AppContent() {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Login />;
  }

  return (
    <div className="app">
      <Header />
      <div className="app-body">
        <Sidebar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/drugs" element={<DrugManagement />} />
            <Route path="/studies" element={<StudyReview />} />
            {(user?.role === 'Admin') && (
              <Route path="/users" element={<UserManagement />} />
            )}
            {(user?.role === 'Admin' || user?.role === 'Sponsor/Auditor') && (
              <Route path="/audit" element={<AuditTrail />} />
            )}
            <Route path="*" element={<Navigate to="/dashboard" />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  );
}

export default App;
