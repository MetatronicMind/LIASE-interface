import React, { useState, useEffect } from 'react';
import { demoApi, formatDate } from '../utils/demoApi';
import { useAuth } from '../context/AuthContext';
import './Dashboard.css';

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processingStudies, setProcessingStudies] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    loadDashboardStats();
  }, []);

  const loadDashboardStats = async () => {
    try {
      setLoading(true);
      const data = await demoApi.getDashboardStats();
      setStats(data);
    } catch (error) {
      console.error('Error loading dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleProcessStudies = async () => {
    setProcessingStudies(true);
    try {
      // Simulate processing multiple drugs
      await demoApi.processStudies('Aspirin');
      await demoApi.logActivity('ai_processing', 'Initiated AI processing for daily studies');
      
      // Reload stats to reflect new data
      await loadDashboardStats();
      
      alert('Studies processed successfully! Check Study Review for new results.');
    } catch (error) {
      console.error('Error processing studies:', error);
      alert('Error processing studies. Please try again.');
    } finally {
      setProcessingStudies(false);
    }
  };

  if (loading) {
    return (
      <div className="loading">
        <span className="spinner"></span>
        Loading dashboard...
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Dashboard</h1>
        <p>Welcome back, {user?.name}</p>
      </div>

      {/* Statistics Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">📄</div>
          <div className="stat-content">
            <div className="stat-number">{stats?.totalStudies}</div>
            <div className="stat-label">Total Studies</div>
          </div>
        </div>

        <div className="stat-card pending">
          <div className="stat-icon">⏳</div>
          <div className="stat-content">
            <div className="stat-number">{stats?.pendingReview}</div>
            <div className="stat-label">Pending Review</div>
          </div>
        </div>

        <div className="stat-card under-review">
          <div className="stat-icon">👁️</div>
          <div className="stat-content">
            <div className="stat-number">{stats?.underReview}</div>
            <div className="stat-label">Under Review</div>
          </div>
        </div>

        <div className="stat-card approved">
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <div className="stat-number">{stats?.approved}</div>
            <div className="stat-label">Approved</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">💊</div>
          <div className="stat-content">
            <div className="stat-number">{stats?.activeDrugs}</div>
            <div className="stat-label">Active Drugs</div>
          </div>
        </div>
      </div>

      <div className="dashboard-content">
        {/* AI Processing Section - Only for Admin and Pharmacovigilance */}
        {(user?.role === 'Admin' || user?.role === 'Pharmacovigilance') && (
          <div className="card">
            <h2>AI Processing</h2>
            <p>Process new studies from PubMed databases for all active drugs.</p>
            <div className="alert alert-info">
              <strong>Note:</strong> AI processing typically runs automatically at midnight. 
              Use this button for manual processing or testing.
            </div>
            <button 
              onClick={handleProcessStudies}
              disabled={processingStudies}
              className="btn btn-primary"
            >
              {processingStudies ? (
                <>
                  <span className="spinner"></span>
                  Processing Studies...
                </>
              ) : (
                'Start AI Processing'
              )}
            </button>
          </div>
        )}

        {/* Recent Activity */}
        <div className="card">
          <h2>Recent Activity</h2>
          <div className="activity-list">
            {stats?.recentActivity?.map((activity) => (
              <div key={activity.id} className="activity-item">
                <div className="activity-user">{activity.userName}</div>
                <div className="activity-details">{activity.details}</div>
                <div className="activity-time">{formatDate(activity.timestamp)}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card">
          <h2>Quick Actions</h2>
          <div className="quick-actions">
            {(user?.role === 'Admin' || user?.role === 'Pharmacovigilance') && (
              <>
                <button 
                  onClick={() => window.location.href = '/studies'} 
                  className="btn btn-primary"
                >
                  📄 Review Studies
                </button>
                <button 
                  onClick={() => window.location.href = '/drugs'} 
                  className="btn btn-secondary"
                >
                  💊 Manage Drugs
                </button>
              </>
            )}
            {user?.role === 'Admin' && (
              <button 
                onClick={() => window.location.href = '/users'} 
                className="btn btn-secondary"
              >
                👥 Manage Users
              </button>
            )}
            {(user?.role === 'Admin' || user?.role === 'Sponsor/Auditor') && (
              <button 
                onClick={() => window.location.href = '/audit'} 
                className="btn btn-secondary"
              >
                📋 View Audit Trail
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
