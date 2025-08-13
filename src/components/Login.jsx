import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import './Login.css';

const Login = () => {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    role: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login } = useAuth();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError(''); // Clear error when user types
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Validate password requirements
    const passwordRegex = /^(?=.*[A-Z])(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;
    if (!passwordRegex.test(formData.password)) {
      setError('Password must be at least 8 characters with one uppercase letter and one special character');
      setLoading(false);
      return;
    }

    const result = await login(formData.username, formData.password, formData.role);
    
    if (!result.success) {
      setError(result.message);
    }
    
    setLoading(false);
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>LIASE</h1>
          <p>Literature Automation and Segregation</p>
        </div>
        
        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="username" className="form-label">Username</label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              className="form-input"
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password" className="form-label">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="form-input"
              required
              disabled={loading}
            />
            <small className="password-hint">
              Minimum 8 characters, 1 uppercase letter, 1 special character
            </small>
          </div>

          <div className="form-group">
            <label htmlFor="role" className="form-label">Role</label>
            <select
              id="role"
              name="role"
              value={formData.role}
              onChange={handleChange}
              className="form-select"
              required
              disabled={loading}
            >
              <option value="">Select Role</option>
              <option value="Admin">Admin</option>
              <option value="Pharmacovigilance">Pharmacovigilance</option>
              <option value="Sponsor/Auditor">Sponsor/Auditor</option>
            </select>
          </div>

          {error && (
            <div className="alert alert-error">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary login-button"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner"></span>
                Signing In...
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <div className="demo-credentials">
          <h3>Demo Credentials:</h3>
          <div className="credentials-list">
            <div><strong>Admin:</strong> admin / Admin123!</div>
            <div><strong>Pharmacovigilance:</strong> pv_user1 / Pharma123!</div>
            <div><strong>Sponsor/Auditor:</strong> auditor / Audit123!</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
