"use client";
import React, { useState, useEffect } from "react";
import { getApiBaseUrl } from "@/config/api";
import StudyProgressTracker from "@/components/StudyProgressTracker";

interface DrugSearchConfig {
  id: string;
  name: string;
  query: string;
  sponsor: string;
  frequency: string;
  isActive: boolean;
  lastRunAt: string | null;
  nextRunAt: string | null;
  totalRuns: number;
  lastResultCount: number;
}

export default function DrugManagementPage() {
  const [searchConfigs, setSearchConfigs] = useState<DrugSearchConfig[]>([]);
  
  // Form fields
  const [configName, setConfigName] = useState('');
  const [query, setQuery] = useState('');
  const [sponsor, setSponsor] = useState('');
  const [frequency, setFrequency] = useState('custom');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [saving, setSaving] = useState(false);
  const [runningConfigs, setRunningConfigs] = useState<Set<string>>(new Set());
  
  // Progress tracking state
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [showProgressTracker, setShowProgressTracker] = useState(false);
  const [runningConfigName, setRunningConfigName] = useState<string>('');

  const API_BASE = `${getApiBaseUrl()}/drugs`;

  // Helper function to format time until next run
  const getTimeUntilRun = (nextRunTime: string) => {
    const now = new Date();
    const nextRun = new Date(nextRunTime);
    const diffMs = nextRun.getTime() - now.getTime();
    
    if (diffMs <= 0) return "Due now";
    
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (diffHours > 24) {
      const diffDays = Math.floor(diffHours / 24);
      return `in ${diffDays} day${diffDays > 1 ? 's' : ''}`;
    } else if (diffHours > 0) {
      return `in ${diffHours}h ${diffMinutes}m`;
    } else {
      return `in ${diffMinutes} min${diffMinutes !== 1 ? 's' : ''}`;
    }
  };

  useEffect(() => {
    fetchSearchConfigs();
    
    // Restore job state from localStorage on page load
    const persistedJobId = localStorage.getItem('activeJobId');
    const shouldShowTracker = localStorage.getItem('showProgressTracker') === 'true';
    const savedConfigName = localStorage.getItem('runningConfigName') || '';
    
    if (persistedJobId && shouldShowTracker) {
      setActiveJobId(persistedJobId);
      setShowProgressTracker(true);
      setRunningConfigName(savedConfigName);
    }
  }, []);

  // Handle job completion
  const handleJobComplete = (results: any) => {
    console.log('Job completed with results:', results);
    
    // Clear job state
    setActiveJobId(null);
    setShowProgressTracker(false);
    setRunningConfigName('');
    setRunningConfigs(new Set());
    
    // Clear localStorage
    localStorage.removeItem('activeJobId');
    localStorage.removeItem('showProgressTracker');
    localStorage.removeItem('runningConfigName');
    
    // Refresh configurations to show updated stats
    fetchSearchConfigs();
    
    // Show completion message
    const studiesCreated = results?.results?.studiesCreated || 0;
    const totalFound = results?.results?.totalFound || 0;
    
    if (studiesCreated > 0) {
      alert(`Discovery completed successfully!\nFound ${totalFound} articles and created ${studiesCreated} studies.`);
    } else {
      alert(`Discovery completed!\nFound ${totalFound} articles but no studies were created.`);
    }
  };

  const fetchSearchConfigs = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE}/search-configs`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setSearchConfigs(data.configs || []);
      }
    } catch (error) {
      console.error('Error fetching search configs:', error);
    }
  };

  const runSearchConfig = async (configId: string, configName: string) => {
    setRunningConfigs(prev => new Set(prev).add(configId));
    setRunningConfigName(configName);
    
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE}/search-configs/${configId}/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        }
      });

      if (response.ok || response.status === 202) {
        const data = await response.json();
        
        // If we got a jobId (async response), show progress tracker
        if (data.jobId) {
          setActiveJobId(data.jobId);
          setShowProgressTracker(true);
          
          // Store job ID in localStorage for persistence across page refreshes
          localStorage.setItem('activeJobId', data.jobId);
          localStorage.setItem('showProgressTracker', 'true');
          localStorage.setItem('runningConfigName', configName);
        } else {
          // Legacy response without job tracking - show alert
          const resultCount = data.results?.totalFound || 0;
          const studiesCreated = data.studiesCreated || 0;
          const aiInferenceStatus = data.aiInferenceCompleted === true ? ' (AI analysis completed)' : 
                                   data.aiInferenceCompleted === false ? ' (AI analysis failed)' : '';
          
          let message = `Search "${configName}" completed successfully!\nFound ${resultCount} results`;
          if (studiesCreated > 0) {
            message += `\nCreated ${studiesCreated} studies with detailed AI analysis`;
          }
          message += aiInferenceStatus;
          
          alert(message);
          
          // Refresh the configurations to show updated stats
          fetchSearchConfigs();
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Error running configuration:', errorData);
        
        if (response.status === 403) {
          alert(`Permission Error: ${errorData.error || 'You do not have permission to run this configuration.'}`);
        } else if (response.status === 404) {
          alert('Configuration not found. It may have been deleted.');
        } else {
          alert(`Error running search: ${errorData.error || 'Unknown error occurred'}`);
        }
      }
    } catch (error) {
      console.error('Error running search config:', error);
      alert('Network error. Please check your connection and try again.');
    } finally {
      // Only remove from running configs if we didn't start a job
      if (!showProgressTracker) {
        setRunningConfigs(prev => {
          const newSet = new Set(prev);
          newSet.delete(configId);
          return newSet;
        });
      }
    }
  };

  const createSearchConfig = async () => {
    if (!configName.trim() || !query.trim()) {
      alert('Please enter both name and query.');
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE}/search-configs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify({
          name: configName.trim(),
          query: query.trim(),
          sponsor: sponsor.trim() || '',
          frequency: frequency,
          maxResults: 1000,
          includeAdverseEvents: true,
          includeSafety: true,
          sendToExternalApi: true,
          dateFrom: dateFrom && dateFrom.trim() ? dateFrom.trim() : null,
          dateTo: dateTo && dateTo.trim() ? dateTo.trim() : null
        })
      });

      if (response.ok) {
        alert('Search configuration saved successfully!');
        setConfigName('');
        setQuery('');
        setSponsor('');
        setFrequency('custom');
        setDateFrom('');
        setDateTo('');
        fetchSearchConfigs();
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Full error response:', response.status, response.statusText, errorData);
        
        if (response.status === 403) {
          alert(`Permission Error: ${errorData.error || 'You do not have permission to create drug search configurations. Please contact your administrator.'}`);
        } else if (response.status === 401) {
          alert('Authentication Error: Please log in again.');
        } else if (response.status === 400 && errorData.details) {
          // Show specific validation errors
          const validationErrors = errorData.details.map((detail: any) => detail.msg).join('\n');
          alert(`Validation Error:\n${validationErrors}\n\nData sent: ${JSON.stringify(errorData.receivedData, null, 2)}`);
        } else {
          alert(`Error: ${errorData.error || 'Failed to save configuration'}`);
        }
      }
    } catch (error) {
      console.error('Error creating search config:', error);
      alert('Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 px-4">
        <div className="bg-white shadow rounded-lg">
          <div className="p-6">
            <div>
              {/* Header with Scheduler Information */}
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Automated Drug Discovery</h2>
                <div className="bg-green-50 border border-green-200 rounded-md p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-green-800">
                        ⏰ Scheduler Status: Active
                      </h3>
                      <div className="mt-2 text-sm text-green-700">
                        <p>• Our scheduler runs <strong>every 12 hours</strong> (at 00:00 and 12:00 UTC)</p>
                        <p>• Scheduled searches will be automatically executed when due</p>
                        <p>• You can also run any configuration manually at any time</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <h2 className="text-xl font-semibold mb-4">Search Configurations</h2>
              
              {/* Create Form */}
              <div className="bg-gray-50 p-4 rounded-lg mb-6">
                <h3 className="text-lg font-medium mb-4">Create New Search Configuration</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    type="text"
                    value={configName}
                    onChange={(e) => setConfigName(e.target.value)}
                    placeholder="Configuration Name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Query (Drug Name)"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                  <input
                    type="text"
                    value={sponsor}
                    onChange={(e) => setSponsor(e.target.value)}
                    placeholder="Sponsor (Optional)"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                  <select
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="custom">Custom Date Range</option>
                    <option value="daily">Last One Day (Daily)</option>
                    <option value="weekly">Last One Week (Weekly)</option>
                    <option value="monthly">Last One Month (Monthly)</option>
                  </select>
                  {frequency === 'custom' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Date From (Optional)</label>
                        <input
                          type="date"
                          onChange={(e) => {
                            const dateValue = e.target.value;
                            if (dateValue) {
                              setDateFrom(dateValue.replace(/-/g, '/'));
                            } else {
                              setDateFrom('');
                            }
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Date To (Optional)</label>
                        <input
                          type="date"
                          onChange={(e) => {
                            const dateValue = e.target.value;
                            if (dateValue) {
                              setDateTo(dateValue.replace(/-/g, '/'));
                            } else {
                              setDateTo('');
                            }
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        />
                      </div>
                    </>
                  )}
                  {frequency !== 'custom' && (
                    <div className="md:col-span-2">
                      <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                        <p className="text-sm text-blue-800">
                          <strong>📅 {frequency.charAt(0).toUpperCase() + frequency.slice(1)} Search:</strong> 
                          {frequency === 'daily' && ' Will search articles from the last 24 hours and run every 24 hours'}
                          {frequency === 'weekly' && ' Will search articles from the last 7 days and run every week'}
                          {frequency === 'monthly' && ' Will search articles from the last 30 days and run every month'}
                        </p>
                        <p className="text-xs text-blue-600 mt-1">
                          ⏰ <strong>Scheduler runs every 12 hours</strong> - your search will be automatically executed when due
                        </p>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={createSearchConfig}
                    disabled={saving || !configName.trim() || !query.trim()}
                    className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save Configuration'}
                  </button>
                  <button
                    onClick={async () => {
                      const token = localStorage.getItem('auth_token');
                      const response = await fetch(`${API_BASE}/search-configs/debug`, {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          ...(token && { 'Authorization': `Bearer ${token}` })
                        },
                        body: JSON.stringify({
                          name: configName.trim(),
                          query: query.trim(),
                          sponsor: sponsor.trim() || '',
                          frequency: frequency,
                          maxResults: 1000,
                          includeAdverseEvents: true,
                          includeSafety: true,
                          sendToExternalApi: true,
                          dateFrom: dateFrom && dateFrom.trim() ? dateFrom.trim() : null,
                          dateTo: dateTo && dateTo.trim() ? dateTo.trim() : null
                        })
                      });
                      const result = await response.json();
                      console.log('Debug result:', result);
                      alert(`Debug result: ${JSON.stringify(result, null, 2)}`);
                    }}
                    className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700"
                  >
                    Debug
                  </button>
                </div>
              </div>

              {/* Show hidden progress tracker button */}
              {!showProgressTracker && activeJobId && (
                <div className="mb-6">
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-600 mr-2"></div>
                        <span className="text-yellow-800">
                          A drug discovery job is running in the background: {runningConfigName}
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          setShowProgressTracker(true);
                          localStorage.setItem('showProgressTracker', 'true');
                        }}
                        className="bg-yellow-600 text-white px-3 py-1 rounded-md text-sm hover:bg-yellow-700"
                      >
                        Show Progress
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Progress Tracker */}
              {showProgressTracker && activeJobId && (
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium">
                      Drug Discovery Progress: {runningConfigName}
                    </h3>
                    <button
                      onClick={() => {
                        if (confirm('Are you sure you want to hide the progress tracker? The job will continue running in the background.')) {
                          setShowProgressTracker(false);
                          localStorage.setItem('showProgressTracker', 'false');
                        }
                      }}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                      title="Hide progress tracker"
                    >
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <StudyProgressTracker 
                    jobId={activeJobId} 
                    onComplete={handleJobComplete}
                  />
                </div>
              )}

              {/* Existing Configurations */}
              <div>
                <h3 className="text-lg font-medium mb-4">Your Search Configurations</h3>
                {searchConfigs.length === 0 ? (
                  <div className="text-center py-8 bg-gray-50 rounded-lg">
                    <p className="text-gray-600">
                      No search configurations yet. Create one above to start automatic drug discovery.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {searchConfigs.map((config) => (
                      <div 
                        key={config.id} 
                        className={`border rounded-lg p-4 bg-white ${
                          showProgressTracker && config.name === runningConfigName
                            ? 'border-blue-300 bg-blue-50 ring-1 ring-blue-200'
                            : ''
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h4 className="font-medium">{config.name}</h4>
                            <p className="text-sm text-gray-600">Query: {config.query}</p>
                            <p className="text-sm text-gray-600">Frequency: {config.frequency}</p>
                            {config.sponsor && (
                              <p className="text-sm text-gray-600">Sponsor: {config.sponsor}</p>
                            )}
                            <div className="mt-2 flex flex-wrap gap-4 text-xs text-gray-500">
                              <span>Total Runs: {config.totalRuns}</span>
                              <span>Last Result: {config.lastResultCount} items</span>
                              {config.lastRunAt && (
                                <span>Last Run: {new Date(config.lastRunAt).toLocaleString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  timeZoneName: 'short'
                                })}</span>
                              )}
                              {config.nextRunAt && config.frequency !== 'manual' && (
                                <span className="text-blue-600 font-medium">
                                  Next Run: {new Date(config.nextRunAt).toLocaleString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    timeZoneName: 'short'
                                  })} ({getTimeUntilRun(config.nextRunAt)})
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="ml-4">
                            <button
                              onClick={() => runSearchConfig(config.id, config.name)}
                              disabled={runningConfigs.has(config.id) || (showProgressTracker && config.name === runningConfigName)}
                              className={`px-4 py-2 text-sm font-medium rounded-md ${
                                runningConfigs.has(config.id) || (showProgressTracker && config.name === runningConfigName)
                                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                  : 'bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500'
                              }`}
                            >
                              {runningConfigs.has(config.id) || (showProgressTracker && config.name === runningConfigName) ? (
                                <div className="flex items-center">
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400 mr-2"></div>
                                  {showProgressTracker && config.name === runningConfigName ? 'In Progress...' : 'Running...'}
                                </div>
                              ) : (
                                'Run Now'
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
