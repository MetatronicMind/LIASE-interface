"use client";
import React, { useState, useEffect } from "react";
import StudyProgressTracker from "../../../components/StudyProgressTracker";
import { getApiBaseUrl } from "@/config/api";

interface Drug {
  id: string;
  name: string;
  query: string;
  manufacturer: string;
  status: string;
  nextSearchDate: string;
}

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
  const [drugs, setDrugs] = useState<Drug[]>([]);
  const [searchConfigs, setSearchConfigs] = useState<DrugSearchConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'existing' | 'searches' | 'manual' | 'debug' | 'api-health'>('existing');
  const [userInfo, setUserInfo] = useState<any>(null);
  
  // Form fields
  const [configName, setConfigName] = useState('');
  const [query, setQuery] = useState('');
  const [sponsor, setSponsor] = useState('');
  const [frequency, setFrequency] = useState('custom');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [saving, setSaving] = useState(false);
  const [runningConfigs, setRunningConfigs] = useState<Set<string>>(new Set());
  
  // Job tracking state with persistence and validation
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [showProgressTracker, setShowProgressTracker] = useState(false);

  // Initialize job tracking state from localStorage with validation
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedJobId = localStorage.getItem('activeJobId');
      const storedShowTracker = localStorage.getItem('showProgressTracker') === 'true';
      
      // Only restore job tracking if both values are present and recent
      if (storedJobId && storedShowTracker) {
        // Check if the stored job is recent (within last hour)
        const jobTimestamp = localStorage.getItem('jobTimestamp');
        const now = Date.now();
        const oneHour = 60 * 60 * 1000;
        
        if (jobTimestamp && (now - parseInt(jobTimestamp)) < oneHour) {
          setActiveJobId(storedJobId);
          setShowProgressTracker(true);
        } else {
          // Clear stale job data
          localStorage.removeItem('activeJobId');
          localStorage.removeItem('showProgressTracker');
          localStorage.removeItem('jobTimestamp');
        }
      }
    }
  }, []);
  
  // Manual discovery state
  const [manualQuery, setManualQuery] = useState('');
  const [manualSponsor, setManualSponsor] = useState('');
  const [isManualSearchRunning, setIsManualSearchRunning] = useState(false);
  
  // Batch processing configuration state
  const [batchProcessingEnabled, setBatchProcessingEnabled] = useState(true);
  const [batchSize, setBatchSize] = useState(20);
  const [maxConcurrency, setMaxConcurrency] = useState(4);
  const [enableDetailedLogging, setEnableDetailedLogging] = useState(false);
  
  // API health state
  const [apiHealth, setApiHealth] = useState<any>(null);
  const [loadingApiHealth, setLoadingApiHealth] = useState(false);

  const API_BASE = `${getApiBaseUrl()}/drugs`;

  // Helper functions to persist job tracking state with timestamps
  const setActiveJobIdWithPersistence = (jobId: string | null) => {
    setActiveJobId(jobId);
    if (typeof window !== 'undefined') {
      if (jobId) {
        localStorage.setItem('activeJobId', jobId);
        localStorage.setItem('jobTimestamp', Date.now().toString());
      } else {
        localStorage.removeItem('activeJobId');
        localStorage.removeItem('jobTimestamp');
      }
    }
  };

  const setShowProgressTrackerWithPersistence = (show: boolean) => {
    setShowProgressTracker(show);
    if (typeof window !== 'undefined') {
      if (show) {
        localStorage.setItem('showProgressTracker', 'true');
      } else {
        localStorage.removeItem('showProgressTracker');
        // Don't remove jobTimestamp here as the job might still be valid
      }
    }
  };

  // Utility function to clear all job-related localStorage entries
  const clearJobData = () => {
    setActiveJobId(null);
    setShowProgressTracker(false);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('activeJobId');
      localStorage.removeItem('showProgressTracker');
      localStorage.removeItem('jobTimestamp');
    }
  };

  useEffect(() => {
    fetchDrugs();
    fetchSearchConfigs();
    fetchUserInfo();
  }, []);

  const fetchUserInfo = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE}/user-info`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        }
      });

      if (response.ok) {
        const data = await response.json();
        setUserInfo(data.user);
      }
    } catch (error) {
      console.error('Error fetching user info:', error);
    }
  };

  const fetchDrugs = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(API_BASE, {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setDrugs(data.drugs || []);
      }
    } catch (error) {
      console.error('Error fetching drugs:', error);
    } finally {
      setLoading(false);
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

  const fetchApiHealth = async () => {
    setLoadingApiHealth(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE}/api-health`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setApiHealth(data);
      }
    } catch (error) {
      console.error('Error fetching API health:', error);
    } finally {
      setLoadingApiHealth(false);
    }
  };

  const testBatchProcessing = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE}/test-batch-processing`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        alert(`Batch processing test completed successfully!\n\nDuration: ${data.testDuration}ms\nSuccess: ${data.batchResult.success}\nProcessed: ${data.batchResult.successfulItems}/${data.batchResult.totalItems} items\nMethod: ${data.batchResult.processingMethod || 'batch'}`);
      } else {
        const errorData = await response.json().catch(() => ({}));
        alert(`Batch processing test failed: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error testing batch processing:', error);
      alert('Network error during batch processing test.');
    }
  };  const runManualDiscovery = async () => {
    if (!manualQuery.trim()) {
      alert('Please enter a search query.');
      return;
    }

    setIsManualSearchRunning(true);
    
    try {
      const token = localStorage.getItem('auth_token');
      const params = new URLSearchParams({
        query: manualQuery.trim(),
        sponsor: manualSponsor.trim() || '',
        maxResults: '1000',
        includeAdverseEvents: 'true',
        includeSafety: 'true',
        // Add batch processing parameters
        enableBatchProcessing: batchProcessingEnabled.toString(),
        batchSize: batchSize.toString(),
        maxConcurrency: maxConcurrency.toString(),
        enableDetailedLogging: enableDetailedLogging.toString()
      });

      const response = await fetch(`${API_BASE}/discover?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        }
      });

      if (response.ok) {
        const data = await response.json();
        
        // If we got a jobId, show the progress tracker
        if (data.jobId) {
          setActiveJobIdWithPersistence(data.jobId);
          setShowProgressTrackerWithPersistence(true);
        } else {
          // Legacy response without job tracking
          const resultCount = data.totalFound || 0;
          const studiesCreated = data.studiesCreated || 0;
          const processingMethod = data.processingMethod || 'unknown';
          const performance = data.performance;
          
          let message = `Discovery completed!\nFound ${resultCount} results`;
          if (studiesCreated > 0) {
            message += `\nCreated ${studiesCreated} studies with AI analysis`;
          }
          if (processingMethod) {
            message += `\nProcessing method: ${processingMethod}`;
          }
          if (performance && performance.throughputPerSecond) {
            message += `\nPerformance: ${performance.throughputPerSecond} items/sec`;
          }
          
          alert(message);
        }
        
        // Refresh data
        fetchDrugs();
        fetchSearchConfigs();
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Error running manual discovery:', errorData);
        alert(`Error running discovery: ${errorData.error || 'Unknown error occurred'}`);
      }
    } catch (error) {
      console.error('Error running manual discovery:', error);
      alert('Network error. Please check your connection and try again.');
    } finally {
      setIsManualSearchRunning(false);
    }
  };

  const handleJobComplete = (result: any) => {
    setShowProgressTrackerWithPersistence(false);
    setActiveJobIdWithPersistence(null);
    
    // Show completion message
    const message = result?.message || 'Job completed successfully!';
    const studiesCreated = result?.results?.studiesCreated || 0;
    const totalFound = result?.results?.totalFound || 0;
    
    let alertMessage = message;
    if (totalFound > 0) {
      alertMessage = `Discovery completed!\nFound ${totalFound} studies`;
      if (studiesCreated > 0) {
        alertMessage += `\nCreated ${studiesCreated} study records with AI analysis`;
      }
    }
    
    alert(alertMessage);
    
    // Refresh data
    fetchDrugs();
    fetchSearchConfigs();
  };

  const handleJobError = (error: string) => {
    setShowProgressTracker(false);
    setActiveJobId(null);
    alert(`Job failed: ${error}`);
  };

  const runSearchConfig = async (configId: string, configName: string) => {
    setRunningConfigs(prev => new Set(prev).add(configId));
    
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
        
        // If we got a jobId (async response), show the progress tracker
        if (data.jobId) {
          setActiveJobIdWithPersistence(data.jobId);
          setShowProgressTrackerWithPersistence(true);
          
          // Remove the config from running state since we're now tracking via job
          setRunningConfigs(prev => {
            const newSet = new Set(prev);
            newSet.delete(configId);
            return newSet;
          });
        } else {
          // Legacy response without job tracking
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
      setRunningConfigs(prev => {
        const newSet = new Set(prev);
        newSet.delete(configId);
        return newSet;
      });
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
          {/* Tab Navigation */}
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6">
              <button
                onClick={() => setActiveTab('existing')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'existing'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Existing Drugs ({drugs.length})
              </button>
              <button
                onClick={() => setActiveTab('searches')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'searches'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Search Configurations ({searchConfigs.length})
              </button>
              <button
                onClick={() => setActiveTab('manual')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'manual'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Manual Discovery
              </button>
              <button
                onClick={() => setActiveTab('debug')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'debug'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Debug Info
              </button>
              <button
                onClick={() => {
                  setActiveTab('api-health');
                  fetchApiHealth();
                }}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'api-health'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                API Health & Batch Processing
              </button>
            </nav>
          </div>

          {/* Progress Tracker - Always visible regardless of active tab */}
          {showProgressTracker && activeJobId && (
            <div className="p-6 border-b border-gray-100">
              <StudyProgressTracker
                jobId={activeJobId}
                onComplete={handleJobComplete}
              />
            </div>
          )}

          <div className="p-6">
            {activeTab === 'existing' && (
              <div>
                <h2 className="text-xl font-semibold mb-4">Existing Drugs</h2>
                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-2 text-gray-600">Loading drugs...</p>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    {drugs.length === 0 ? 'No drugs found.' : `${drugs.length} drugs loaded.`}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'searches' && (
              <div>
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
                      <option value="custom">Custom (Manual/Date Range)</option>
                      <option value="daily">Daily (Last 24 hours)</option>
                      <option value="weekly">Weekly (Last 7 days)</option>
                      <option value="monthly">Monthly (Last 30 days)</option>
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
                            <strong>{frequency.charAt(0).toUpperCase() + frequency.slice(1)} Search:</strong> 
                            {frequency === 'daily' && ' Will search articles from the last 24 hours'}
                            {frequency === 'weekly' && ' Will search articles from the last 7 days'}
                            {frequency === 'monthly' && ' Will search articles from the last 30 days'}
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
                        <div key={config.id} className="border rounded-lg p-4 bg-white">
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
                                  <span>Last Run: {new Date(config.lastRunAt).toLocaleDateString()}</span>
                                )}
                                {config.nextRunAt && config.frequency !== 'manual' && (
                                  <span>Next Run: {new Date(config.nextRunAt).toLocaleDateString()}</span>
                                )}
                              </div>
                            </div>
                            <div className="ml-4">
                              <button
                                onClick={() => runSearchConfig(config.id, config.name)}
                                disabled={runningConfigs.has(config.id)}
                                className={`px-4 py-2 text-sm font-medium rounded-md ${
                                  runningConfigs.has(config.id)
                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                    : 'bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500'
                                }`}
                              >
                                {runningConfigs.has(config.id) ? (
                                  <div className="flex items-center">
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                    Running...
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
            )}

            {activeTab === 'manual' && (
              <div>
                <h2 className="text-xl font-semibold mb-4">Manual Drug Discovery</h2>
                
                {/* Manual Discovery Form */}
                <div className="bg-gray-50 p-6 rounded-lg mb-6">
                  <h3 className="text-lg font-medium mb-4">Run One-Time Discovery</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Perform a one-time drug discovery search with AI analysis and study creation.
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Search Query *
                      </label>
                      <input
                        type="text"
                        value={manualQuery}
                        onChange={(e) => setManualQuery(e.target.value)}
                        placeholder="e.g., aspirin, hypertension, drug name..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={isManualSearchRunning}
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Sponsor (Optional)
                      </label>
                      <input
                        type="text"
                        value={manualSponsor}
                        onChange={(e) => setManualSponsor(e.target.value)}
                        placeholder="e.g., Pfizer, GSK, Bristol Myers..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={isManualSearchRunning}
                      />
                    </div>
                  </div>
                  
                  {/* Batch Processing Configuration */}
                  <div className="mt-6 border-t pt-6">
                    <h4 className="font-medium text-gray-900 mb-4">AI Processing Configuration</h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div>
                        <label className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={batchProcessingEnabled}
                            onChange={(e) => setBatchProcessingEnabled(e.target.checked)}
                            disabled={isManualSearchRunning}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm font-medium text-gray-700">
                            Enable Batch Processing
                          </span>
                        </label>
                        <p className="text-xs text-gray-500 mt-1">
                          Use high-performance batch AI processing for faster results
                        </p>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Batch Size
                        </label>
                        <input
                          type="number"
                          value={batchSize}
                          onChange={(e) => setBatchSize(Math.max(1, Math.min(50, parseInt(e.target.value) || 20)))}
                          min="1"
                          max="50"
                          disabled={isManualSearchRunning || !batchProcessingEnabled}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Items processed per batch (1-50)
                        </p>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Max Concurrency
                        </label>
                        <input
                          type="number"
                          value={maxConcurrency}
                          onChange={(e) => setMaxConcurrency(Math.max(1, Math.min(8, parseInt(e.target.value) || 4)))}
                          min="1"
                          max="8"
                          disabled={isManualSearchRunning || !batchProcessingEnabled}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Concurrent requests (1-8)
                        </p>
                      </div>
                      
                      <div>
                        <label className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={enableDetailedLogging}
                            onChange={(e) => setEnableDetailedLogging(e.target.checked)}
                            disabled={isManualSearchRunning}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm font-medium text-gray-700">
                            Detailed Logging
                          </span>
                        </label>
                        <p className="text-xs text-gray-500 mt-1">
                          Enable verbose logging for debugging
                        </p>
                      </div>
                    </div>
                    
                    <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                      <p className="text-sm text-blue-800">
                        <strong>Performance Tips:</strong> Batch processing can significantly improve performance for large datasets. 
                        Higher batch sizes and concurrency may be faster but use more resources. 
                        For small datasets (&lt; 5 items), sequential processing may be automatically used.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between mt-6">
                    <div className="text-sm text-gray-500">
                      <p>• Searches PubMed for relevant studies</p>
                      <p>• Processes results with AI inference</p>
                      <p>• Creates detailed study records</p>
                      <p>• Includes progress tracking with failover</p>
                    </div>
                    
                    <button
                      onClick={runManualDiscovery}
                      disabled={isManualSearchRunning || !manualQuery.trim()}
                      className={`px-6 py-3 font-medium rounded-md ${
                        isManualSearchRunning || !manualQuery.trim()
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500'
                      }`}
                    >
                      {isManualSearchRunning ? (
                        <div className="flex items-center">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Starting Discovery...
                        </div>
                      ) : (
                        'Start Discovery'
                      )}
                    </button>
                  </div>
                </div>
                
                {/* Instructions */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-medium text-blue-900 mb-2">How Manual Discovery Works</h4>
                  <div className="text-sm text-blue-800">
                    <p className="mb-2">
                      Manual discovery allows you to run a one-time search without creating a saved configuration:
                    </p>
                    <ol className="list-decimal list-inside space-y-1 ml-4">
                      <li>Enter your search query (drug name, condition, etc.)</li>
                      <li>Optionally specify a sponsor to filter results</li>
                      <li>Click "Start Discovery" to begin the process</li>
                      <li>Watch real-time progress as studies are found and processed</li>
                      <li>AI analysis creates detailed study records automatically</li>
                    </ol>
                    <p className="mt-2 font-medium">
                      The system includes automatic failover to ensure reliable AI processing even if some endpoints are down.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'api-health' && (
              <div>
                <h2 className="text-xl font-semibold mb-4">API Health & Batch Processing</h2>
                
                <div className="space-y-6">
                  {/* API Health Status */}
                  <div className="bg-gray-50 p-6 rounded-lg">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-medium">AI Inference API Status</h3>
                      <button
                        onClick={fetchApiHealth}
                        disabled={loadingApiHealth}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {loadingApiHealth ? 'Refreshing...' : 'Refresh Status'}
                      </button>
                    </div>
                    
                    {apiHealth ? (
                      <div className="space-y-4">
                        {/* Overall Status */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="bg-white p-4 rounded border">
                            <h4 className="font-medium text-gray-900 mb-2">Legacy Processing</h4>
                            <p className="text-sm text-gray-600">Healthy Endpoints: {apiHealth.legacy.healthyEndpoints}/{apiHealth.legacy.totalEndpoints}</p>
                            <p className="text-sm text-gray-600">Avg Response: {apiHealth.legacy.averageResponseTime}ms</p>
                          </div>
                          
                          <div className="bg-white p-4 rounded border">
                            <h4 className="font-medium text-gray-900 mb-2">Batch Processing</h4>
                            <p className="text-sm text-gray-600">Healthy Endpoints: {apiHealth.batch.healthyEndpoints}/{apiHealth.batch.totalEndpoints}</p>
                            <p className="text-sm text-gray-600">Avg Response: {apiHealth.batch.averageResponseTime}ms</p>
                          </div>
                          
                          <div className="bg-white p-4 rounded border">
                            <h4 className="font-medium text-gray-900 mb-2">Recommendation</h4>
                            <p className="text-sm text-gray-600">Method: {apiHealth.overall.recommendedProcessingMethod}</p>
                            <p className="text-sm text-gray-600">
                              Use Batch: {apiHealth.overall.performance.recommendBatch ? '✅ Yes' : '❌ No'}
                            </p>
                          </div>
                        </div>
                        
                        {/* Endpoint Details */}
                        <div>
                          <h4 className="font-medium text-gray-900 mb-3">Endpoint Details</h4>
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            {apiHealth.batch.endpoints.map((endpoint: any, index: number) => (
                              <div key={index} className="bg-white p-4 rounded border">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-sm font-medium truncate">{endpoint.url}</span>
                                  <span className={`px-2 py-1 text-xs rounded ${
                                    endpoint.isHealthy 
                                      ? 'bg-green-100 text-green-800' 
                                      : 'bg-red-100 text-red-800'
                                  }`}>
                                    {endpoint.isHealthy ? 'Healthy' : 'Unhealthy'}
                                  </span>
                                </div>
                                <div className="text-xs text-gray-600 space-y-1">
                                  <p>Response Time: {endpoint.responseTimeMs}ms</p>
                                  <p>Failures: {endpoint.consecutiveFailures}</p>
                                  <p>Active Requests: {endpoint.currentRequests || 0}</p>
                                  {endpoint.lastSuccessAt && (
                                    <p>Last Success: {new Date(endpoint.lastSuccessAt).toLocaleString()}</p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                        
                        {/* Connection Test Results */}
                        {apiHealth.connectionTests && (
                          <div>
                            <h4 className="font-medium text-gray-900 mb-3">Connection Test Results</h4>
                            <div className="bg-white p-4 rounded border">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <h5 className="text-sm font-medium text-gray-700 mb-2">Legacy Processing</h5>
                                  <p className="text-sm text-gray-600">
                                    Success: {apiHealth.connectionTests.legacy.success ? '✅' : '❌'}
                                  </p>
                                  <p className="text-sm text-gray-600">
                                    Healthy: {apiHealth.connectionTests.legacy.healthyCount}/{apiHealth.connectionTests.legacy.totalCount}
                                  </p>
                                </div>
                                <div>
                                  <h5 className="text-sm font-medium text-gray-700 mb-2">Batch Processing</h5>
                                  <p className="text-sm text-gray-600">
                                    Success: {apiHealth.connectionTests.batch.success ? '✅' : '❌'}
                                  </p>
                                  <p className="text-sm text-gray-600">
                                    Healthy: {apiHealth.connectionTests.batch.healthyCount}/{apiHealth.connectionTests.batch.totalCount}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-gray-600">Click "Refresh Status" to load API health information.</p>
                    )}
                  </div>
                  
                  {/* Batch Processing Test */}
                  <div className="bg-gray-50 p-6 rounded-lg">
                    <h3 className="text-lg font-medium mb-4">Batch Processing Test</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Test the batch processing system with sample data to verify performance and functionality.
                    </p>
                    
                    <button
                      onClick={testBatchProcessing}
                      className="px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                      Run Batch Processing Test
                    </button>
                    
                    <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
                      <p className="text-sm text-blue-800">
                        <strong>Test Details:</strong> This will send 3 sample drug records through the batch processing system 
                        to test performance, failover, and response handling. Results will show processing time and success rates.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'debug' && (
              <div>
                <h2 className="text-xl font-semibold mb-4">Debug Information</h2>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-medium mb-4">User Authentication & Permissions</h3>
                  
                  {userInfo ? (
                    <div className="space-y-2">
                      <p><strong>User ID:</strong> {userInfo.id}</p>
                      <p><strong>Username:</strong> {userInfo.username}</p>
                      <p><strong>Role:</strong> {userInfo.role}</p>
                      <p><strong>Has Write Permission:</strong> {userInfo.hasWritePermission ? '✅ Yes' : '❌ No'}</p>
                      <p><strong>Has Create Permission:</strong> {userInfo.hasCreatePermission ? '✅ Yes' : '❌ No'}</p>
                      
                      <div className="mt-4">
                        <strong>All Permissions:</strong>
                        <pre className="mt-2 p-2 bg-white border rounded text-xs overflow-auto">
                          {JSON.stringify(userInfo.permissions, null, 2)}
                        </pre>
                      </div>
                      
                      <div className="mt-4">
                        <strong>Auth Token Preview:</strong>
                        <p className="text-xs text-gray-600">
                          {localStorage.getItem('auth_token') ? 
                            `${localStorage.getItem('auth_token')?.substring(0, 20)}...` : 
                            'No token found'
                          }
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-600">Loading user information...</p>
                  )}
                </div>

                <div className="bg-yellow-50 p-4 rounded-lg mt-6">
                  <h3 className="text-lg font-medium mb-4">Job Tracking Debug</h3>
                  
                  <div className="space-y-2">
                    <p><strong>Active Job ID:</strong> {activeJobId || 'None'}</p>
                    <p><strong>Show Progress Tracker:</strong> {showProgressTracker ? '✅ Yes' : '❌ No'}</p>
                    <p><strong>Stored Job ID:</strong> {typeof window !== 'undefined' ? localStorage.getItem('activeJobId') || 'None' : 'N/A'}</p>
                    <p><strong>Stored Show Tracker:</strong> {typeof window !== 'undefined' ? localStorage.getItem('showProgressTracker') || 'None' : 'N/A'}</p>
                    <p><strong>Job Timestamp:</strong> {typeof window !== 'undefined' ? (localStorage.getItem('jobTimestamp') ? new Date(parseInt(localStorage.getItem('jobTimestamp') || '0')).toLocaleString() : 'None') : 'N/A'}</p>
                    
                    <div className="mt-4 pt-4 border-t border-yellow-200">
                      <button
                        onClick={() => {
                          clearJobData();
                          alert('Cleared all job tracking data from localStorage');
                        }}
                        className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                      >
                        Clear Stale Job Data
                      </button>
                      <p className="text-xs text-gray-600 mt-2">
                        Use this button if you're experiencing issues with stuck progress trackers or old job IDs
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
