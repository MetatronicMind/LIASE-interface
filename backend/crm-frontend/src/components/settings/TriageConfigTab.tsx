"use client";
import { useState, useEffect } from "react";
import { getApiBaseUrl } from '@/config/api';
import { 
  ArrowPathIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  Bars3Icon,
  TrashIcon
} from "@heroicons/react/24/outline";

interface TriageConfig {
  batchSize: number;
  priorityQueue: string[];
}

export default function TriageConfigTab() {
  const [config, setConfig] = useState<TriageConfig>({
    batchSize: 10,
    priorityQueue: []
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${getApiBaseUrl()}/admin-config/triage`, {
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
      console.error('Error fetching triage config:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${getApiBaseUrl()}/admin-config/triage`, {
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
        alert('Configuration saved successfully');
      } else {
        alert('Failed to save configuration');
      }
    } catch (error) {
      console.error('Error saving config:', error);
      alert('Error saving configuration');
    } finally {
      setSaving(false);
    }
  };

  const moveItem = (index: number, direction: 'up' | 'down') => {
    const newQueue = [...config.priorityQueue];
    if (direction === 'up' && index > 0) {
      [newQueue[index], newQueue[index - 1]] = [newQueue[index - 1], newQueue[index]];
    } else if (direction === 'down' && index < newQueue.length - 1) {
      [newQueue[index], newQueue[index + 1]] = [newQueue[index + 1], newQueue[index]];
    }
    setConfig({ ...config, priorityQueue: newQueue });
  };

  const handleDragStart = (index: number) => {
    setDraggedItemIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedItemIndex === null || draggedItemIndex === index) return;
    
    const newQueue = [...config.priorityQueue];
    const draggedItem = newQueue[draggedItemIndex];
    newQueue.splice(draggedItemIndex, 1);
    newQueue.splice(index, 0, draggedItem);
    
    setConfig({ ...config, priorityQueue: newQueue });
    setDraggedItemIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedItemIndex(null);
  };

  const removeStatus = (index: number) => {
    const newQueue = [...config.priorityQueue];
    newQueue.splice(index, 1);
    setConfig({ ...config, priorityQueue: newQueue });
  };

  const resetDefaults = () => {
    if (confirm('Are you sure you want to reset to default settings? This will remove "Potential" statuses if present.')) {
      setConfig({
        batchSize: 10,
        priorityQueue: [
          'Probable ICSR',
          'Probable AOI',
          'Probable ICSR/AOI',
          'No Case',
          'Manual Review'
        ]
      });
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">Triage Batch Settings</h3>
        <div className="max-w-xs">
          <label htmlFor="batchSize" className="block text-sm font-medium text-gray-700">
            Batch Allocation Size
          </label>
          <div className="mt-1">
            <input
              type="number"
              name="batchSize"
              id="batchSize"
              min="1"
              max="100"
              className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
              value={config.batchSize}
              onChange={(e) => setConfig({ ...config, batchSize: parseInt(e.target.value) || 10 })}
            />
          </div>
          <p className="mt-2 text-sm text-gray-500">
            Number of cases to allocate to a user at once.
          </p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">Priority Queue Order</h3>
        <p className="mb-4 text-sm text-gray-500">
          Drag and drop items to reorder the priority queue. Top items have higher priority.
        </p>
        
        <div className="space-y-2">
          {config.priorityQueue.map((status, index) => (
            <div 
              key={status}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
              className={`flex items-center justify-between p-3 bg-gray-50 border rounded-md cursor-move ${draggedItemIndex === index ? 'opacity-50' : ''}`}
            >
              <div className="flex items-center">
                <span className="mr-3 text-gray-400 font-mono">{index + 1}.</span>
                <span className="font-medium text-gray-700">{status}</span>
              </div>
              <div className="flex space-x-2">
                <button 
                  onClick={() => moveItem(index, 'up')}
                  disabled={index === 0}
                  className={`p-1 rounded hover:bg-gray-200 ${index === 0 ? 'text-gray-300' : 'text-gray-600'}`}
                >
                  <ArrowUpIcon className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => moveItem(index, 'down')}
                  disabled={index === config.priorityQueue.length - 1}
                  className={`p-1 rounded hover:bg-gray-200 ${index === config.priorityQueue.length - 1 ? 'text-gray-300' : 'text-gray-600'}`}
                >
                  <ArrowDownIcon className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => removeStatus(index)}
                  className="p-1 rounded hover:bg-red-100 text-red-400 hover:text-red-600 ml-1"
                  title="Remove from queue"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
                <Bars3Icon className="w-5 h-5 text-gray-400 ml-2" />
              </div>
            </div>
          ))}
        </div>
      </div>

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
