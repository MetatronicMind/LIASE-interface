import React, { useState, useEffect } from 'react';
import { demoApi, formatDate } from '../utils/demoApi';
import { useAuth } from '../context/AuthContext';
import './StudyReview.css';

const StudyReview = () => {
  const [studies, setStudies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudy, setSelectedStudy] = useState(null);
  const [filters, setFilters] = useState({
    drugName: '',
    status: '',
    dateFrom: '',
    dateTo: ''
  });
  const [comment, setComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    loadStudies();
  }, [filters]);

  const loadStudies = async () => {
    try {
      setLoading(true);
      const data = await demoApi.getStudies(filters);
      setStudies(data);
    } catch (error) {
      console.error('Error loading studies:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    setFilters({
      ...filters,
      [e.target.name]: e.target.value
    });
  };

  const handleStudySelect = (study) => {
    setSelectedStudy(study);
    setComment('');
  };

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!comment.trim() || !selectedStudy) return;

    try {
      setSubmittingComment(true);
      await demoApi.addStudyComment(selectedStudy.id, comment, user.id, user.name);
      await demoApi.logActivity('comment', `Added comment to study PMID: ${selectedStudy.pmid}`);
      
      // Reload studies to get updated comments
      await loadStudies();
      
      // Update selected study with new comments
      const updatedStudy = studies.find(s => s.id === selectedStudy.id);
      if (updatedStudy) {
        setSelectedStudy(updatedStudy);
      }
      
      setComment('');
      alert('Comment added successfully!');
    } catch (error) {
      console.error('Error adding comment:', error);
      alert('Error adding comment. Please try again.');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleApproveStudy = async () => {
    if (!selectedStudy) return;

    try {
      await demoApi.approveStudy(selectedStudy.id, user.id, user.name);
      await demoApi.logActivity('approval', `Approved study PMID: ${selectedStudy.pmid} for reporting`);
      
      // Reload studies
      await loadStudies();
      
      // Update selected study
      const updatedStudy = studies.find(s => s.id === selectedStudy.id);
      if (updatedStudy) {
        setSelectedStudy(updatedStudy);
      }
      
      alert('Study approved successfully!');
    } catch (error) {
      console.error('Error approving study:', error);
      alert('Error approving study. Please try again.');
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'Pending Review':
        return 'status-pending';
      case 'Under Review':
        return 'status-processing';
      case 'Approved':
        return 'status-approved';
      default:
        return '';
    }
  };

  const openPubMedLink = (url) => {
    window.open(url, '_blank');
  };

  if (loading) {
    return (
      <div className="loading">
        <span className="spinner"></span>
        Loading studies...
      </div>
    );
  }

  return (
    <div className="study-review">
      <div className="study-review-header">
        <h1>Study Review</h1>
        <p>Review AI-processed studies and provide comments for pharmacovigilance reporting</p>
      </div>

      {/* Filters */}
      <div className="card filters-card">
        <h3>Filters</h3>
        <div className="filters-grid">
          <div className="form-group">
            <label className="form-label">Drug Name</label>
            <input
              type="text"
              name="drugName"
              value={filters.drugName}
              onChange={handleFilterChange}
              className="form-input"
              placeholder="Filter by drug name"
            />
          </div>
          
          <div className="form-group">
            <label className="form-label">Status</label>
            <select
              name="status"
              value={filters.status}
              onChange={handleFilterChange}
              className="form-select"
            >
              <option value="">All Statuses</option>
              <option value="Pending Review">Pending Review</option>
              <option value="Under Review">Under Review</option>
              <option value="Approved">Approved</option>
            </select>
          </div>
          
          <div className="form-group">
            <label className="form-label">Date From</label>
            <input
              type="date"
              name="dateFrom"
              value={filters.dateFrom}
              onChange={handleFilterChange}
              className="form-input"
            />
          </div>
          
          <div className="form-group">
            <label className="form-label">Date To</label>
            <input
              type="date"
              name="dateTo"
              value={filters.dateTo}
              onChange={handleFilterChange}
              className="form-input"
            />
          </div>
        </div>
      </div>

      <div className="study-review-content">
        {/* Studies List */}
        <div className="studies-panel">
          <div className="card">
            <h3>Studies ({studies.length})</h3>
            <div className="studies-list">
              {studies.map((study) => (
                <div
                  key={study.id}
                  className={`study-item ${selectedStudy?.id === study.id ? 'selected' : ''}`}
                  onClick={() => handleStudySelect(study)}
                >
                  <div className="study-header">
                    <div className="study-pmid">PMID: {study.pmid}</div>
                    <div className={`status ${getStatusClass(study.status)}`}>
                      {study.status}
                    </div>
                  </div>
                  <div className="study-title">{study.title}</div>
                  <div className="study-meta">
                    <span>Drug: {study.drugName}</span>
                    <span>Retrieved: {formatDate(study.retrievalDate)}</span>
                    <span>Comments: {study.comments.length}</span>
                  </div>
                  <div className="ai-indicators">
                    <span className={`indicator ${study.aiClassification.hasHumanSubjects ? 'positive' : 'negative'}`}>
                      {study.aiClassification.hasHumanSubjects ? '👥' : '🚫'} Human Subjects
                    </span>
                    <span className={`indicator ${study.aiClassification.hasAdverseEvents ? 'positive' : 'negative'}`}>
                      {study.aiClassification.hasAdverseEvents ? '⚠️' : '✅'} Adverse Events
                    </span>
                  </div>
                </div>
              ))}
              
              {studies.length === 0 && (
                <div className="no-studies">
                  <p>No studies found matching the current filters.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Study Details */}
        <div className="study-details-panel">
          {selectedStudy ? (
            <div className="card">
              <div className="study-details-header">
                <h3>Study Details</h3>
                <button
                  onClick={() => openPubMedLink(selectedStudy.url)}
                  className="btn btn-secondary"
                >
                  🔗 View on PubMed
                </button>
              </div>

              <div className="study-info">
                <div className="info-row">
                  <strong>PMID:</strong> {selectedStudy.pmid}
                </div>
                <div className="info-row">
                  <strong>Title:</strong> {selectedStudy.title}
                </div>
                <div className="info-row">
                  <strong>Drug:</strong> {selectedStudy.drugName}
                </div>
                <div className="info-row">
                  <strong>Status:</strong>
                  <span className={`status ${getStatusClass(selectedStudy.status)}`}>
                    {selectedStudy.status}
                  </span>
                </div>
                <div className="info-row">
                  <strong>Retrieved:</strong> {formatDate(selectedStudy.retrievalDate)}
                </div>
                <div className="info-row">
                  <strong>Processed:</strong> {formatDate(selectedStudy.processingDate)}
                </div>
              </div>

              {/* AI Classification */}
              <div className="ai-classification">
                <h4>AI Classification</h4>
                <div className="classification-grid">
                  <div className="classification-item">
                    <span className="classification-label">Human Subjects:</span>
                    <span className={`classification-value ${selectedStudy.aiClassification.hasHumanSubjects ? 'positive' : 'negative'}`}>
                      {selectedStudy.aiClassification.hasHumanSubjects ? 'Yes' : 'No'}
                    </span>
                  </div>
                  <div className="classification-item">
                    <span className="classification-label">Adverse Events:</span>
                    <span className={`classification-value ${selectedStudy.aiClassification.hasAdverseEvents ? 'positive' : 'negative'}`}>
                      {selectedStudy.aiClassification.hasAdverseEvents ? 'Yes' : 'No'}
                    </span>
                  </div>
                  <div className="classification-item">
                    <span className="classification-label">Confidence:</span>
                    <span className="classification-value confidence">
                      {(selectedStudy.aiClassification.confidence * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>

                <div className="ai-summary">
                  <h5>Summary:</h5>
                  <p>{selectedStudy.aiClassification.summary}</p>
                </div>

                <div className="key-points">
                  <h5>Key Points:</h5>
                  <ul>
                    {selectedStudy.aiClassification.keyPoints.map((point, index) => (
                      <li key={index}>{point}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Comments */}
              <div className="comments-section">
                <h4>Comments ({selectedStudy.comments.length})</h4>
                <div className="comments-list">
                  {selectedStudy.comments.map((comment) => (
                    <div key={comment.id} className={`comment-item ${comment.type}`}>
                      <div className="comment-header">
                        <span className="comment-author">{comment.userName}</span>
                        <span className="comment-time">{formatDate(comment.timestamp)}</span>
                        <span className={`comment-type ${comment.type}`}>
                          {comment.type === 'approval' ? '✅' : '💬'} {comment.type}
                        </span>
                      </div>
                      <div className="comment-text">{comment.comment}</div>
                    </div>
                  ))}
                </div>

                {/* Add Comment */}
                <form onSubmit={handleCommentSubmit} className="comment-form">
                  <div className="form-group">
                    <label className="form-label">Add Comment</label>
                    <textarea
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      className="form-input comment-textarea"
                      placeholder="Enter your review comments..."
                      rows="3"
                      required
                    />
                  </div>
                  <div className="comment-actions">
                    <button
                      type="submit"
                      disabled={submittingComment || !comment.trim()}
                      className="btn btn-primary"
                    >
                      {submittingComment ? (
                        <>
                          <span className="spinner"></span>
                          Adding...
                        </>
                      ) : (
                        'Add Comment'
                      )}
                    </button>
                    
                    {selectedStudy.status !== 'Approved' && (
                      <button
                        type="button"
                        onClick={handleApproveStudy}
                        className="btn btn-success"
                      >
                        ✅ Approve Study
                      </button>
                    )}
                  </div>
                </form>
              </div>
            </div>
          ) : (
            <div className="card no-selection">
              <div className="no-selection-content">
                <div className="no-selection-icon">📄</div>
                <h3>No Study Selected</h3>
                <p>Select a study from the list to view details and add comments</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudyReview;
