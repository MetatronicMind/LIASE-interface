"use client";
import { useState, useEffect } from "react";
import { getApiBaseUrl } from '@/config/api';
import { ArrowPathIcon } from "@heroicons/react/24/outline";

interface AllocationConfig {
  aoiAllocationPercentage: number;
  aoiBatchSize: number;
  noCaseAllocationPercentage: number;
  noCaseBatchSize: number;
}

export default function AllocationConfigTab() {
  const [config, setConfig] = useState<AllocationConfig>({
    aoiAllocationPercentage: 10,
    aoiBatchSize: 10,
    noCaseAllocationPercentage: 10,
    noCaseBatchSize: 10
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${getApiBaseUrl()}/admin-config/allocation`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data && data.configData) {
          setConfig(data.configData);
        }
      }
    } catch (error) {
      console.error('Error fetching allocation config:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${getApiBaseUrl()}/admin-config/allocation`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          configData: config
        })
      });

      if (response.ok) {
        alert('Allocation configuration saved successfully');
      } else {
        alert('Failed to save allocation configuration');
      }
    } catch (error) {
      console.error('Error saving allocation config:', error);
      alert('Error saving allocation configuration');
    } finally {
      setSaving(false);
    }
  };

  const resetDefaults = () => {
    if (confirm('Are you sure you want to reset to default settings?')) {
      setConfig({
        aoiAllocationPercentage: 10,
        aoiBatchSize: 10,
        noCaseAllocationPercentage: 10,
        noCaseBatchSize: 10
      });
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      {/* AOI Allocation Settings */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">AOI Allocation Settings</h3>
        <p className="text-sm text-gray-500 mb-4">
          Configure how "Probable AOI" studies are distributed between AOI Allocation and AOI Assessment.
        </p>
        
        <div className="space-y-4">
          <div className="max-w-xs">
            <label htmlFor="aoiAllocationPercentage" className="block text-sm font-medium text-gray-700">
              AOI Allocation Percentage
            </label>
            <div className="mt-1 flex items-center">
              <input
                type="number"
                name="aoiAllocationPercentage"
                id="aoiAllocationPercentage"
                min="0"
                max="100"
                className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                value={config.aoiAllocationPercentage}
                onChange={(e) => setConfig({ ...config, aoiAllocationPercentage: parseInt(e.target.value) || 0 })}
              />
              <span className="ml-2 text-sm text-gray-500">%</span>
            </div>
            <p className="mt-2 text-sm text-gray-500">
              Percentage of "Probable AOI" studies sent to AOI Allocation for quality check. 
              The remaining {100 - config.aoiAllocationPercentage}% automatically go to AOI Assessment.
            </p>
          </div>

          <div className="max-w-xs">
            <label htmlFor="aoiBatchSize" className="block text-sm font-medium text-gray-700">
              AOI Batch Allocation Size
            </label>
            <div className="mt-1">
              <input
                type="number"
                name="aoiBatchSize"
                id="aoiBatchSize"
                min="1"
                max="100"
                className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                value={config.aoiBatchSize}
                onChange={(e) => setConfig({ ...config, aoiBatchSize: parseInt(e.target.value) || 10 })}
              />
            </div>
            <p className="mt-2 text-sm text-gray-500">
              Number of AOI cases to allocate to a user at once.
            </p>
          </div>
        </div>
      </div>

      {/* No Case Allocation Settings */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">No Case Allocation Settings</h3>
        <p className="text-sm text-gray-500 mb-4">
          Configure how "No Case" studies are distributed between No Case Allocation and Reports (No Case Assessment).
        </p>
        
        <div className="space-y-4">
          <div className="max-w-xs">
            <label htmlFor="noCaseAllocationPercentage" className="block text-sm font-medium text-gray-700">
              No Case Allocation Percentage
            </label>
            <div className="mt-1 flex items-center">
              <input
                type="number"
                name="noCaseAllocationPercentage"
                id="noCaseAllocationPercentage"
                min="0"
                max="100"
                className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                value={config.noCaseAllocationPercentage}
                onChange={(e) => setConfig({ ...config, noCaseAllocationPercentage: parseInt(e.target.value) || 0 })}
              />
              <span className="ml-2 text-sm text-gray-500">%</span>
            </div>
            <p className="mt-2 text-sm text-gray-500">
              Percentage of "No Case" studies sent to No Case Allocation for quality check.
              The remaining {100 - config.noCaseAllocationPercentage}% automatically go to Reports (No Case Assessment).
            </p>
          </div>

          <div className="max-w-xs">
            <label htmlFor="noCaseBatchSize" className="block text-sm font-medium text-gray-700">
              No Case Batch Allocation Size
            </label>
            <div className="mt-1">
              <input
                type="number"
                name="noCaseBatchSize"
                id="noCaseBatchSize"
                min="1"
                max="100"
                className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                value={config.noCaseBatchSize}
                onChange={(e) => setConfig({ ...config, noCaseBatchSize: parseInt(e.target.value) || 10 })}
              />
            </div>
            <p className="mt-2 text-sm text-gray-500">
              Number of No Case studies to allocate to a user at once.
            </p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between">
        <button
          onClick={resetDefaults}
          className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Reset Defaults
        </button>
        <button
          onClick={saveConfig}
          disabled={saving}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          {saving ? (
            <>
              <ArrowPathIcon className="animate-spin -ml-1 mr-2 h-5 w-5" />
              Saving...
            </>
          ) : (
            'Save Configuration'
          )}
        </button>
      </div>
    </div>
  );
}
