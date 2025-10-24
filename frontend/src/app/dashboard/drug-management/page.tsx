"use client";"use client";

import React, { useState, useEffect } from "react";import React, { useState, useEffect } from "react";

import { getApiBaseUrl } from "@/config/api";import { getApiBaseUrl } from "@/config/api";

import StudyProgressTracker from "@/components/StudyProgressTracker";import StudyProgressTracker from "@/components/StudyProgressTracker";



interface DrugSearchConfig {interface DrugSearchConfig {

  id: string;  id: string;

  name: string;  name: string;

  query: string;  query: string;

  sponsor: string;  sponsor: string;

  frequency: string;  frequency: string;

  isActive: boolean;  isActive: boolean;

  lastRunAt: string | null;  lastRunAt: string | null;

  nextRunAt: string | null;  nextRunAt: string | null;

  totalRuns: number;  totalRuns: number;

  lastResultCount: number;  lastResultCount: number;

}}



export default function DrugManagementPage() {export default function DrugManagementPage() {

  const [searchConfigs, setSearchConfigs] = useState<DrugSearchConfig[]>([]);  const [searchConfigs, setSearchConfigs] = useState<DrugSearchConfig[]>([]);

    

  // Form fields  // Form fields

  const [configName, setConfigName] = useState('');  const [configName, setConfigName] = useState('');

  const [query, setQuery] = useState('');  const [query, setQuery] = useState('');

  const [sponsor, setSponsor] = useState('');  const [sponsor, setSponsor] = useState('');

  const [frequency, setFrequency] = useState('custom');  const [frequency, setFrequency] = useState('custom');

  const [dateFrom, setDateFrom] = useState('');  const [dateFrom, setDateFrom] = useState('');

  const [dateTo, setDateTo] = useState('');  const [dateTo, setDateTo] = useState('');

  // Keep HTML date format for the input fields  // Keep HTML date format for the input fields

  const [dateFromInput, setDateFromInput] = useState('');  const [dateFromInput, setDateFromInput] = useState('');

  const [dateToInput, setDateToInput] = useState('');  const [dateToInput, setDateToInput] = useState('');

  const [saving, setSaving] = useState(false);  const [saving, setSaving] = useState(false);

  const [runningConfigs, setRunningConfigs] = useState<Set<string>>(new Set());  const [runningConfigs, setRunningConfigs] = useState<Set<string>>(new Set());

    

  // Progress tracking state  // Progress tracking state

  const [activeJobId, setActiveJobId] = useState<string | null>(null);  const [activeJobId, setActiveJobId] = useState<string | null>(null);

  const [showProgressTracker, setShowProgressTracker] = useState(false);  const [showProgressTracker, setShowProgressTracker] = useState(false);

  const [runningConfigName, setRunningConfigName] = useState<string>('');  const [runningConfigName, setRunningConfigName] = useState<string>('');



  const API_BASE = `${getApiBaseUrl()}/drugs`;  const API_BASE = `${getApiBaseUrl()}/drugs`;



  // Helper function to format time until next run  // Helper function to format time until next run

  const getTimeUntilRun = (nextRunTime: string) => {  const getTimeUntilRun = (nextRunTime: string) => {

    const now = new Date();    const now = new Date();

    const nextRun = new Date(nextRunTime);    const nextRun = new Date(nextRunTime);

    const diffMs = nextRun.getTime() - now.getTime();    const diffMs = nextRun.getTime() - now.getTime();

        

    if (diffMs <= 0) return "Due now";    if (diffMs <= 0) return "Due now";

        

    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

        

    if (diffHours > 24) {    if (diffHours > 24) {

      const diffDays = Math.floor(diffHours / 24);      const diffDays = Math.floor(diffHours / 24);

      return `in ${diffDays} day${diffDays > 1 ? 's' : ''}`;      return `in ${diffDays} day${diffDays > 1 ? 's' : ''}`;

    } else if (diffHours > 0) {    } else if (diffHours > 0) {

      return `in ${diffHours}h ${diffMinutes}m`;      return `in ${diffHours}h ${diffMinutes}m`;

    } else {    } else {

      return `in ${diffMinutes} min${diffMinutes !== 1 ? 's' : ''}`;      return `in ${diffMinutes} min${diffMinutes !== 1 ? 's' : ''}`;

    }    }

  };  };



  useEffect(() => {  useEffect(() => {

    fetchSearchConfigs();    fetchSearchConfigs();

        

    // Restore job state from localStorage on page load    // Restore job state from localStorage on page load

    const persistedJobId = localStorage.getItem('activeJobId');    const persistedJobId = localStorage.getItem('activeJobId');

    const shouldShowTracker = localStorage.getItem('showProgressTracker') === 'true';    const shouldShowTracker = localStorage.getItem('showProgressTracker') === 'true';

    const savedConfigName = localStorage.getItem('runningConfigName') || '';    const savedConfigName = localStorage.getItem('runningConfigName') || '';

        

    if (persistedJobId && shouldShowTracker) {    if (persistedJobId && shouldShowTracker) {

      setActiveJobId(persistedJobId);      setActiveJobId(persistedJobId);

      setShowProgressTracker(true);      setShowProgressTracker(true);

      setRunningConfigName(savedConfigName);      setRunningConfigName(savedConfigName);

    }    }

  }, []);  }, []);



  // Handle job completion  // Handle job completion

  const handleJobComplete = (results: any) => {  const handleJobComplete = (results: any) => {

    console.log('Job completed with results:', results);    console.log('Job completed with results:', results);

        

    // Clear job state    // Clear job state

    setActiveJobId(null);    setActiveJobId(null);

    setShowProgressTracker(false);    setShowProgressTracker(false);

    setRunningConfigName('');    setRunningConfigName('');

    setRunningConfigs(new Set());    setRunningConfigs(new Set());

        

    // Clear localStorage    // Clear localStorage

    localStorage.removeItem('activeJobId');    localStorage.removeItem('activeJobId');

    localStorage.removeItem('showProgressTracker');    localStorage.removeItem('showProgressTracker');

    localStorage.removeItem('runningConfigName');    localStorage.removeItem('runningConfigName');

        

    // Refresh configurations to show updated stats    // Refresh configurations to show updated stats

    fetchSearchConfigs();    fetchSearchConfigs();

        

    // Show completion message    // Show completion message

    const studiesCreated = results?.results?.studiesCreated || 0;    const studiesCreated = results?.results?.studiesCreated || 0;

    const totalFound = results?.results?.totalFound || 0;    const totalFound = results?.results?.totalFound || 0;

        

    if (studiesCreated > 0) {    if (studiesCreated > 0) {

      alert(`Discovery completed successfully!\nFound ${totalFound} articles and created ${studiesCreated} studies.`);      alert(`Discovery completed successfully!\nFound ${totalFound} articles and created ${studiesCreated} studies.`);

    } else {    } else {

      alert(`Discovery completed!\nFound ${totalFound} articles but no studies were created.`);      alert(`Discovery completed!\nFound ${totalFound} articles but no studies were created.`);

    }    }

  };  };



  const fetchSearchConfigs = async () => {  const fetchSearchConfigs = async () => {

    try {    try {

      const token = localStorage.getItem('auth_token');      const token = localStorage.getItem('auth_token');

      const response = await fetch(`${API_BASE}/search-configs`, {      const response = await fetch(`${API_BASE}/search-configs`, {

        headers: {        headers: {

          'Content-Type': 'application/json',          'Content-Type': 'application/json',

          ...(token && { 'Authorization': `Bearer ${token}` })          ...(token && { 'Authorization': `Bearer ${token}` })

        }        }

      });      });

            

      if (response.ok) {      if (response.ok) {

        const data = await response.json();        const data = await response.json();

        setSearchConfigs(data.configs || []);        setSearchConfigs(data.configs || []);

      }      }

    } catch (error) {    } catch (error) {

      console.error('Error fetching search configs:', error);      console.error('Error fetching search configs:', error);

    }    }

  };  };



  const runSearchConfig = async (configId: string, configName: string) => {  const runSearchConfig = async (configId: string, configName: string) => {

    setRunningConfigs(prev => new Set(prev).add(configId));    setRunningConfigs(prev => new Set(prev).add(configId));

    setRunningConfigName(configName);    setRunningConfigName(configName);

        

    try {    try {

      const token = localStorage.getItem('auth_token');      const token = localStorage.getItem('auth_token');

      const response = await fetch(`${API_BASE}/search-configs/${configId}/run`, {      const response = await fetch(`${API_BASE}/search-configs/${configId}/run`, {

        method: 'POST',        method: 'POST',

        headers: {        headers: {

          'Content-Type': 'application/json',          'Content-Type': 'application/json',

          ...(token && { 'Authorization': `Bearer ${token}` })          ...(token && { 'Authorization': `Bearer ${token}` })

        }        }

      });      });



      if (response.ok || response.status === 202) {      if (response.ok || response.status === 202) {

        const data = await response.json();        const data = await response.json();

                

        // If we got a jobId (async response), show progress tracker        // If we got a jobId (async response), show progress tracker

        if (data.jobId) {        if (data.jobId) {

          setActiveJobId(data.jobId);          setActiveJobId(data.jobId);

          setShowProgressTracker(true);          setShowProgressTracker(true);

                    

          // Store job ID in localStorage for persistence across page refreshes          // Store job ID in localStorage for persistence across page refreshes

          localStorage.setItem('activeJobId', data.jobId);          localStorage.setItem('activeJobId', data.jobId);

          localStorage.setItem('showProgressTracker', 'true');          localStorage.setItem('showProgressTracker', 'true');

          localStorage.setItem('runningConfigName', configName);          localStorage.setItem('runningConfigName', configName);

        } else {        } else {

          // Legacy response without job tracking - show alert          // Legacy response without job tracking - show alert

          const resultCount = data.results?.totalFound || 0;          const resultCount = data.results?.totalFound || 0;

          const studiesCreated = data.studiesCreated || 0;          const studiesCreated = data.studiesCreated || 0;

          const aiInferenceStatus = data.aiInferenceCompleted === true ? ' (AI analysis completed)' :           const aiInferenceStatus = data.aiInferenceCompleted === true ? ' (AI analysis completed)' : 

                                   data.aiInferenceCompleted === false ? ' (AI analysis failed)' : '';                                   data.aiInferenceCompleted === false ? ' (AI analysis failed)' : '';

                    

          let message = `Search "${configName}" completed successfully!\nFound ${resultCount} results`;          let message = `Search "${configName}" completed successfully!\nFound ${resultCount} results`;

          if (studiesCreated > 0) {          if (studiesCreated > 0) {

            message += `\nCreated ${studiesCreated} studies with detailed AI analysis`;            message += `\nCreated ${studiesCreated} studies with detailed AI analysis`;

          }          }

          message += aiInferenceStatus;          message += aiInferenceStatus;

                    

          alert(message);          alert(message);

                    

          // Refresh the configurations to show updated stats          // Refresh the configurations to show updated stats

          fetchSearchConfigs();          fetchSearchConfigs();

        }        }

      } else {      } else {

        const errorData = await response.json().catch(() => ({}));        const errorData = await response.json().catch(() => ({}));

        console.error('Error running configuration:', errorData);        console.error('Error running configuration:', errorData);

                

        if (response.status === 403) {        if (response.status === 403) {

          alert(`Permission Error: ${errorData.error || 'You do not have permission to run this configuration.'}`);          alert(`Permission Error: ${errorData.error || 'You do not have permission to run this configuration.'}`);

        } else if (response.status === 404) {        } else if (response.status === 404) {

          alert('Configuration not found. It may have been deleted.');          alert('Configuration not found. It may have been deleted.');

        } else {        } else {

          alert(`Error running search: ${errorData.error || 'Unknown error occurred'}`);          alert(`Error running search: ${errorData.error || 'Unknown error occurred'}`);

        }        }

      }      }

    } catch (error) {    } catch (error) {

      console.error('Error running search config:', error);      console.error('Error running search config:', error);

      alert('Network error. Please check your connection and try again.');      alert('Network error. Please check your connection and try again.');

    } finally {    } finally {

      // Only remove from running configs if we didn't start a job      // Only remove from running configs if we didn't start a job

      if (!showProgressTracker) {      if (!showProgressTracker) {

        setRunningConfigs(prev => {        setRunningConfigs(prev => {

          const newSet = new Set(prev);          const newSet = new Set(prev);

          newSet.delete(configId);          newSet.delete(configId);

          return newSet;          return newSet;

        });        });

      }      }

    }    }

  };  };



  const createSearchConfig = async () => {  const createSearchConfig = async () => {

    if (!configName.trim() || !query.trim()) {    if (!configName.trim() || !query.trim()) {

      alert('Please enter both name and query.');      alert('Please enter both name and query.');

      return;      return;

    }    }



    setSaving(true);    setSaving(true);

    try {    try {

      const token = localStorage.getItem('auth_token');      const token = localStorage.getItem('auth_token');

      const response = await fetch(`${API_BASE}/search-configs`, {      const response = await fetch(`${API_BASE}/search-configs`, {

        method: 'POST',        method: 'POST',

        headers: {        headers: {

          'Content-Type': 'application/json',          'Content-Type': 'application/json',

          ...(token && { 'Authorization': `Bearer ${token}` })          ...(token && { 'Authorization': `Bearer ${token}` })

        },        },

        body: JSON.stringify({        body: JSON.stringify({

          name: configName.trim(),          name: configName.trim(),

          query: query.trim(),          query: query.trim(),

          sponsor: sponsor.trim() || '',          sponsor: sponsor.trim() || '',

          frequency: frequency,          frequency: frequency,

          maxResults: 1000,          maxResults: 1000,

          includeAdverseEvents: true,          includeAdverseEvents: true,

          includeSafety: true,          includeSafety: true,

          sendToExternalApi: true,          sendToExternalApi: true,

          dateFrom: dateFrom && dateFrom.trim() ? dateFrom.trim() : null,          dateFrom: dateFrom && dateFrom.trim() ? dateFrom.trim() : null,

          dateTo: dateTo && dateTo.trim() ? dateTo.trim() : null          dateTo: dateTo && dateTo.trim() ? dateTo.trim() : null

        })        })

      });      });



      if (response.ok) {      if (response.ok) {

        alert('Search configuration saved successfully!');        alert('Search configuration saved successfully!');

        setConfigName('');        setConfigName('');

        setQuery('');        setQuery('');

        setSponsor('');        setSponsor('');

        setFrequency('custom');        setFrequency('custom');

        setDateFrom('');        setDateFrom('');

        setDateTo('');        setDateTo('');

        setDateFromInput('');        setDateFromInput('');

        setDateToInput('');        setDateToInput('');

        fetchSearchConfigs();        fetchSearchConfigs();

      } else {      } else {

        const errorData = await response.json().catch(() => ({}));        const errorData = await response.json().catch(() => ({}));

        console.error('Full error response:', response.status, response.statusText, errorData);        console.error('Full error response:', response.status, response.statusText, errorData);

                

        if (response.status === 403) {        if (response.status === 403) {

          alert(`Permission Error: ${errorData.error || 'You do not have permission to create drug search configurations. Please contact your administrator.'}`);          alert(`Permission Error: ${errorData.error || 'You do not have permission to create drug search configurations. Please contact your administrator.'}`);

        } else if (response.status === 401) {        } else if (response.status === 401) {

          alert('Authentication Error: Please log in again.');          alert('Authentication Error: Please log in again.');

        } else if (response.status === 400 && errorData.details) {        } else if (response.status === 400 && errorData.details) {

          // Show specific validation errors          // Show specific validation errors

          const validationErrors = errorData.details.map((detail: any) => detail.msg).join('\n');          const validationErrors = errorData.details.map((detail: any) => detail.msg).join('\n');

          alert(`Validation Error:\n${validationErrors}\n\nData sent: ${JSON.stringify(errorData.receivedData, null, 2)}`);          alert(`Validation Error:\n${validationErrors}\n\nData sent: ${JSON.stringify(errorData.receivedData, null, 2)}`);

        } else {        } else {

          alert(`Error: ${errorData.error || 'Failed to save configuration'}`);          alert(`Error: ${errorData.error || 'Failed to save configuration'}`);

        }        }

      }      }

    } catch (error) {    } catch (error) {

      console.error('Error creating search config:', error);      console.error('Error creating search config:', error);

      alert('Failed to save configuration');      alert('Failed to save configuration');

    } finally {    } finally {

      setSaving(false);      setSaving(false);

    }    }

  };  };



  return (  return (

    <div className="min-h-screen bg-gray-50">    <div className="min-h-screen bg-gray-50">

      <div className="max-w-7xl mx-auto py-6 px-4">      <div className="max-w-7xl mx-auto py-6 px-4">

        <div className="bg-white shadow rounded-lg">        <div className="bg-white shadow rounded-lg">

          <div className="p-6">          <div className="p-6">

            <div>            <div>

              {/* Header with Scheduler Information */}              {/* Header with Scheduler Information */}

              <div className="mb-6">              <div className="mb-6">

                <h2 className="text-2xl font-bold text-gray-900 mb-2">Automated Drug Discovery</h2>                <h2 className="text-2xl font-bold text-gray-900 mb-2">Automated Drug Discovery</h2>

                <div className="bg-green-50 border border-green-200 rounded-md p-4">                <div className="bg-green-50 border border-green-200 rounded-md p-4">

                  <div className="flex">                  <div className="flex">

                    <div className="flex-shrink-0">                    <div className="flex-shrink-0">

                      <svg className="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">                      <svg className="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">

                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />

                      </svg>                      </svg>

                    </div>                    </div>

                    <div className="ml-3">                    <div className="ml-3">

                      <h3 className="text-sm font-medium text-green-800">                      <h3 className="text-sm font-medium text-green-800">

                        Scheduler Status: Active                        ? Scheduler Status: Active

                      </h3>                      </h3>

                      <div className="mt-2 text-sm text-green-700">                      <div className="mt-2 text-sm text-green-700">

                        <p>Our scheduler runs every 12 hours (at 00:00 and 12:00 UTC)</p>                        <p>� Our scheduler runs <strong>every 12 hours</strong> (at 00:00 and 12:00 UTC)</p>

                        <p>Scheduled searches will be automatically executed when due</p>                        <p>� Scheduled searches will be automatically executed when due</p>

                        <p>You can also run any configuration manually at any time</p>                        <p>� You can also run any configuration manually at any time</p>

                      </div>                      </div>

                    </div>                    </div>

                  </div>                  </div>

                </div>                </div>

              </div>              </div>

              <h2 className="text-xl font-semibold mb-4">Search Configurations</h2>              <h2 className="text-xl font-semibold mb-4">Search Configurations</h2>

                            

              {/* Create Form */}              {/* Create Form */}

              <div className="bg-gray-50 p-4 rounded-lg mb-6">              <div className="bg-gray-50 p-4 rounded-lg mb-6">

                <h3 className="text-lg font-medium mb-4">Create New Search Configuration</h3>                <h3 className="text-lg font-medium mb-4">Create New Search Configuration</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                  <input                  <input

                    type="text"                    type="text"

                    value={configName}                    value={configName}

                    onChange={(e) => setConfigName(e.target.value)}                    onChange={(e) => setConfigName(e.target.value)}

                    placeholder="Configuration Name"                    placeholder="Configuration Name"

                    className="w-full px-3 py-2 border border-gray-300 rounded-md"                    className="w-full px-3 py-2 border border-gray-300 rounded-md"

                  />                  />

                  <input                  <input

                    type="text"                    type="text"

                    value={query}                    value={query}

                    onChange={(e) => setQuery(e.target.value)}                    onChange={(e) => setQuery(e.target.value)}

                    placeholder="Query (Drug Name)"                    placeholder="Query (Drug Name)"

                    className="w-full px-3 py-2 border border-gray-300 rounded-md"                    className="w-full px-3 py-2 border border-gray-300 rounded-md"

                  />                  />

                  <input                  <input

                    type="text"                    type="text"

                    value={sponsor}                    value={sponsor}

                    onChange={(e) => setSponsor(e.target.value)}                    onChange={(e) => setSponsor(e.target.value)}

                    placeholder="Sponsor (Optional)"                    placeholder="Sponsor (Optional)"

                    className="w-full px-3 py-2 border border-gray-300 rounded-md"                    className="w-full px-3 py-2 border border-gray-300 rounded-md"

                  />                  />

                  <select                  <select

                    value={frequency}                    value={frequency}

                    onChange={(e) => setFrequency(e.target.value)}                    onChange={(e) => setFrequency(e.target.value)}

                    className="w-full px-3 py-2 border border-gray-300 rounded-md"                    className="w-full px-3 py-2 border border-gray-300 rounded-md"

                  >                  >

                    <option value="custom">Custom Date Range</option>                    <option value="custom">Custom Date Range</option>

                    <option value="daily">Last One Day (Daily)</option>                    <option value="daily">Last One Day (Daily)</option>

                    <option value="weekly">Last One Week (Weekly)</option>                    <option value="weekly">Last One Week (Weekly)</option>

                    <option value="monthly">Last One Month (Monthly)</option>                    <option value="monthly">Last One Month (Monthly)</option>

                  </select>                  </select>

                  {frequency === 'custom' && (                  {frequency === 'custom' && (

                    <>                    <>

                      <div>                      <div>

                        <label className="block text-sm font-medium text-gray-700 mb-1">Date From (Optional)</label>                        <label className="block text-sm font-medium text-gray-700 mb-1">Date From (Optional)</label>

                        <input                        <input

                          type="date"                          type="date"

                          value={dateFromInput}                          value={dateFromInput}

                          onChange={(e) => {                          onChange={(e) => {

                            const dateValue = e.target.value; // YYYY-MM-DD format                            const dateValue = e.target.value; // YYYY-MM-DD format

                            setDateFromInput(dateValue);                            setDateFromInput(dateValue);

                            if (dateValue) {                            if (dateValue) {

                              setDateFrom(dateValue.replace(/-/g, '/')); // Convert to YYYY/MM/DD for backend                              setDateFrom(dateValue.replace(/-/g, '/')); // Convert to YYYY/MM/DD for backend

                            } else {                            } else {

                              setDateFrom('');                              setDateFrom('');

                            }                            }

                          }}                          }}

                          className="w-full px-3 py-2 border border-gray-300 rounded-md"                          className="w-full px-3 py-2 border border-gray-300 rounded-md"

                        />                        />

                      </div>                      </div>

                      <div>                      <div>

                        <label className="block text-sm font-medium text-gray-700 mb-1">Date To (Optional)</label>                        <label className="block text-sm font-medium text-gray-700 mb-1">Date To (Optional)</label>

                        <input                        <input

                          type="date"                          type="date"

                          value={dateToInput}                          value={dateToInput}

                          onChange={(e) => {                          onChange={(e) => {

                            const dateValue = e.target.value; // YYYY-MM-DD format                            const dateValue = e.target.value; // YYYY-MM-DD format

                            setDateToInput(dateValue);                            setDateToInput(dateValue);

                            if (dateValue) {                            if (dateValue) {

                              setDateTo(dateValue.replace(/-/g, '/')); // Convert to YYYY/MM/DD for backend                              setDateTo(dateValue.replace(/-/g, '/')); // Convert to YYYY/MM/DD for backend

                            } else {                            } else {

                              setDateTo('');                              setDateTo('');

                            }                            }

                          }}                          }}

                          className="w-full px-3 py-2 border border-gray-300 rounded-md"                          className="w-full px-3 py-2 border border-gray-300 rounded-md"

                        />                        />

                      </div>                      </div>

                    </>                    </>

                  )}                  )}

                  {frequency !== 'custom' && (                  {frequency !== 'custom' && (

                    <div className="md:col-span-2">                    <div className="md:col-span-2">

                      <div className="bg-blue-50 border border-blue-200 rounded-md p-3">                      <div className="bg-blue-50 border border-blue-200 rounded-md p-3">

                        <p className="text-sm text-blue-800">                        <p className="text-sm text-blue-800">

                          <strong>{frequency.charAt(0).toUpperCase() + frequency.slice(1)} Search:</strong>                           <strong>?? {frequency.charAt(0).toUpperCase() + frequency.slice(1)} Search:</strong> 

                          {frequency === 'daily' && ' Will search articles from the last 24 hours and run every 24 hours'}                          {frequency === 'daily' && ' Will search articles from the last 24 hours and run every 24 hours'}

                          {frequency === 'weekly' && ' Will search articles from the last 7 days and run every week'}                          {frequency === 'weekly' && ' Will search articles from the last 7 days and run every week'}

                          {frequency === 'monthly' && ' Will search articles from the last 30 days and run every month'}                          {frequency === 'monthly' && ' Will search articles from the last 30 days and run every month'}

                        </p>                        </p>

                        <p className="text-xs text-blue-600 mt-1">                        <p className="text-xs text-blue-600 mt-1">

                          Scheduler runs every 12 hours - your search will be automatically executed when due                          ? <strong>Scheduler runs every 12 hours</strong> - your search will be automatically executed when due

                        </p>                        </p>

                      </div>                      </div>

                    </div>                    </div>

                  )}                  )}

                </div>                </div>

                                

                <div className="mt-4 flex gap-2">                <div className="mt-4 flex gap-2">

                  <button                  <button

                    onClick={createSearchConfig}                    onClick={createSearchConfig}

                    disabled={saving || !configName.trim() || !query.trim()}                    disabled={saving || !configName.trim() || !query.trim()}

                    className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"                    className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"

                  >                  >

                    {saving ? 'Saving...' : 'Save Configuration'}                    {saving ? 'Saving...' : 'Save Configuration'}

                  </button>                  </button>

                  <button                  <button

                    onClick={async () => {                    onClick={async () => {

                      const token = localStorage.getItem('auth_token');                      const token = localStorage.getItem('auth_token');

                      const response = await fetch(`${API_BASE}/search-configs/debug`, {                      const response = await fetch(`${API_BASE}/search-configs/debug`, {

                        method: 'POST',                        method: 'POST',

                        headers: {                        headers: {

                          'Content-Type': 'application/json',                          'Content-Type': 'application/json',

                          ...(token && { 'Authorization': `Bearer ${token}` })                          ...(token && { 'Authorization': `Bearer ${token}` })

                        },                        },

                        body: JSON.stringify({                        body: JSON.stringify({

                          name: configName.trim(),                          name: configName.trim(),

                          query: query.trim(),                          query: query.trim(),

                          sponsor: sponsor.trim() || '',                          sponsor: sponsor.trim() || '',

                          frequency: frequency,                          frequency: frequency,

                          maxResults: 1000,                          maxResults: 1000,

                          includeAdverseEvents: true,                          includeAdverseEvents: true,

                          includeSafety: true,                          includeSafety: true,

                          sendToExternalApi: true,                          sendToExternalApi: true,

                          dateFrom: dateFrom && dateFrom.trim() ? dateFrom.trim() : null,                          dateFrom: dateFrom && dateFrom.trim() ? dateFrom.trim() : null,

                          dateTo: dateTo && dateTo.trim() ? dateTo.trim() : null                          dateTo: dateTo && dateTo.trim() ? dateTo.trim() : null

                        })                        })

                      });                      });

                      const result = await response.json();                      const result = await response.json();

                      console.log('Debug result:', result);                      console.log('Debug result:', result);

                      alert(`Debug result: ${JSON.stringify(result, null, 2)}`);                      alert(`Debug result: ${JSON.stringify(result, null, 2)}`);

                    }}                    }}

                    className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700"                    className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700"

                  >                  >

                    Debug                    Debug

                  </button>                  </button>

                </div>                </div>

              </div>              </div>



              {/* Show hidden progress tracker button */}              {/* Show hidden progress tracker button */}

              {!showProgressTracker && activeJobId && (              {!showProgressTracker && activeJobId && (

                <div className="mb-6">                <div className="mb-6">

                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">

                    <div className="flex items-center justify-between">                    <div className="flex items-center justify-between">

                      <div className="flex items-center">                      <div className="flex items-center">

                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-600 mr-2"></div>                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-600 mr-2"></div>

                        <span className="text-yellow-800">                        <span className="text-yellow-800">

                          A drug discovery job is running in the background: {runningConfigName}                          A drug discovery job is running in the background: {runningConfigName}

                        </span>                        </span>

                      </div>                      </div>

                      <button                      <button

                        onClick={() => {                        onClick={() => {

                          setShowProgressTracker(true);                          setShowProgressTracker(true);

                          localStorage.setItem('showProgressTracker', 'true');                          localStorage.setItem('showProgressTracker', 'true');

                        }}                        }}

                        className="bg-yellow-600 text-white px-3 py-1 rounded-md text-sm hover:bg-yellow-700"                        className="bg-yellow-600 text-white px-3 py-1 rounded-md text-sm hover:bg-yellow-700"

                      >                      >

                        Show Progress                        Show Progress

                      </button>                      </button>

                    </div>                    </div>

                  </div>                  </div>

                </div>                </div>

              )}              )}



              {/* Progress Tracker */}              {/* Progress Tracker */}

              {showProgressTracker && activeJobId && (              {showProgressTracker && activeJobId && (

                <div className="mb-6">                <div className="mb-6">

                  <div className="flex items-center justify-between mb-4">                  <div className="flex items-center justify-between mb-4">

                    <h3 className="text-lg font-medium">                    <h3 className="text-lg font-medium">

                      Drug Discovery Progress: {runningConfigName}                      Drug Discovery Progress: {runningConfigName}

                    </h3>                    </h3>

                    <button                    <button

                      onClick={() => {                      onClick={() => {

                        if (confirm('Are you sure you want to hide the progress tracker? The job will continue running in the background.')) {                        if (confirm('Are you sure you want to hide the progress tracker? The job will continue running in the background.')) {

                          setShowProgressTracker(false);                          setShowProgressTracker(false);

                          localStorage.setItem('showProgressTracker', 'false');                          localStorage.setItem('showProgressTracker', 'false');

                        }                        }

                      }}                      }}

                      className="text-gray-400 hover:text-gray-600 transition-colors"                      className="text-gray-400 hover:text-gray-600 transition-colors"

                      title="Hide progress tracker"                      title="Hide progress tracker"

                    >                    >

                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">

                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />

                      </svg>                      </svg>

                    </button>                    </button>

                  </div>                  </div>

                  <StudyProgressTracker                   <StudyProgressTracker 

                    jobId={activeJobId}                     jobId={activeJobId} 

                    onComplete={handleJobComplete}                    onComplete={handleJobComplete}

                  />                  />

                </div>                </div>

              )}              )}



              {/* Existing Configurations */}              {/* Existing Configurations */}

              <div>              <div>

                <h3 className="text-lg font-medium mb-4">Your Search Configurations</h3>                <h3 className="text-lg font-medium mb-4">Your Search Configurations</h3>

                {searchConfigs.length === 0 ? (                {searchConfigs.length === 0 ? (

                  <div className="text-center py-8 bg-gray-50 rounded-lg">                  <div className="text-center py-8 bg-gray-50 rounded-lg">

                    <p className="text-gray-600">                    <p className="text-gray-600">

                      No search configurations yet. Create one above to start automatic drug discovery.                      No search configurations yet. Create one above to start automatic drug discovery.

                    </p>                    </p>

                  </div>                  </div>

                ) : (                ) : (

                  <div className="space-y-4">                  <div className="space-y-4">

                    {searchConfigs.map((config) => (                    {searchConfigs.map((config) => (

                      <div                       <div 

                        key={config.id}                         key={config.id} 

                        className={`border rounded-lg p-4 bg-white ${                        className={`border rounded-lg p-4 bg-white ${

                          showProgressTracker && config.name === runningConfigName                          showProgressTracker && config.name === runningConfigName

                            ? 'border-blue-300 bg-blue-50 ring-1 ring-blue-200'                            ? 'border-blue-300 bg-blue-50 ring-1 ring-blue-200'

                            : ''                            : ''

                        }`}                        }`}

                      >                      >

                        <div className="flex justify-between items-start">                        <div className="flex justify-between items-start">

                          <div className="flex-1">                          <div className="flex-1">

                            <h4 className="font-medium">{config.name}</h4>                            <h4 className="font-medium">{config.name}</h4>

                            <p className="text-sm text-gray-600">Query: {config.query}</p>                            <p className="text-sm text-gray-600">Query: {config.query}</p>

                            <p className="text-sm text-gray-600">Frequency: {config.frequency}</p>                            <p className="text-sm text-gray-600">Frequency: {config.frequency}</p>

                            {config.sponsor && (                            {config.sponsor && (

                              <p className="text-sm text-gray-600">Sponsor: {config.sponsor}</p>                              <p className="text-sm text-gray-600">Sponsor: {config.sponsor}</p>

                            )}                            )}

                            <div className="mt-2 flex flex-wrap gap-4 text-xs text-gray-500">                            <div className="mt-2 flex flex-wrap gap-4 text-xs text-gray-500">

                              <span>Total Runs: {config.totalRuns}</span>                              <span>Total Runs: {config.totalRuns}</span>

                              <span>Last Result: {config.lastResultCount} items</span>                              <span>Last Result: {config.lastResultCount} items</span>

                              {config.lastRunAt && (                              {config.lastRunAt && (

                                <span>Last Run: {new Date(config.lastRunAt).toLocaleString('en-US', {                                <span>Last Run: {new Date(config.lastRunAt).toLocaleString('en-US', {

                                  month: 'short',                                  month: 'short',

                                  day: 'numeric',                                  day: 'numeric',

                                  hour: '2-digit',                                  hour: '2-digit',

                                  minute: '2-digit',                                  minute: '2-digit',

                                  timeZoneName: 'short'                                  timeZoneName: 'short'

                                })}</span>                                })}</span>

                              )}                              )}

                              {config.nextRunAt && config.frequency !== 'manual' && (                              {config.nextRunAt && config.frequency !== 'manual' && (

                                <span className="text-blue-600 font-medium">                                <span className="text-blue-600 font-medium">

                                  Next Run: {new Date(config.nextRunAt).toLocaleString('en-US', {                                  Next Run: {new Date(config.nextRunAt).toLocaleString('en-US', {

                                    month: 'short',                                    month: 'short',

                                    day: 'numeric',                                    day: 'numeric',

                                    hour: '2-digit',                                    hour: '2-digit',

                                    minute: '2-digit',                                    minute: '2-digit',

                                    timeZoneName: 'short'                                    timeZoneName: 'short'

                                  })} ({getTimeUntilRun(config.nextRunAt)})                                  })} ({getTimeUntilRun(config.nextRunAt)})

                                </span>                                </span>

                              )}                              )}

                            </div>                            </div>

                          </div>                          </div>

                          <div className="ml-4">                          <div className="ml-4">

                            <button                            <button

                              onClick={() => runSearchConfig(config.id, config.name)}                              onClick={() => runSearchConfig(config.id, config.name)}

                              disabled={runningConfigs.has(config.id) || (showProgressTracker && config.name === runningConfigName)}                              disabled={runningConfigs.has(config.id) || (showProgressTracker && config.name === runningConfigName)}

                              className={`px-4 py-2 text-sm font-medium rounded-md ${                              className={`px-4 py-2 text-sm font-medium rounded-md ${

                                runningConfigs.has(config.id) || (showProgressTracker && config.name === runningConfigName)                                runningConfigs.has(config.id) || (showProgressTracker && config.name === runningConfigName)

                                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'                                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'

                                  : 'bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500'                                  : 'bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500'

                              }`}                              }`}

                            >                            >

                              {runningConfigs.has(config.id) || (showProgressTracker && config.name === runningConfigName) ? (                              {runningConfigs.has(config.id) || (showProgressTracker && config.name === runningConfigName) ? (

                                <div className="flex items-center">                                <div className="flex items-center">

                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400 mr-2"></div>                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400 mr-2"></div>

                                  {showProgressTracker && config.name === runningConfigName ? 'In Progress...' : 'Running...'}                                  {showProgressTracker && config.name === runningConfigName ? 'In Progress...' : 'Running...'}

                                </div>                                </div>

                              ) : (                              ) : (

                                'Run Now'                                'Run Now'

                              )}                              )}

                            </button>                            </button>

                          </div>                          </div>

                        </div>                        </div>

                      </div>                      </div>

                    ))}                    ))}

                  </div>                  </div>

                )}                )}

              </div>              </div>

            </div>            </div>

          </div>          </div>

        </div>        </div>

      </div>      </div>

    </div>    </div>

  );  );

}}

