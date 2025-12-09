"use client";
import { useState, useEffect } from 'react';
import {
  ArchiveBoxIcon,
  CloudIcon,
  EnvelopeIcon,
  DocumentTextIcon,
  TrashIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  Cog6ToothIcon,
  PlayIcon
} from '@heroicons/react/24/outline';
import axios from 'axios';
import { API_CONFIG } from '@/config/api';

interface ArchivalConfig {
  isEnabled: boolean;
  autoArchiveEnabled: boolean;
  archiveAfterDays: number;
  manualArchiveOnly: boolean;
  
  googleDrive: {
    enabled: boolean;
    serviceAccountEmail: string | null;
    serviceAccountKey: string | null;
    folderId: string | null;
    folderPath: string | null;
    createSubfolders: boolean;
    subfolderPattern: string;
  };
  
  emailNotification: {
    enabled: boolean;
    notifyOnArchival: boolean;
    notifyOnFailure: boolean;
    adminEmails: string[];
    includeAttachments: boolean;
    smtpConfigId: string | null;
  };
  
  fileGeneration: {
    generatePDF: boolean;
    generateCSV: boolean;
    includeAuditTrail: boolean;
    includeAttachments: boolean;
    pdfSettings: {
      includeCharts: boolean;
      includeImages: boolean;
      pageSize: string;
      orientation: string;
      includeWatermark: boolean;
      watermarkText: string;
    };
    csvSettings: {
      includeHeaders: boolean;
      delimiter: string;
      encoding: string;
      includeMetadata: boolean;
    };
  };
  
  dataRetention: {
    deleteFromCosmosDB: boolean;
    createBackupBeforeDelete: boolean;
    retainAuditLogs: boolean;
    retainUserReferences: boolean;
  };
  
  archiveScope: {
    includeStudies: boolean;
    includeReports: boolean;
    includeComments: boolean;
    includeHistory: boolean;
    includeAttachments: boolean;
    studyStatuses: string[];
  };
  
  performance: {
    batchSize: number;
    maxConcurrent: number;
    retryAttempts: number;
    retryDelayMs: number;
    timeoutMs: number;
  };
  
  totalArchived?: number;
  totalFailed?: number;
  lastArchivedAt?: string | null;
  lastStatus?: string | null;
}

export default function ArchivalSettingsTab() {
  const [config, setConfig] = useState<ArchivalConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message?: string; folderName?: string } | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [newEmail, setNewEmail] = useState('');
  const [manualStudyId, setManualStudyId] = useState('');
  const [archiving, setArchiving] = useState(false);
  const [runningAutoArchive, setRunningAutoArchive] = useState(false);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await axios.get(`${API_CONFIG.BASE_URL}/archival/config`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Merge with defaults to ensure all properties exist
      const defaultConfig = {
        isEnabled: false,
        autoArchiveEnabled: false,
        archiveAfterDays: 90,
        manualArchiveOnly: false,
        googleDrive: {
          enabled: false,
          serviceAccountEmail: null,
          serviceAccountKey: null,
          folderId: null,
          folderPath: null,
          createSubfolders: true,
          subfolderPattern: 'YYYY/MM/DD'
        },
        emailNotification: {
          enabled: true,
          notifyOnArchival: true,
          notifyOnFailure: true,
          adminEmails: [],
          includeAttachments: true,
          smtpConfigId: null
        },
        fileGeneration: {
          generatePDF: true,
          generateCSV: true,
          includeAuditTrail: true,
          includeAttachments: false,
          pdfSettings: {
            includeCharts: true,
            includeImages: true,
            pageSize: 'A4',
            orientation: 'portrait',
            includeWatermark: false,
            watermarkText: 'ARCHIVED'
          },
          csvSettings: {
            includeHeaders: true,
            delimiter: ',',
            encoding: 'utf-8',
            includeMetadata: true
          }
        },
        dataRetention: {
          deleteFromCosmosDB: false,
          createBackupBeforeDelete: true,
          retainAuditLogs: true,
          retainUserReferences: true
        },
        archiveScope: {
          includeStudies: true,
          includeReports: true,
          includeComments: true,
          includeHistory: true,
          includeAttachments: true,
          studyStatuses: ['Completed', 'Final Report Completed']
        },
        performance: {
          batchSize: 10,
          maxConcurrent: 3,
          retryAttempts: 3,
          retryDelayMs: 5000,
          timeoutMs: 300000
        }
      };
      
      // Deep merge response with defaults
      const mergedConfig = {
        ...defaultConfig,
        ...response.data,
        googleDrive: { ...defaultConfig.googleDrive, ...response.data.googleDrive },
        emailNotification: { ...defaultConfig.emailNotification, ...response.data.emailNotification },
        fileGeneration: {
          ...defaultConfig.fileGeneration,
          ...response.data.fileGeneration,
          pdfSettings: { ...defaultConfig.fileGeneration.pdfSettings, ...response.data.fileGeneration?.pdfSettings },
          csvSettings: { ...defaultConfig.fileGeneration.csvSettings, ...response.data.fileGeneration?.csvSettings }
        },
        dataRetention: { ...defaultConfig.dataRetention, ...response.data.dataRetention },
        archiveScope: { ...defaultConfig.archiveScope, ...response.data.archiveScope },
        performance: { ...defaultConfig.performance, ...response.data.performance }
      };
      
      setConfig(mergedConfig);
    } catch (error: any) {
      console.error('Error fetching archival config:', error);
      setMessage({ type: 'error', text: error.response?.data?.error || 'Failed to load configuration' });
      
      // Set default config
      setConfig({
        isEnabled: false,
        autoArchiveEnabled: false,
        archiveAfterDays: 90,
        manualArchiveOnly: false,
        googleDrive: {
          enabled: false,
          serviceAccountEmail: null,
          serviceAccountKey: null,
          folderId: null,
          folderPath: null,
          createSubfolders: true,
          subfolderPattern: 'YYYY/MM/DD'
        },
        emailNotification: {
          enabled: true,
          notifyOnArchival: true,
          notifyOnFailure: true,
          adminEmails: [],
          includeAttachments: true,
          smtpConfigId: null
        },
        fileGeneration: {
          generatePDF: true,
          generateCSV: true,
          includeAuditTrail: true,
          includeAttachments: false,
          pdfSettings: {
            includeCharts: true,
            includeImages: true,
            pageSize: 'A4',
            orientation: 'portrait',
            includeWatermark: false,
            watermarkText: 'ARCHIVED'
          },
          csvSettings: {
            includeHeaders: true,
            delimiter: ',',
            encoding: 'utf-8',
            includeMetadata: true
          }
        },
        dataRetention: {
          deleteFromCosmosDB: false,
          createBackupBeforeDelete: true,
          retainAuditLogs: true,
          retainUserReferences: true
        },
        archiveScope: {
          includeStudies: true,
          includeReports: true,
          includeComments: true,
          includeHistory: true,
          includeAttachments: true,
          studyStatuses: ['Completed', 'Final Report Completed']
        },
        performance: {
          batchSize: 10,
          maxConcurrent: 3,
          retryAttempts: 3,
          retryDelayMs: 5000,
          timeoutMs: 300000
        }
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!config) return;

    setSaving(true);
    setMessage(null);

    try {
      const token = localStorage.getItem('auth_token');
      await axios.post(`${API_CONFIG.BASE_URL}/archival/config`, config, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setMessage({ type: 'success', text: 'Archival configuration saved successfully' });
      await fetchConfig();
    } catch (error: any) {
      console.error('Error saving config:', error);
      setMessage({ type: 'error', text: error.response?.data?.error || 'Failed to save configuration' });
    } finally {
      setSaving(false);
    }
  };

  const testGoogleDrive = async () => {
    if (!config?.googleDrive) return;

    setTesting(true);
    setTestResult(null);

    try {
      const token = localStorage.getItem('auth_token');
      const response = await axios.post(`${API_CONFIG.BASE_URL}/archival/test-google-drive`, {
        googleDrive: config.googleDrive
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setTestResult(response.data);
    } catch (error: any) {
      console.error('Error testing Google Drive:', error);
      setTestResult({
        success: false,
        message: error.response?.data?.error || 'Connection test failed'
      });
    } finally {
      setTesting(false);
    }
  };

  const addEmail = () => {
    if (!config || !newEmail.trim()) return;
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      setMessage({ type: 'error', text: 'Invalid email format' });
      return;
    }

    if (config.emailNotification.adminEmails.includes(newEmail)) {
      setMessage({ type: 'error', text: 'Email already added' });
      return;
    }

    setConfig({
      ...config,
      emailNotification: {
        ...config.emailNotification,
        adminEmails: [...config.emailNotification.adminEmails, newEmail]
      }
    });
    setNewEmail('');
  };

  const removeEmail = (email: string) => {
    if (!config) return;
    
    setConfig({
      ...config,
      emailNotification: {
        ...config.emailNotification,
        adminEmails: config.emailNotification.adminEmails.filter(e => e !== email)
      }
    });
  };

  const archiveStudyManually = async () => {
    if (!manualStudyId.trim()) {
      setMessage({ type: 'error', text: 'Please enter a Study ID' });
      return;
    }

    setArchiving(true);
    setMessage(null);

    try {
      const token = localStorage.getItem('auth_token');
      const response = await axios.post(
        `${API_CONFIG.BASE_URL}/archival/archive-study/${manualStudyId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setMessage({ type: 'success', text: `Study archived successfully! Files saved to Google Drive.` });
      setManualStudyId('');
      await fetchConfig(); // Refresh stats
    } catch (error: any) {
      console.error('Error archiving study:', error);
      setMessage({ type: 'error', text: error.response?.data?.error || 'Failed to archive study' });
    } finally {
      setArchiving(false);
    }
  };

  const runAutoArchiveNow = async () => {
    setRunningAutoArchive(true);
    setMessage(null);

    try {
      const token = localStorage.getItem('auth_token');
      const response = await axios.post(
        `${API_CONFIG.BASE_URL}/archival/auto-archive`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      const data = response.data;
      setMessage({ 
        type: 'success', 
        text: `Auto-archive completed! Archived: ${data.successful}, Failed: ${data.failed}` 
      });
      await fetchConfig(); // Refresh stats
    } catch (error: any) {
      console.error('Error running auto-archive:', error);
      setMessage({ type: 'error', text: error.response?.data?.error || 'Failed to run auto-archive' });
    } finally {
      setRunningAutoArchive(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <ArrowPathIcon className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!config) {
    return (
      <div className="text-center py-12 text-gray-500">
        Failed to load archival configuration
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <ArchiveBoxIcon className="w-8 h-8 text-blue-600" />
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Archival Settings</h2>
              <p className="text-gray-600 text-sm">Configure automatic study archival and storage</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={config.isEnabled}
                onChange={(e) => setConfig({ ...config, isEnabled: e.target.checked })}
                className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="font-semibold text-gray-700">Enable Archival</span>
            </label>
          </div>
        </div>

        {/* Statistics */}
        {config.totalArchived !== undefined && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="text-sm text-gray-600">Total Archived</div>
              <div className="text-2xl font-bold text-green-600">{config.totalArchived}</div>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="text-sm text-gray-600">Failed</div>
              <div className="text-2xl font-bold text-red-600">{config.totalFailed || 0}</div>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="text-sm text-gray-600">Last Status</div>
              <div className="text-lg font-semibold text-gray-900 capitalize">{config.lastStatus || 'N/A'}</div>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="text-sm text-gray-600">Last Archived</div>
              <div className="text-sm font-medium text-gray-900">
                {config.lastArchivedAt ? new Date(config.lastArchivedAt).toLocaleString() : 'Never'}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Message Banner */}
      {message && (
        <div className={`rounded-lg p-4 ${message.type === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
          <div className="flex items-center gap-2">
            {message.type === 'success' ? (
              <CheckCircleIcon className="w-5 h-5 text-green-600" />
            ) : (
              <XCircleIcon className="w-5 h-5 text-red-600" />
            )}
            <span className={message.type === 'success' ? 'text-green-800' : 'text-red-800'}>{message.text}</span>
          </div>
        </div>
      )}

      {/* Auto-Archive Settings */}
      <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Cog6ToothIcon className="w-6 h-6 text-blue-600" />
          <h3 className="text-xl font-bold text-gray-900">Auto-Archive Settings</h3>
        </div>

        <div className="space-y-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={config.autoArchiveEnabled}
              onChange={(e) => setConfig({ ...config, autoArchiveEnabled: e.target.checked })}
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
            />
            <span className="text-gray-700">Enable automatic archival</span>
          </label>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Archive studies after (days)
            </label>
            <input
              type="number"
              value={config.archiveAfterDays}
              onChange={(e) => setConfig({ ...config, archiveAfterDays: parseInt(e.target.value) || 0 })}
              min="1"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-sm text-gray-500 mt-1">Number of days after study completion before auto-archival</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Study statuses eligible for archival
            </label>
            <div className="flex flex-wrap gap-2">
              {['Completed', 'Final Report Completed', 'Archived'].map(status => (
                <label key={status} className="flex items-center gap-2 cursor-pointer bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
                  <input
                    type="checkbox"
                    checked={config.archiveScope.studyStatuses.includes(status)}
                    onChange={(e) => {
                      const statuses = e.target.checked
                        ? [...config.archiveScope.studyStatuses, status]
                        : config.archiveScope.studyStatuses.filter(s => s !== status);
                      setConfig({
                        ...config,
                        archiveScope: { ...config.archiveScope, studyStatuses: statuses }
                      });
                    }}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">{status}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Google Drive Settings */}
      <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <CloudIcon className="w-6 h-6 text-blue-600" />
            <h3 className="text-xl font-bold text-gray-900">Google Drive Storage</h3>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={config.googleDrive.enabled}
              onChange={(e) => setConfig({
                ...config,
                googleDrive: { ...config.googleDrive, enabled: e.target.checked }
              })}
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Enable</span>
          </label>
        </div>

        {config.googleDrive.enabled && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Service Account Email
              </label>
              <input
                type="email"
                value={config.googleDrive.serviceAccountEmail || ''}
                onChange={(e) => setConfig({
                  ...config,
                  googleDrive: { ...config.googleDrive, serviceAccountEmail: e.target.value }
                })}
                placeholder="your-service-account@project.iam.gserviceaccount.com"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Service Account Key (Base64 JSON)
              </label>
              <textarea
                value={config.googleDrive.serviceAccountKey || ''}
                onChange={(e) => setConfig({
                  ...config,
                  googleDrive: { ...config.googleDrive, serviceAccountKey: e.target.value }
                })}
                placeholder="Paste your base64-encoded service account JSON key here"
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Target Folder ID
              </label>
              <input
                type="text"
                value={config.googleDrive.folderId || ''}
                onChange={(e) => setConfig({
                  ...config,
                  googleDrive: { ...config.googleDrive, folderId: e.target.value }
                })}
                placeholder="1a2b3c4d5e6f7g8h9i0j"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-sm text-gray-500 mt-1">Find this in your Google Drive folder URL</p>
            </div>

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.googleDrive.createSubfolders}
                  onChange={(e) => setConfig({
                    ...config,
                    googleDrive: { ...config.googleDrive, createSubfolders: e.target.checked }
                  })}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Create date-based subfolders</span>
              </label>

              {config.googleDrive.createSubfolders && (
                <input
                  type="text"
                  value={config.googleDrive.subfolderPattern}
                  onChange={(e) => setConfig({
                    ...config,
                    googleDrive: { ...config.googleDrive, subfolderPattern: e.target.value }
                  })}
                  placeholder="YYYY/MM/DD"
                  className="px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                />
              )}
            </div>

            <button
              onClick={testGoogleDrive}
              disabled={testing}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {testing ? (
                <ArrowPathIcon className="w-5 h-5 animate-spin" />
              ) : (
                <PlayIcon className="w-5 h-5" />
              )}
              Test Connection
            </button>

            {testResult && (
              <div className={`rounded-lg p-4 ${testResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                <div className="flex items-center gap-2">
                  {testResult.success ? (
                    <>
                      <CheckCircleIcon className="w-5 h-5 text-green-600" />
                      <div>
                        <span className="text-green-800 font-semibold">Connection successful!</span>
                        {testResult.folderName && (
                          <p className="text-green-700 text-sm">Folder: {testResult.folderName}</p>
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                      <XCircleIcon className="w-5 h-5 text-red-600" />
                      <span className="text-red-800">{testResult.message || 'Connection failed'}</span>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Email Notification Settings */}
      <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <EnvelopeIcon className="w-6 h-6 text-blue-600" />
            <h3 className="text-xl font-bold text-gray-900">Email Notifications</h3>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={config.emailNotification.enabled}
              onChange={(e) => setConfig({
                ...config,
                emailNotification: { ...config.emailNotification, enabled: e.target.checked }
              })}
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Enable</span>
          </label>
        </div>

        {config.emailNotification.enabled && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.emailNotification.notifyOnArchival}
                  onChange={(e) => setConfig({
                    ...config,
                    emailNotification: { ...config.emailNotification, notifyOnArchival: e.target.checked }
                  })}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Notify on successful archival</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.emailNotification.notifyOnFailure}
                  onChange={(e) => setConfig({
                    ...config,
                    emailNotification: { ...config.emailNotification, notifyOnFailure: e.target.checked }
                  })}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Notify on failure</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer col-span-2">
                <input
                  type="checkbox"
                  checked={config.emailNotification.includeAttachments}
                  onChange={(e) => setConfig({
                    ...config,
                    emailNotification: { ...config.emailNotification, includeAttachments: e.target.checked }
                  })}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Include PDF/CSV as email attachments</span>
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Admin Email Addresses
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addEmail()}
                  placeholder="admin@example.com"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={addEmail}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Add
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {config.emailNotification.adminEmails.map(email => (
                  <div key={email} className="flex items-center gap-2 bg-blue-50 px-3 py-2 rounded-lg border border-blue-200">
                    <span className="text-sm text-blue-900">{email}</span>
                    <button
                      onClick={() => removeEmail(email)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <XCircleIcon className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* File Generation Settings */}
      <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <DocumentTextIcon className="w-6 h-6 text-blue-600" />
          <h3 className="text-xl font-bold text-gray-900">File Generation</h3>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={config.fileGeneration.generatePDF}
                onChange={(e) => setConfig({
                  ...config,
                  fileGeneration: { ...config.fileGeneration, generatePDF: e.target.checked }
                })}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Generate PDF report</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={config.fileGeneration.generateCSV}
                onChange={(e) => setConfig({
                  ...config,
                  fileGeneration: { ...config.fileGeneration, generateCSV: e.target.checked }
                })}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Generate CSV data</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={config.fileGeneration.includeAuditTrail}
                onChange={(e) => setConfig({
                  ...config,
                  fileGeneration: { ...config.fileGeneration, includeAuditTrail: e.target.checked }
                })}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Include audit trail</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={config.fileGeneration.pdfSettings.includeWatermark}
                onChange={(e) => setConfig({
                  ...config,
                  fileGeneration: {
                    ...config.fileGeneration,
                    pdfSettings: { ...config.fileGeneration.pdfSettings, includeWatermark: e.target.checked }
                  }
                })}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Add watermark to PDF</span>
            </label>
          </div>
        </div>
      </div>

      {/* Data Retention Settings */}
      <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrashIcon className="w-6 h-6 text-red-600" />
          <h3 className="text-xl font-bold text-gray-900">Data Retention & Cleanup</h3>
        </div>

        <div className="space-y-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800">
              <strong>Warning:</strong> Enabling database cleanup will permanently delete studies from CosmosDB after archival.
            </p>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={config.dataRetention.deleteFromCosmosDB}
              onChange={(e) => setConfig({
                ...config,
                dataRetention: { ...config.dataRetention, deleteFromCosmosDB: e.target.checked }
              })}
              className="w-4 h-4 text-red-600 rounded focus:ring-red-500"
            />
            <span className="text-sm text-gray-700 font-semibold">Delete studies from database after archival</span>
          </label>

          {config.dataRetention.deleteFromCosmosDB && (
            <div className="ml-6 space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.dataRetention.createBackupBeforeDelete}
                  onChange={(e) => setConfig({
                    ...config,
                    dataRetention: { ...config.dataRetention, createBackupBeforeDelete: e.target.checked }
                  })}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Create backup before deletion</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.dataRetention.retainAuditLogs}
                  onChange={(e) => setConfig({
                    ...config,
                    dataRetention: { ...config.dataRetention, retainAuditLogs: e.target.checked }
                  })}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Retain audit logs</span>
              </label>
            </div>
          )}
        </div>
      </div>

      {/* Manual Archival Operations */}
      <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <PlayIcon className="w-6 h-6 text-purple-600" />
          <h3 className="text-xl font-bold text-gray-900">Manual Archival Operations</h3>
        </div>

        <div className="space-y-4">
          {/* Archive Single Study */}
          <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
            <h4 className="font-semibold text-purple-900 mb-2">Archive Single Study</h4>
            <p className="text-sm text-gray-600 mb-3">Archive a specific study by its ID</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={manualStudyId}
                onChange={(e) => setManualStudyId(e.target.value)}
                placeholder="Enter Study ID"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              />
              <button
                onClick={archiveStudyManually}
                disabled={archiving || !manualStudyId.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
              >
                {archiving ? (
                  <>
                    <ArrowPathIcon className="w-5 h-5 animate-spin" />
                    Archiving...
                  </>
                ) : (
                  <>
                    <ArchiveBoxIcon className="w-5 h-5" />
                    Archive Study
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Run Auto-Archive Now */}
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="font-semibold text-blue-900 mb-2">Run Auto-Archive Now</h4>
            <p className="text-sm text-gray-600 mb-3">
              Archive all eligible studies based on current configuration
            </p>
            <button
              onClick={runAutoArchiveNow}
              disabled={runningAutoArchive}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {runningAutoArchive ? (
                <>
                  <ArrowPathIcon className="w-5 h-5 animate-spin" />
                  Running Auto-Archive...
                </>
              ) : (
                <>
                  <PlayIcon className="w-5 h-5" />
                  Run Auto-Archive Now
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end gap-4">
        <button
          onClick={fetchConfig}
          className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-semibold"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-semibold"
        >
          {saving ? (
            <>
              <ArrowPathIcon className="w-5 h-5 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <CheckCircleIcon className="w-5 h-5" />
              Save Configuration
            </>
          )}
        </button>
      </div>
    </div>
  );
}
