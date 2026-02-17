"use client";
import { useState, useEffect } from "react";
import { ClockIcon } from "@heroicons/react/24/solid";
import { getApiBaseUrl } from '@/config/api';

export default function DrugConfigTab() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [allowedDays, setAllowedDays] = useState<string[]>([]);
  const [savingScheduler, setSavingScheduler] = useState(false);

  const DAYS_OF_WEEK = [
    'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
  ];

  useEffect(() => {
    fetchSchedulerSettings();
  }, []);

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
      } else {
         // Silently fail or set default if endpoint issues, as we are migrating
         setAllowedDays(DAYS_OF_WEEK); 
      }
    } catch (err) {
      console.error('Error fetching scheduler settings:', err);
      // setAllowedDays(DAYS_OF_WEEK);
    } finally {
      setLoading(false);
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

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading drug configuration...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ClockIcon className="w-7 h-7 text-blue-600" />
            Drug Configuration
          </h2>
          <p className="text-gray-600 mt-1">Configure availability for drug search schedules</p>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Scheduler Settings Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Weekly Search Allowed Days</h3>
        <p className="text-sm text-gray-600 mb-6">
          Select the days of the week that users are allowed to schedule weekly drug searches.
          Users will only see these days in the dropdown when configuring a weekly search.
        </p>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {DAYS_OF_WEEK.map((day) => (
            <label key={day} className="flex items-center space-x-3 p-3 border rounded-md hover:bg-gray-50 cursor-pointer transition-colors">
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
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center transition-colors shadow-sm"
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
    </div>
  );
}
