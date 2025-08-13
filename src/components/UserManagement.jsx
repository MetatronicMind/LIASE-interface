import React, { useState, useEffect } from 'react';
import { demoApi, formatDate } from '../utils/demoApi';
import { useAuth } from '../context/AuthContext';
import './UserManagement.css';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    role: '',
    name: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const { user: currentUser } = useAuth();

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await demoApi.getUsers();
      setUsers(data);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (user = null) => {
    setEditingUser(user);
    if (user) {
      setFormData({
        username: user.username,
        password: '', // Don't populate password for security
        role: user.role,
        name: user.name
      });
    } else {
      setFormData({
        username: '',
        password: '',
        role: '',
        name: ''
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingUser(null);
    setFormData({
      username: '',
      password: '',
      role: '',
      name: ''
    });
  };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const validatePassword = (password) => {
    const passwordRegex = /^(?=.*[A-Z])(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;
    return passwordRegex.test(password);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    // Validate password for new users or when password is being changed
    if (!editingUser || formData.password) {
      if (!validatePassword(formData.password)) {
        alert('Password must be at least 8 characters with one uppercase letter and one special character');
        setSubmitting(false);
        return;
      }
    }

    try {
      let result;
      const userData = { ...formData };
      
      // Don't send empty password for updates
      if (editingUser && !formData.password) {
        delete userData.password;
      }

      if (editingUser) {
        result = await demoApi.updateUser(editingUser.id, userData);
        await demoApi.logActivity('user_update', `Updated user: ${formData.username}`);
      } else {
        result = await demoApi.addUser(userData);
        await demoApi.logActivity('user_create', `Created new user: ${formData.username}`);
      }

      if (result.success) {
        await loadUsers();
        handleCloseModal();
        alert(`User ${editingUser ? 'updated' : 'created'} successfully!`);
      } else {
        alert(result.message || 'Error saving user');
      }
    } catch (error) {
      console.error('Error saving user:', error);
      alert('Error saving user. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (user) => {
    if (user.id === currentUser?.id) {
      alert('You cannot delete your own account');
      return;
    }

    if (!confirm(`Are you sure you want to delete user ${user.username}?`)) return;

    try {
      const result = await demoApi.deleteUser(user.id);
      if (result.success) {
        await demoApi.logActivity('user_delete', `Deleted user: ${user.username}`);
        await loadUsers();
        alert('User deleted successfully!');
      } else {
        alert(result.message || 'Error deleting user');
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Error deleting user. Please try again.');
    }
  };

  const getRoleBadgeClass = (role) => {
    switch (role) {
      case 'Admin':
        return 'role-admin';
      case 'Pharmacovigilance':
        return 'role-pv';
      case 'Sponsor/Auditor':
        return 'role-auditor';
      default:
        return '';
    }
  };

  if (loading) {
    return (
      <div className="loading">
        <span className="spinner"></span>
        Loading users...
      </div>
    );
  }

  return (
    <div className="user-management">
      <div className="user-management-header">
        <h1>User Management</h1>
        <p>Manage user accounts and access privileges</p>
        <button onClick={() => handleOpenModal()} className="btn btn-primary">
          ➕ Add New User
        </button>
      </div>

      <div className="card">
        <h3>System Users ({users.length})</h3>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Username</th>
                <th>Full Name</th>
                <th>Role</th>
                <th>Last Login</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>
                    <div className="username">{user.username}</div>
                    {user.id === currentUser?.id && (
                      <span className="current-user-badge">Current User</span>
                    )}
                  </td>
                  <td>{user.name}</td>
                  <td>
                    <span className={`role-badge ${getRoleBadgeClass(user.role)}`}>
                      {user.role}
                    </span>
                  </td>
                  <td>
                    {user.lastLogin ? formatDate(user.lastLogin) : 'Never'}
                  </td>
                  <td>
                    <div className="actions">
                      <button
                        onClick={() => handleOpenModal(user)}
                        className="btn btn-secondary btn-small"
                        title="Edit User"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDelete(user)}
                        className="btn btn-error btn-small"
                        title="Delete User"
                        disabled={user.id === currentUser?.id}
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {users.length === 0 && (
            <div className="no-data">
              <p>No users found.</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingUser ? 'Edit User' : 'Add New User'}</h3>
              <button onClick={handleCloseModal} className="modal-close">
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="modal-body">
              <div className="form-group">
                <label className="form-label">Username *</label>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  className="form-input"
                  required
                  placeholder="Enter username"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Full Name *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="form-input"
                  required
                  placeholder="Enter full name"
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  Password {editingUser ? '(leave blank to keep current)' : '*'}
                </label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="form-input"
                  required={!editingUser}
                  placeholder={editingUser ? "Enter new password (optional)" : "Enter password"}
                />
                <small className="password-hint">
                  Minimum 8 characters, 1 uppercase letter, 1 special character
                </small>
              </div>

              <div className="form-group">
                <label className="form-label">Role *</label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleInputChange}
                  className="form-select"
                  required
                >
                  <option value="">Select Role</option>
                  <option value="Admin">Admin</option>
                  <option value="Pharmacovigilance">Pharmacovigilance</option>
                  <option value="Sponsor/Auditor">Sponsor/Auditor</option>
                </select>
              </div>

              <div className="alert alert-info">
                <strong>Role Permissions:</strong>
                <ul>
                  <li><strong>Admin:</strong> Full system access including user and drug management</li>
                  <li><strong>Pharmacovigilance:</strong> Study review, commenting, and drug management</li>
                  <li><strong>Sponsor/Auditor:</strong> View-only access to audit trail and dashboard</li>
                </ul>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="btn btn-secondary"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <span className="spinner"></span>
                      Saving...
                    </>
                  ) : (
                    editingUser ? 'Update User' : 'Create User'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
