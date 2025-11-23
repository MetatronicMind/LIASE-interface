"use client";
import { useState, useEffect } from "react";
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
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [smtpConfig, setSmtpConfig] = useState<SMTPConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<'templates' | 'logs' | 'smtp'>('templates');

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
      const token = localStorage.getItem('token');
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
      const token = localStorage.getItem('token');
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
      const token = localStorage.getItem('token');
      const response = await fetch(`${getApiBaseUrl()}/emails/smtp-config`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSmtpConfig(data.config || null);
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
        <button
          onClick={() => setActiveSection('templates')}
          className={`px-4 py-2 font-semibold transition-all ${
            activeSection === 'templates'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Templates
        </button>
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
                    <p className="text-xs text-gray-500">Created: {new Date(template.createdAt).toLocaleDateString()}</p>
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
                  <p className="text-xs text-gray-500">Sent: {new Date(log.sentAt).toLocaleString()}</p>
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
              <p>No SMTP configuration found</p>
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
    </div>
  );
}
