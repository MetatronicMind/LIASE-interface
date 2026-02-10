"use client";
import { useState, useEffect } from "react";
import { getApiBaseUrl } from '@/config/api';
import { 
  QueueListIcon, 
  UserGroupIcon, 
  ArrowPathIcon,
  PlusIcon,
  TrashIcon,
  ArrowUpIcon,
  ArrowDownIcon
} from "@heroicons/react/24/outline";

interface StudyQueueConfig {
  mode: 'status' | 'client' | 'default';
  statusQueue: string[];
  clientList: string[];
  allowUserClientEntry: boolean;
}

export default function StudyQueueConfigTab() {
  const [config, setConfig] = useState<StudyQueueConfig>({
    mode: 'default',
    statusQueue: [],
    clientList: [],
    allowUserClientEntry: false
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newClient, setNewClient] = useState("");
  const [newStatus, setNewStatus] = useState("");

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${getApiBaseUrl()}/admin-config/study_queue`, {
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
      console.error('Error fetching study queue config:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${getApiBaseUrl()}/admin-config/study_queue`, {
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

  const addClient = () => {
    if (newClient && !config.clientList.includes(newClient)) {
      setConfig({
        ...config,
        clientList: [...config.clientList, newClient]
      });
      setNewClient("");
    }
  };

  const removeClient = (client: string) => {
    setConfig({
      ...config,
      clientList: config.clientList.filter(c => c !== client)
    });
  };

  const addStatus = () => {
    if (newStatus && !config.statusQueue.includes(newStatus)) {
      setConfig({
        ...config,
        statusQueue: [...config.statusQueue, newStatus]
      });
      setNewStatus("");
    }
  };

  const removeStatus = (status: string) => {
    setConfig({
      ...config,
      statusQueue: config.statusQueue.filter(s => s !== status)
    });
  };

  const moveStatus = (index: number, direction: 'up' | 'down') => {
    const newQueue = [...config.statusQueue];
    if (direction === 'up' && index > 0) {
      [newQueue[index], newQueue[index - 1]] = [newQueue[index - 1], newQueue[index]];
    } else if (direction === 'down' && index < newQueue.length - 1) {
      [newQueue[index], newQueue[index + 1]] = [newQueue[index + 1], newQueue[index]];
    }
    setConfig({ ...config, statusQueue: newQueue });
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-lg font-semibold mb-4">Study Queue Configuration</h2>
        
        {/* Mode Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Queue Mode</label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div 
              className={`p-4 border rounded-lg cursor-pointer transition-colors ${config.mode === 'status' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'}`}
              onClick={() => setConfig({ ...config, mode: 'status' })}
            >
              <div className="flex items-center mb-2">
                <QueueListIcon className="w-5 h-5 mr-2 text-blue-600" />
                <span className="font-medium">Status Queue</span>
              </div>
              <p className="text-sm text-gray-500">Prioritize studies based on a configurable status order.</p>
            </div>

            <div 
              className={`p-4 border rounded-lg cursor-pointer transition-colors ${config.mode === 'client' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'}`}
              onClick={() => setConfig({ ...config, mode: 'client' })}
            >
              <div className="flex items-center mb-2">
                <UserGroupIcon className="w-5 h-5 mr-2 text-blue-600" />
                <span className="font-medium">Client Based</span>
              </div>
              <p className="text-sm text-gray-500">Filter and prioritize based on client assignment.</p>
            </div>

            <div 
              className={`p-4 border rounded-lg cursor-pointer transition-colors ${config.mode === 'default' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'}`}
              onClick={() => setConfig({ ...config, mode: 'default' })}
            >
              <div className="flex items-center mb-2">
                <ArrowPathIcon className="w-5 h-5 mr-2 text-blue-600" />
                <span className="font-medium">Default</span>
              </div>
              <p className="text-sm text-gray-500">Use system default prioritization logic.</p>
            </div>
          </div>
        </div>

        {/* Status Queue Config */}
        {config.mode === 'status' && (
          <div className="mb-6 border-t pt-6">
            <h3 className="text-md font-medium mb-4">Status Priority Queue</h3>
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                placeholder="Add status (e.g., Probable AOI)"
                className="flex-1 border border-gray-300 rounded-md px-3 py-2"
              />
              <button
                onClick={addStatus}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
              >
                <PlusIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-2">
              {config.statusQueue.map((status, index) => (
                <div key={status} className="flex items-center justify-between bg-gray-50 p-3 rounded-md border border-gray-200">
                  <span className="font-medium text-gray-700">{index + 1}. {status}</span>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => moveStatus(index, 'up')}
                      disabled={index === 0}
                      className="p-1 text-gray-500 hover:text-blue-600 disabled:opacity-30"
                    >
                      <ArrowUpIcon className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => moveStatus(index, 'down')}
                      disabled={index === config.statusQueue.length - 1}
                      className="p-1 text-gray-500 hover:text-blue-600 disabled:opacity-30"
                    >
                      <ArrowDownIcon className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => removeStatus(status)}
                      className="p-1 text-red-500 hover:text-red-700"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Client List Config */}
        {config.mode === 'client' && (
          <div className="mb-6 border-t pt-6">
            <h3 className="text-md font-medium mb-4">Client Management</h3>
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={newClient}
                onChange={(e) => setNewClient(e.target.value)}
                placeholder="Add Client Name"
                className="flex-1 border border-gray-300 rounded-md px-3 py-2"
              />
              <button
                onClick={addClient}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
              >
                <PlusIcon className="w-5 h-5" />
              </button>
            </div>
            
            <div className="mb-4">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={config.allowUserClientEntry}
                  onChange={(e) => setConfig({ ...config, allowUserClientEntry: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Allow users to add their own clients</span>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {config.clientList.map((client) => (
                <div key={client} className="flex items-center justify-between bg-gray-50 p-3 rounded-md border border-gray-200">
                  <span className="text-gray-700">{client}</span>
                  <button 
                    onClick={() => removeClient(client)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end pt-4 border-t">
          <button
            onClick={saveConfig}
            disabled={saving}
            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>
      </div>
    </div>
  );
}
