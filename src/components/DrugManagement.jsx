import React, { useState, useEffect } from 'react';
import { demoApi, formatDate } from '../utils/demoApi';
import { useAuth } from '../context/AuthContext';
import './DrugManagement.css';

const DrugManagement = () => {
  const [drugs, setDrugs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingDrug, setEditingDrug] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    manufacturer: '',
    query: '',
    rsi: '',
    nextSearchDate: '',
    status: 'Active'
  });
  const [submitting, setSubmitting] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    loadDrugs();
  }, []);

  const loadDrugs = async () => {
    try {
      setLoading(true);
      const data = await demoApi.getDrugs();
      setDrugs(data);
    } catch (error) {
      console.error('Error loading drugs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (drug = null) => {
    setEditingDrug(drug);
    if (drug) {
      setFormData({
        name: drug.name,
        manufacturer: drug.manufacturer,
        query: drug.query,
        rsi: drug.rsi,
        nextSearchDate: drug.nextSearchDate,
        status: drug.status
      });
    } else {
      setFormData({
        name: '',
        manufacturer: '',
        query: '',
        rsi: '',
        nextSearchDate: '',
        status: 'Active'
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingDrug(null);
    setFormData({
      name: '',
      manufacturer: '',
      query: '',
      rsi: '',
      nextSearchDate: '',
      status: 'Active'
    });
  };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      let result;
      if (editingDrug) {
        result = await demoApi.updateDrug(editingDrug.id, formData);
        await demoApi.logActivity('drug_update', `Updated drug information for ${formData.name}`);
      } else {
        result = await demoApi.addDrug(formData);
        await demoApi.logActivity('drug_create', `Added new drug: ${formData.name}`);
      }

      if (result.success) {
        await loadDrugs();
        handleCloseModal();
        alert(`Drug ${editingDrug ? 'updated' : 'added'} successfully!`);
      } else {
        alert(result.message || 'Error saving drug');
      }
    } catch (error) {
      console.error('Error saving drug:', error);
      alert('Error saving drug. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (drug) => {
    if (!confirm(`Are you sure you want to delete ${drug.name}?`)) return;

    try {
      const result = await demoApi.deleteDrug(drug.id);
      if (result.success) {
        await demoApi.logActivity('drug_delete', `Deleted drug: ${drug.name}`);
        await loadDrugs();
        alert('Drug deleted successfully!');
      } else {
        alert(result.message || 'Error deleting drug');
      }
    } catch (error) {
      console.error('Error deleting drug:', error);
      alert('Error deleting drug. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="loading">
        <span className="spinner"></span>
        Loading drugs...
      </div>
    );
  }

  return (
    <div className="drug-management">
      <div className="drug-management-header">
        <h1>Drug Management</h1>
        <p>Manage drug database including queries, sponsors, and RSI information</p>
        <button onClick={() => handleOpenModal()} className="btn btn-primary">
          ➕ Add New Drug
        </button>
      </div>

      <div className="card">
        <h3>Drugs Database ({drugs.length})</h3>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Drug Name</th>
                <th>Manufacturer</th>
                <th>RSI</th>
                <th>Next Search</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {drugs.map((drug) => (
                <tr key={drug.id}>
                  <td>
                    <div className="drug-name">{drug.name}</div>
                    <div className="drug-query">{drug.query}</div>
                  </td>
                  <td>{drug.manufacturer}</td>
                  <td>
                    <span className="rsi-code">{drug.rsi}</span>
                  </td>
                  <td>{formatDate(drug.nextSearchDate)}</td>
                  <td>
                    <span className={`status ${drug.status === 'Active' ? 'status-approved' : 'status-pending'}`}>
                      {drug.status}
                    </span>
                  </td>
                  <td>
                    <div className="actions">
                      <button
                        onClick={() => handleOpenModal(drug)}
                        className="btn btn-secondary btn-small"
                        title="Edit Drug"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDelete(drug)}
                        className="btn btn-error btn-small"
                        title="Delete Drug"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {drugs.length === 0 && (
            <div className="no-data">
              <p>No drugs found. Add a new drug to get started.</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingDrug ? 'Edit Drug' : 'Add New Drug'}</h3>
              <button onClick={handleCloseModal} className="modal-close">
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="modal-body">
              <div className="form-group">
                <label className="form-label">Drug Name *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="form-input"
                  required
                  placeholder="Enter drug name"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Manufacturer/Sponsor *</label>
                <input
                  type="text"
                  name="manufacturer"
                  value={formData.manufacturer}
                  onChange={handleInputChange}
                  className="form-input"
                  required
                  placeholder="Enter manufacturer name"
                />
              </div>

              <div className="form-group">
                <label className="form-label">PubMed Query *</label>
                <textarea
                  name="query"
                  value={formData.query}
                  onChange={handleInputChange}
                  className="form-input query-textarea"
                  required
                  placeholder="Enter PubMed search query (e.g., drug[tiab] AND adverse event[tiab])"
                  rows="3"
                />
              </div>

              <div className="form-group">
                <label className="form-label">RSI Code *</label>
                <input
                  type="text"
                  name="rsi"
                  value={formData.rsi}
                  onChange={handleInputChange}
                  className="form-input"
                  required
                  placeholder="Enter RSI reference code"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Next Search Date *</label>
                <input
                  type="date"
                  name="nextSearchDate"
                  value={formData.nextSearchDate}
                  onChange={handleInputChange}
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Status</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  className="form-select"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Suspended">Suspended</option>
                </select>
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
                    editingDrug ? 'Update Drug' : 'Add Drug'
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

export default DrugManagement;
