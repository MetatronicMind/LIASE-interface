"use client";
import { useState, useEffect } from "react";
import { Cog6ToothIcon, ClockIcon, PlayIcon, PauseIcon, TrashIcon } from "@heroicons/react/24/solid";
import { getApiBaseUrl } from '@/config/api';

interface ScheduledJob {
  id: string;
  name: string;
  description: string;
  schedule: string;
  isActive: boolean;
  lastRun?: string;
  nextRun?: string;
  status?: string;
}

interface AdminConfig {
  id: string;
  key: string;
  value: any;
  description: string;
  category: string;
  isEditable: boolean;
}

export default function AdminConfigTab() {
  const [jobs, setJobs] = useState<ScheduledJob[]>([]);
  const [configs, setConfigs] = useState<AdminConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<'jobs' | 'configs' | 'scheduler-settings'>('jobs');
  const [allowedDays, setAllowedDays] = useState<string[]>([]);
  const [savingScheduler, setSavingScheduler] = useState(false);

  const DAYS_OF_WEEK = [
    'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
  ];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      await Promise.all([fetchJobs(), fetchConfigs(), fetchSchedulerSettings()]);
    } catch (err: any) {
      console.error('Fetch error:', err);
      setError(err.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const fetchSchedulerSettings = async () => {
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
        // configData.allowedWeeklyDays
        if (data && data.configData && Array.isArray(data.configData.allowedWeeklyDays)) {
          setAllowedDays(data.configData.allowedWeeklyDays);
        } else {
          // Default to all days if not configured
          setAllowedDays(DAYS_OF_WEEK);
        }
      }
    } catch (err) {
      console.error('Error fetching scheduler settings:', err);
    }
  };

  const saveSchedulerSettings = async () => {
    setSavingScheduler(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${getApiBaseUrl()}/admin-config/scheduler`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          configData: {
            allowedWeeklyDays: allowedDays
          }
        })
      });

      if (response.ok) {
        alert('Scheduler settings saved successfully');
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to save scheduler settings');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSavingScheduler(false);
    }
  };

  const toggleDay = (day: string) => {
    setAllowedDays(prev => {
      if (prev.includes(day)) {
        return prev.filter(d => d !== day);
      } else {
        return [...prev, day];
      }
    });
  };

  const fetchJobs = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${getApiBaseUrl()}/admin-config/jobs`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setJobs(data.jobs || []);
      }
    } catch (err) {
      console.error('Error fetching jobs:', err);
    }
  };

  const fetchConfigs = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${getApiBaseUrl()}/admin-config`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setConfigs(data.configs || []);
      }
    } catch (err) {
      console.error('Error fetching configs:', err);
    }
  };

  const toggleJob = async (jobId: string, currentStatus: boolean) => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${getApiBaseUrl()}/admin-config/jobs/${jobId}/toggle`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ isActive: !currentStatus })
      });

      if (response.ok) {
        await fetchJobs();
        setError(null);
      } else {
        throw new Error('Failed to toggle job status');
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const triggerJob = async (jobId: string) => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${getApiBaseUrl()}/admin-config/jobs/${jobId}/trigger`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        alert('Job triggered successfully');
        await fetchJobs();
      } else {
        throw new Error('Failed to trigger job');
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading admin configuration...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Cog6ToothIcon className="w-7 h-7 text-blue-600" />
            Admin Configuration
          </h2>
          <p className="text-gray-600 mt-1">Manage system jobs and configuration settings</p>
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
          onClick={() => setActiveSection('jobs')}
          className={`px-4 py-2 font-semibold transition-all ${
            activeSection === 'jobs'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Scheduled Jobs
        </button>
        <button
          onClick={() => setActiveSection('configs')}
          className={`px-4 py-2 font-semibold transition-all ${
            activeSection === 'configs'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          System Configs
        </button>
        <button
          onClick={() => setActiveSection('scheduler-settings')}
          className={`px-4 py-2 font-semibold transition-all ${
            activeSection === 'scheduler-settings'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Scheduler Settings
        </button>
      </div>

      {/* Scheduled Jobs Section */}
      {activeSection === 'jobs' && (
        <div className="space-y-4">
          {jobs.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <ClockIcon className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p>No scheduled jobs found</p>
            </div>
          ) : (
            jobs.map((job) => (
              <div
                key={job.id}
                className="bg-white border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-bold text-gray-900">{job.name}</h3>
                      <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
                        job.isActive 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {job.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{job.description}</p>
                    <div className="text-xs text-gray-500 space-y-1">
                      <p><span className="font-semibold">Schedule:</span> {job.schedule}</p>
                      {job.lastRun && (
                        <p><span className="font-semibold">Last Run:</span> {new Date(job.lastRun).toLocaleString()}</p>
                      )}
                      {job.nextRun && (
                        <p><span className="font-semibold">Next Run:</span> {new Date(job.nextRun).toLocaleString()}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => toggleJob(job.id, job.isActive)}
                      className={`p-2 rounded-lg transition ${
                        job.isActive
                          ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                          : 'bg-green-100 text-green-700 hover:bg-green-200'
                      }`}
                      title={job.isActive ? 'Pause job' : 'Activate job'}
                    >
                      {job.isActive ? (
                        <PauseIcon className="w-4 h-4" />
                      ) : (
                        <PlayIcon className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      onClick={() => triggerJob(job.id)}
                      className="p-2 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-lg transition"
                      title="Trigger job now"
                    >
                      <PlayIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* System Configs Section */}
      {activeSection === 'configs' && (
        <div className="space-y-4">
          {configs.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Cog6ToothIcon className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p>No configuration settings found</p>
            </div>
          ) : (
            configs.map((config) => (
              <div
                key={config.id}
                className="bg-white border border-gray-200 rounded-lg p-5"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-bold text-gray-900">{config.key}</h3>
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-semibold">
                        {config.category}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{config.description}</p>
                    <div className="bg-gray-50 p-3 rounded-lg mt-2">
                      <code className="text-sm text-gray-800">
                        {typeof config.value === 'object' 
                          ? JSON.stringify(config.value, null, 2) 
                          : String(config.value)}
                      </code>
                    </div>
                  </div>
                  {config.isEditable && (
                    <button className="ml-4 text-blue-600 hover:text-blue-800 text-sm font-semibold">
                      Edit
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Scheduler Settings Section */}
      {activeSection === 'scheduler-settings' && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Weekly Search Allowed Days</h3>
          <p className="text-sm text-gray-600 mb-6">
            Select the days of the week that users are allowed to schedule weekly drug searches.
            Users will only see these days in the dropdown when configuring a weekly search.
          </p>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {DAYS_OF_WEEK.map((day) => (
              <label key={day} className="flex items-center space-x-3 p-3 border rounded-md hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={allowedDays.includes(day)}
                  onChange={() => toggleDay(day)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="text-gray-700 font-medium">{day}</span>
              </label>
            ))}
          </div>

          <div className="flex justify-end">
            <button
              onClick={saveSchedulerSettings}
              disabled={savingScheduler}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center"
            >
              {savingScheduler ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                </>
              ) : (
                'Save Settings'
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
