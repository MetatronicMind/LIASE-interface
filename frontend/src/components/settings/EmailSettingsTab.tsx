"use client";
import { useState, useEffect } from "react";
import { useDateTime } from '@/hooks/useDateTime';
import { EnvelopeIcon, CheckCircleIcon, XCircleIcon } from "@heroicons/react/24/solid";
import { getApiBaseUrl } from '@/config/api';

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  category: string;
  isActive: boolean;
  createdAt: string;
}

interface EmailLog {
  id: string;
  to: string;
  subject: string;
  status: string;
  sentAt?: string;
  error?: string;
}

interface SMTPConfig {
  id: string;
  host: string;
  port: number;
  secure: boolean;
  user: string;
  isActive: boolean;
}

export default function EmailSettingsTab() {
  const { formatDate, formatDateTime } = useDateTime();
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [smtpConfig, setSmtpConfig] = useState<SMTPConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<'templates' | 'logs' | 'smtp'>('templates');
  const [showSMTPModal, setShowSMTPModal] = useState(false);
  const [smtpForm, setSmtpForm] = useState({
    name: '',
    host: '',
    port: 587,
    secure: false,
    user: '',
    password: '',
    fromName: '',
    fromEmail: ''
  });
  const [testingConfig, setTestingConfig] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      await Promise.all([fetchTemplates(), fetchLogs(), fetchSMTPConfig()]);
    } catch (err: any) {
      console.error('Fetch error:', err);
      setError(err.message || 'Failed to fetch email settings');
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplates = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${getApiBaseUrl()}/emails/templates`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setTemplates(data.templates || []);
      }
    } catch (err) {
      console.error('Error fetching templates:', err);
    }
  };

  const fetchLogs = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${getApiBaseUrl()}/emails/logs?limit=10`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setLogs(data.logs || []);
      }
    } catch (err) {
      console.error('Error fetching logs:', err);
    }
  };

  const fetchSMTPConfig = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${getApiBaseUrl()}/emails/smtp-config`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Fetched SMTP config:', data);
        // Backend returns array, get the first (or most recent) config
        if (Array.isArray(data) && data.length > 0) {
          setSmtpConfig(data[0]);
        } else {
          setSmtpConfig(null);
        }
      }
    } catch (err) {
      console.error('Error fetching SMTP config:', err);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'sent':
      case 'delivered':
        return 'bg-green-100 text-green-700';
      case 'pending':
      case 'queued':
        return 'bg-yellow-100 text-yellow-700';
      case 'failed':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading email settings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <EnvelopeIcon className="w-7 h-7 text-blue-600" />
            Email Settings
          </h2>
          <p className="text-gray-600 mt-1">Manage email templates, logs, and SMTP configuration</p>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Section Tabs */}
      <div className="flex gap-4 border-b border-gray-200">
        {/* <button
          onClick={() => setActiveSection('templates')}
          className={`px-4 py-2 font-semibold transition-all ${
            activeSection === 'templates'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Templates
        </button> */}
        <button
          onClick={() => setActiveSection('logs')}
          className={`px-4 py-2 font-semibold transition-all ${
            activeSection === 'logs'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Email Logs
        </button>
        <button
          onClick={() => setActiveSection('smtp')}
          className={`px-4 py-2 font-semibold transition-all ${
            activeSection === 'smtp'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          SMTP Config
        </button>
      </div>

      {/* Templates Section */}
      {activeSection === 'templates' && (
        <div className="space-y-4">
          {templates.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <EnvelopeIcon className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p>No email templates found</p>
            </div>
          ) : (
            templates.map((template) => (
              <div
                key={template.id}
                className="bg-white border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-bold text-gray-900">{template.name}</h3>
                      <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
                        template.isActive 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {template.isActive ? 'Active' : 'Inactive'}
                      </span>
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-semibold">
                        {template.category}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-gray-700 mb-1">Subject: {template.subject}</p>
                    <p className="text-xs text-gray-500">Created: {formatDate(template.createdAt)}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Logs Section */}
      {activeSection === 'logs' && (
        <div className="space-y-3">
          {logs.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <EnvelopeIcon className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p>No email logs found</p>
            </div>
          ) : (
            logs.map((log) => (
              <div
                key={log.id}
                className="bg-white border border-gray-200 rounded-lg p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {log.status === 'sent' ? (
                      <CheckCircleIcon className="w-5 h-5 text-green-600" />
                    ) : (
                      <XCircleIcon className="w-5 h-5 text-red-600" />
                    )}
                    <span className="font-semibold text-gray-900">{log.to}</span>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-semibold ${getStatusColor(log.status)}`}>
                    {log.status}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-1">Subject: {log.subject}</p>
                {log.sentAt && (
                  <p className="text-xs text-gray-500">Sent: {formatDateTime(log.sentAt)}</p>
                )}
                {log.error && (
                  <p className="text-xs text-red-600 mt-2">Error: {log.error}</p>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* SMTP Config Section */}
      {activeSection === 'smtp' && (
        <div className="space-y-4">
          {!smtpConfig ? (
            <div className="text-center py-12 text-gray-500">
              <EnvelopeIcon className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p className="mb-4">No SMTP configuration found</p>
              <button
                onClick={() => setShowSMTPModal(true)}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors font-semibold"
              >
                Add SMTP Configuration
              </button>
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">SMTP Configuration</h3>
                <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
                  smtpConfig.isActive 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {smtpConfig.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-semibold text-gray-500">Host</label>
                  <p className="text-gray-900">{smtpConfig.host}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-semibold text-gray-500">Port</label>
                    <p className="text-gray-900">{smtpConfig.port}</p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-500">Secure</label>
                    <p className="text-gray-900">{smtpConfig.secure ? 'Yes' : 'No'}</p>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-500">User</label>
                  <p className="text-gray-900">{smtpConfig.user}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SMTP Configuration Modal */}
      {showSMTPModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">Add SMTP Configuration</h3>
              <button
                onClick={() => setShowSMTPModal(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
              >
                ×
              </button>
            </div>

            <div className="px-6 py-4 space-y-4">
              {/* Configuration Name */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Configuration Name *
                </label>
                <input
                  type="text"
                  value={smtpForm.name}
                  onChange={(e) => setSmtpForm({ ...smtpForm, name: e.target.value })}
                  placeholder="e.g., Gmail SMTP"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* SMTP Host */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  SMTP Host *
                </label>
                <input
                  type="text"
                  value={smtpForm.host}
                  onChange={(e) => setSmtpForm({ ...smtpForm, host: e.target.value })}
                  placeholder="smtp.gmail.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Port and Security */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Port *
                  </label>
                  <input
                    type="number"
                    value={smtpForm.port}
                    onChange={(e) => setSmtpForm({ ...smtpForm, port: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">Usually 587 for TLS or 465 for SSL</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Security
                  </label>
                  <div className="flex items-center gap-4 mt-2">
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        checked={!smtpForm.secure}
                        onChange={() => setSmtpForm({ ...smtpForm, secure: false, port: 587 })}
                        className="text-blue-600"
                      />
                      <span className="text-sm">TLS (587)</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        checked={smtpForm.secure}
                        onChange={() => setSmtpForm({ ...smtpForm, secure: true, port: 465 })}
                        className="text-blue-600"
                      />
                      <span className="text-sm">SSL (465)</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Username */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Username (Email) *
                </label>
                <input
                  type="email"
                  value={smtpForm.user}
                  onChange={(e) => setSmtpForm({ ...smtpForm, user: e.target.value })}
                  placeholder="your-email@gmail.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Password *
                </label>
                <input
                  type="password"
                  value={smtpForm.password}
                  onChange={(e) => setSmtpForm({ ...smtpForm, password: e.target.value })}
                  placeholder="App password (not regular password)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  For Gmail, use an App Password, not your regular password
                </p>
              </div>

              {/* From Name */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  From Name *
                </label>
                <input
                  type="text"
                  value={smtpForm.fromName}
                  onChange={(e) => setSmtpForm({ ...smtpForm, fromName: e.target.value })}
                  placeholder="LIASE System"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* From Email */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  From Email *
                </label>
                <input
                  type="email"
                  value={smtpForm.fromEmail}
                  onChange={(e) => setSmtpForm({ ...smtpForm, fromEmail: e.target.value })}
                  placeholder="your-email@gmail.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="sticky bottom-0 bg-gray-50 px-6 py-4 flex gap-3 justify-end border-t border-gray-200">
              <button
                onClick={() => setShowSMTPModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  setTestingConfig(true);
                  try {
                    console.log('Testing SMTP config with data:', smtpForm);
                    const token = localStorage.getItem('auth_token');
                    const response = await fetch(`${getApiBaseUrl()}/emails/smtp-config/test`, {
                      method: 'POST',
                      headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                      },
                      body: JSON.stringify(smtpForm)
                    });
                    
                    const data = await response.json();
                    console.log('Test response:', data);
                    if (response.ok) {
                      alert('✅ Test successful! Configuration works.');
                    } else {
                      alert('❌ Test failed: ' + (data.error || 'Unknown error'));
                    }
                  } catch (err: any) {
                    console.error('Test error:', err);
                    alert('❌ Test failed: ' + err.message);
                  } finally {
                    setTestingConfig(false);
                  }
                }}
                disabled={testingConfig}
                className="px-4 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 font-semibold disabled:opacity-50"
              >
                {testingConfig ? 'Testing...' : 'Test Configuration'}
              </button>
              <button
                onClick={async () => {
                  // Validate required fields
                  if (!smtpForm.name.trim()) {
                    alert('❌ Configuration name is required');
                    return;
                  }
                  if (!smtpForm.host.trim()) {
                    alert('❌ SMTP host is required');
                    return;
                  }
                  if (!smtpForm.user.trim()) {
                    alert('❌ Username is required');
                    return;
                  }
                  if (!smtpForm.password) {
                    alert('❌ Password is required');
                    return;
                  }
                  if (!smtpForm.fromName.trim()) {
                    alert('❌ From name is required');
                    return;
                  }
                  if (!smtpForm.fromEmail.trim()) {
                    alert('❌ From email is required');
                    return;
                  }

                  setSavingConfig(true);
                  try {
                    console.log('Saving SMTP config with data:', smtpForm);
                    const token = localStorage.getItem('auth_token');
                    const response = await fetch(`${getApiBaseUrl()}/emails/smtp-config`, {
                      method: 'POST',
                      headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                      },
                      body: JSON.stringify(smtpForm)
                    });
                    
                    const data = await response.json();
                    console.log('Save response:', response.status, data);
                    console.log('Validation errors:', data.errors);
                    
                    if (response.ok) {
                      alert('✅ SMTP configuration saved successfully!');
                      setShowSMTPModal(false);
                      fetchSMTPConfig();
                    } else {
                      const errorMsg = data.error || 
                        (data.errors ? data.errors.map((e: any) => `${e.path}: ${e.msg}`).join(', ') : 'Unknown error');
                      alert('❌ Save failed: ' + errorMsg);
                    }
                  } catch (err: any) {
                    console.error('Save error:', err);
                    alert('❌ Save failed: ' + err.message);
                  } finally {
                    setSavingConfig(false);
                  }
                }}
                disabled={savingConfig}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold disabled:opacity-50"
              >
                {savingConfig ? 'Saving...' : 'Save Configuration'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
