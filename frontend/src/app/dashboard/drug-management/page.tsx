"use client";
import React, { useState, useEffect } from "react";
import { getApiBaseUrl } from "@/config/api";
import StudyProgressTracker from "@/components/StudyProgressTracker";
import { exportToPDF, exportToExcel } from "@/utils/exportUtils";
import { useSelector } from 'react-redux';
import { RootState } from '@/redux/store';

interface DrugSearchConfig {
  id: string;
  name: string;
  inn?: string;
  query: string;
  sponsor: string;
  brandName?: string;
  frequency: string;
  isActive: boolean;
  lastRunAt: string | null;
  nextRunAt: string | null;
  totalRuns: number;
  lastResultCount: number;
  lastRunPmids?: string[];
  dateFrom?: string;
  dateTo?: string;
}

export default function DrugManagementPage() {
  const selectedOrganizationId = useSelector((state: RootState) => state.filter.selectedOrganizationId);
  const [searchConfigs, setSearchConfigs] = useState<DrugSearchConfig[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Edit and Modal state
  const [editingConfigId, setEditingConfigId] = useState<string | null>(null);
  const [showPmidModal, setShowPmidModal] = useState(false);
  const [selectedPmids, setSelectedPmids] = useState<string[]>([]);
  const [selectedConfigName, setSelectedConfigName] = useState('');

  // Form fields
  const [inn, setInn] = useState('');
  const [query, setQuery] = useState('');
  const [sponsor, setSponsor] = useState('');
  const [brandName, setBrandName] = useState('');
  const [frequency, setFrequency] = useState('custom');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  // Keep HTML date format for the input fields
  const [dateFromInput, setDateFromInput] = useState('');
  const [dateToInput, setDateToInput] = useState('');
  
  // Weekly schedule fields
  const [weeklyDate, setWeeklyDate] = useState('');
  const [weeklyTime, setWeeklyTime] = useState('00:00');
  const [allowedDays, setAllowedDays] = useState<string[]>([]);
  const [selectedDay, setSelectedDay] = useState('');

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
    fetchAllowedDays();
    
    // Restore job state from localStorage on page load
    const persistedJobId = localStorage.getItem('activeJobId');
    const shouldShowTracker = localStorage.getItem('showProgressTracker') === 'true';
    const savedConfigName = localStorage.getItem('runningConfigName') || '';
    
    if (persistedJobId && shouldShowTracker) {
      setActiveJobId(persistedJobId);
      setShowProgressTracker(true);
      setRunningConfigName(savedConfigName);
    }
  }, [selectedOrganizationId]);

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

  const fetchAllowedDays = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${getApiBaseUrl()}/admin-config/scheduler`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data && data.configData && Array.isArray(data.configData.allowedWeeklyDays)) {
          setAllowedDays(data.configData.allowedWeeklyDays);
        } else {
          // Default to all days if not configured
          setAllowedDays(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']);
        }
      } else {
        // Fallback if endpoint fails or returns 404 (not configured yet)
        setAllowedDays(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']);
      }
    } catch (err) {
      console.error('Error fetching allowed days:', err);
      setAllowedDays(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']);
    }
  };

  const fetchSearchConfigs = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const queryParams = selectedOrganizationId ? `?organizationId=${selectedOrganizationId}` : '';
      const response = await fetch(`${API_BASE}/search-configs${queryParams}`, {
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

  const handleEdit = (config: DrugSearchConfig) => {
    setEditingConfigId(config.id);
    setInn(config.inn || config.name);
    setQuery(config.query);
    setSponsor(config.sponsor);
    setBrandName(config.brandName || '');
    setFrequency(config.frequency);
    
    if (config.dateFrom) {
      setDateFrom(config.dateFrom);
      setDateFromInput(config.dateFrom.replace(/\//g, '-'));
    } else {
      setDateFrom('');
      setDateFromInput('');
    }
    
    if (config.dateTo) {
      setDateTo(config.dateTo);
      setDateToInput(config.dateTo.replace(/\//g, '-'));
    } else {
      setDateTo('');
      setDateToInput('');
    }

    if (config.frequency === 'weekly' && config.nextRunAt) {
      const date = new Date(config.nextRunAt);
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      setSelectedDay(days[date.getDay()]);
    } else {
      setSelectedDay('');
    }
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeactivate = async (configId: string) => {
    if (!confirm('Are you sure you want to deactivate this configuration?')) return;
    
    try {
      const token = localStorage.getItem('auth_token');
      // Use PUT to update isActive to false
      const response = await fetch(`${API_BASE}/search-configs/${configId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify({ isActive: false })
      });
      
      if (response.ok) {
        alert('Configuration deactivated successfully');
        fetchSearchConfigs();
      } else {
        alert('Failed to deactivate configuration');
      }
    } catch (error) {
      console.error('Error deactivating config:', error);
      alert('Error deactivating configuration');
    }
  };

  const resetForm = () => {
    setEditingConfigId(null);
    setInn('');
    setQuery('');
    setSponsor('');
    setBrandName('');
    setFrequency('custom');
    setDateFrom('');
    setDateTo('');
    setDateFromInput('');
    setDateToInput('');
    setWeeklyDate('');
    setWeeklyTime('00:00');
    setSelectedDay('');
  };

  const saveConfiguration = async () => {
    if (!inn.trim() || !query.trim() || !sponsor.trim()) {
      alert('Please enter INN, Literature Search String, and Sponsor.');
      return;
    }

    let nextRunAt = null;
    if (frequency === 'weekly') {
      if (!selectedDay && !editingConfigId) {
        alert('Please select a day for the weekly schedule.');
        return;
      }
      
      if (selectedDay) {
        // Calculate next occurrence of the selected day
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const targetDayIndex = days.indexOf(selectedDay);
        const now = new Date();
        const currentDayIndex = now.getDay();
        
        let daysUntilTarget = targetDayIndex - currentDayIndex;
        if (daysUntilTarget <= 0) {
          daysUntilTarget += 7;
        }
        
        const nextRunDate = new Date(now);
        nextRunDate.setDate(now.getDate() + daysUntilTarget);
        nextRunDate.setHours(0, 0, 0, 0); // Default to 00:00
        
        nextRunAt = nextRunDate.toISOString();
      }
    }

    setSaving(true);
    try {
      const token = localStorage.getItem('auth_token');
      const url = editingConfigId 
        ? `${API_BASE}/search-configs/${editingConfigId}`
        : `${API_BASE}/search-configs`;
        
      const method = editingConfigId ? 'PUT' : 'POST';
      
      // Generate config name automatically: INN(brandName)_Client_DateAndTime_TimeZone
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      
      // Get timezone abbreviation
      const timeZone = now.toLocaleTimeString('en-US', { timeZoneName: 'short' }).split(' ').pop() || '';
      
      const dateStr = `${year}-${month}-${day}_${hours}-${minutes}_${timeZone}`;
      const brandPart = brandName.trim() ? `(${brandName.trim()})` : '';
      const generatedName = `${inn.trim()}${brandPart}_${sponsor.trim()}_${dateStr}`;

      const body: any = {
        name: generatedName,
        inn: inn.trim(),
        query: query.trim(),
        sponsor: sponsor.trim(),
        brandName: brandName.trim(),
        frequency: frequency,
        maxResults: 1000,
        includeAdverseEvents: true,
        includeSafety: true,
        sendToExternalApi: true,
        dateFrom: dateFrom && dateFrom.trim() ? dateFrom.trim() : null,
        dateTo: dateTo && dateTo.trim() ? dateTo.trim() : null
      };
      
      if (nextRunAt) {
        body.nextRunAt = nextRunAt;
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify(body)
      });

      if (response.ok) {
        alert(`Search configuration ${editingConfigId ? 'updated' : 'saved'} successfully!`);
        resetForm();
        fetchSearchConfigs();
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Full error response:', response.status, response.statusText, errorData);
        
        if (response.status === 403) {
          alert(`Permission Error: ${errorData.error || 'You do not have permission to manage drug search configurations.'}`);
        } else if (response.status === 401) {
          alert('Authentication Error: Please log in again.');
        } else if (response.status === 400 && errorData.details) {
          // Show specific validation errors
          const validationErrors = errorData.details.map((detail: any) => detail.msg).join('\n');
          alert(`Validation Error:\n${validationErrors}`);
        } else {
          alert(`Error: ${errorData.error || 'Failed to save configuration'}`);
        }
      }
    } catch (error) {
      console.error('Error saving search config:', error);
      alert('Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleExportConfigs = (type: 'pdf' | 'excel') => {
    const filteredConfigs = searchConfigs.filter(config => {
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return (
        config.name.toLowerCase().includes(term) ||
        config.query.toLowerCase().includes(term) ||
        (config.sponsor && config.sponsor.toLowerCase().includes(term)) ||
        (config.brandName && config.brandName.toLowerCase().includes(term))
      );
    });

    if (type === 'pdf') {
      const columns = ["Name", "Query", "Client", "Frequency", "Last Result Count"];
      const data = filteredConfigs.map(c => [
        c.name, 
        c.query, 
        c.sponsor || '', 
        c.frequency, 
        c.lastResultCount.toString()
      ]);
      exportToPDF("Drug Search Configurations", columns, data, "drug_search_configs");
    } else {
      const data = filteredConfigs.map(c => ({
        Name: c.name,
        Query: c.query,
        Client: c.sponsor,
        BrandName: c.brandName,
        Frequency: c.frequency,
        LastResultCount: c.lastResultCount,
        LastRunAt: c.lastRunAt
      }));
      exportToExcel(data, "drug_search_configs");
    }
  };

  const handleExportPmids = (type: 'pdf' | 'excel') => {
    if (type === 'pdf') {
      const columns = ["PMID", "Link"];
      const data = selectedPmids.map(pmid => [
        pmid, 
        `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`
      ]);
      exportToPDF(`PMIDs for ${selectedConfigName}`, columns, data, `${selectedConfigName}_pmids`);
    } else {
      const data = selectedPmids.map(pmid => ({
        PMID: pmid,
        Link: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`
      }));
      exportToExcel(data, `${selectedConfigName}_pmids`);
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
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Drug Management</h2>
              </div>
              {/* <h2 className="text-xl font-semibold mb-4">Search Configurations</h2> */}
              
              {/* Create Form */}
              <div className="bg-gray-50 p-4 rounded-lg mb-6">
                <h3 className="text-lg font-medium mb-4">Create new literature search string configuration</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    type="text"
                    value={inn}
                    onChange={(e) => setInn(e.target.value)}
                    placeholder="INN"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                  <input
                    type="text"
                    value={brandName}
                    onChange={(e) => setBrandName(e.target.value)}
                    placeholder="Brand name (Optional)"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Literature Search String Configuration"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                  <input
                    type="text"
                    value={sponsor}
                    onChange={(e) => setSponsor(e.target.value)}
                    placeholder="Client Name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                  <select
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="custom">Custom Date Search</option>
                    <option value="weekly">Weekly</option>
                  </select>
                  {frequency === 'custom' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Date From (Optional)</label>
                        <input
                          type="date"
                          value={dateFromInput}
                          onChange={(e) => {
                            const dateValue = e.target.value; // YYYY-MM-DD format
                            setDateFromInput(dateValue);
                            if (dateValue) {
                              setDateFrom(dateValue.replace(/-/g, '/')); // Convert to YYYY/MM/DD for backend
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
                          value={dateToInput}
                          onChange={(e) => {
                            const dateValue = e.target.value; // YYYY-MM-DD format
                            setDateToInput(dateValue);
                            if (dateValue) {
                              setDateTo(dateValue.replace(/-/g, '/')); // Convert to YYYY/MM/DD for backend
                            } else {
                              setDateTo('');
                            }
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        />
                      </div>
                    </>
                  )}
                  {frequency === 'weekly' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Select Day</label>
                        <select
                          value={selectedDay}
                          onChange={(e) => setSelectedDay(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        >
                          <option value="">Select a day...</option>
                          {allowedDays.map(day => (
                            <option key={day} value={day}>{day}</option>
                          ))}
                        </select>
                      </div>
                    </>
                  )}
                  {frequency !== 'custom' && (
                    <div className="md:col-span-2">
                      <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                        <p className="text-sm text-blue-800">
                          <strong>{frequency.charAt(0).toUpperCase() + frequency.slice(1)} Search:</strong> 
                          {frequency === 'weekly' && ' Will search articles from the last 7 days and run every week starting from the selected date/time'}
                        </p>
                        <p className="text-xs text-blue-600 mt-1">
                          <strong>Scheduler runs every 12 hours</strong> - your search will be automatically executed when due
                        </p>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={saveConfiguration}
                    disabled={saving || !inn.trim() || !query.trim() || !sponsor.trim()}
                    className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : (editingConfigId ? 'Update Configuration' : 'Save Configuration')}
                  </button>
                  {editingConfigId && (
                    <button
                      onClick={resetForm}
                      className="bg-gray-500 text-white px-6 py-2 rounded-md hover:bg-gray-600"
                    >
                      Cancel Edit
                    </button>
                  )}
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
                          name: `${inn.trim()}_${sponsor.trim()}_${brandName.trim() || 'NoBrand'}_${new Date().toISOString()}`,
                          inn: inn.trim(),
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
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium">Your Search Configurations</h3>
                  <div className="flex items-center gap-2">
                    <div className="relative w-64">
                      <input
                        type="text"
                        placeholder="Search by PMID, Drug Name or Client..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      />
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </div>
                    </div>
                    <button
                      onClick={() => handleExportConfigs('pdf')}
                      className="px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm font-medium"
                      title="Export to PDF"
                    >
                      PDF
                    </button>
                    <button
                      onClick={() => handleExportConfigs('excel')}
                      className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm font-medium"
                      title="Export to Excel"
                    >
                      Excel
                    </button>
                  </div>
                </div>
                {searchConfigs.length === 0 ? (
                  <div className="text-center py-8 bg-gray-50 rounded-lg">
                    <p className="text-gray-600">
                      No search configurations yet. Create one above to start automatic drug discovery.
                    </p>
                  </div>
                ) : !searchTerm ? (
                  <div className="text-center py-8 bg-gray-50 rounded-lg">
                    <p className="text-gray-600">
                      Please enter a search term to find configurations.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {searchConfigs
                      .filter(config => {
                        if (!searchTerm) return true;
                        const term = searchTerm.toLowerCase();
                        return (
                          config.name.toLowerCase().includes(term) ||
                          config.query.toLowerCase().includes(term) ||
                          (config.sponsor && config.sponsor.toLowerCase().includes(term)) ||
                          (config.brandName && config.brandName.toLowerCase().includes(term))
                        );
                      })
                      .map((config) => (
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
                            <p className="text-sm text-gray-600">
                              Frequency: {config.frequency}
                              {config.frequency === 'custom' && config.dateFrom && config.dateTo && (
                                <span className="ml-1">
                                  ({new Date(config.dateFrom).toLocaleDateString()} - {new Date(config.dateTo).toLocaleDateString()})
                                </span>
                              )}
                            </p>
                            {config.sponsor && (
                              <p className="text-sm text-gray-600">Client: {config.sponsor}</p>
                            )}
                            <div className="mt-2 flex flex-wrap gap-4 text-xs text-gray-500">
                              <button 
                                onClick={() => {
                                  if (config.lastRunPmids && config.lastRunPmids.length > 0) {
                                    setSelectedPmids(config.lastRunPmids);
                                    setSelectedConfigName(config.name);
                                    setShowPmidModal(true);
                                  } else {
                                    alert('No PMIDs available for the last run.');
                                  }
                                }}
                                className="text-blue-600 hover:text-blue-800 underline font-medium"
                              >
                                Total hits: {config.lastResultCount}
                              </button>
                            </div>
                          </div>
                          <div className="ml-4 flex flex-col gap-2">
                            <button
                              onClick={() => runSearchConfig(config.id, config.name)}
                              disabled={runningConfigs.has(config.id) || (showProgressTracker && config.name === runningConfigName)}
                              className={`px-4 py-2 text-sm font-medium rounded-md w-full ${
                                runningConfigs.has(config.id) || (showProgressTracker && config.name === runningConfigName)
                                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                  : 'bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500'
                              }`}
                            >
                              {runningConfigs.has(config.id) || (showProgressTracker && config.name === runningConfigName) ? (
                                <div className="flex items-center justify-center">
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400 mr-2"></div>
                                  Running...
                                </div>
                              ) : (
                                'Run Now'
                              )}
                            </button>
                            <button
                              onClick={() => handleEdit(config)}
                              className="px-4 py-2 text-sm font-medium rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 w-full"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeactivate(config.id)}
                              className="px-4 py-2 text-sm font-medium rounded-md bg-red-100 text-red-700 hover:bg-red-200 w-full"
                            >
                              Deactivate
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
      {/* PMID Modal */}
      {showPmidModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
          <div className="relative p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">PMIDs for {selectedConfigName}</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleExportPmids('pdf')}
                  className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                >
                  Export PDF
                </button>
                <button
                  onClick={() => handleExportPmids('excel')}
                  className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                >
                  Export Excel
                </button>
                <button
                  onClick={() => setShowPmidModal(false)}
                  className="text-gray-400 hover:text-gray-500 ml-2"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="mt-2 max-h-96 overflow-y-auto">
              {selectedPmids.length > 0 ? (
                <div className="grid grid-cols-3 gap-2">
                  {selectedPmids.map((pmid, index) => (
                    <div key={index} className="bg-gray-50 p-2 rounded border text-center text-sm">
                      <a 
                        href={`https://pubmed.ncbi.nlm.nih.gov/${pmid}/`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        {pmid}
                      </a>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">No PMIDs found.</p>
              )}
            </div>
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setShowPmidModal(false)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
