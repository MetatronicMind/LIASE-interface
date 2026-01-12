import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { getApiBaseUrl } from '@/config/api';
import authService from '@/services/authService';
import { roleService, Role } from '@/services/roleService';

interface Stage {
  id: string;
  label: string;
  color: string;
  type: 'initial' | 'process' | 'final';
}

interface Transition {
  from: string;
  to: string;
  label: string;
  canRevoke?: boolean;
  revokeTo?: string;
  allowedRevokeRoles?: string[];
  qcPercentage?: number;
}

interface WorkflowConfig {
  qcDataEntry?: boolean;
  medicalReview?: boolean;
  stages: Stage[];
  transitions: Transition[];
}

export default function WorkflowSettingsTab() {
  const [config, setConfig] = useState<WorkflowConfig | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const API_BASE_URL = getApiBaseUrl();

  const getHeaders = () => {
    const token = authService.getToken();
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  };

  useEffect(() => {
    fetchConfig();
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    try {
      const data = await roleService.getRoles();
      setRoles(data);
    } catch (error) {
      console.error('Error fetching roles:', error);
      toast.error('Failed to load roles');
    }
  };

  const fetchConfig = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin-config/workflow`, {
        headers: getHeaders()
      });
      if (!response.ok) throw new Error('Failed to fetch config');
      const data = await response.json();
      setConfig(data.configData);
    } catch (error) {
      console.error('Error fetching workflow config:', error);
      toast.error('Failed to load workflow configuration');
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async (newConfig: WorkflowConfig) => {
    setSaving(true);
    try {
      const response = await fetch(`${API_BASE_URL}/admin-config/workflow`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({ configData: newConfig })
      });
      if (!response.ok) throw new Error('Failed to save config');
      setConfig(newConfig);
      toast.success('Workflow configuration saved');
    } catch (error) {
      console.error('Error saving workflow config:', error);
      toast.error('Failed to save workflow configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStage = (key: 'qcDataEntry' | 'medicalReview', checked: boolean) => {
    if (!config) return;
    saveConfig({ ...config, [key]: checked });
  };

  const handleToggleRevoke = (index: number, checked: boolean) => {
    if (!config) return;
    const newTransitions = [...config.transitions];
    const transition = { ...newTransitions[index] };
    
    if (checked) {
      transition.canRevoke = true;
      transition.revokeTo = 'triage';
    } else {
      transition.canRevoke = false;
      transition.revokeTo = undefined;
    }
    
    newTransitions[index] = transition;
    saveConfig({ ...config, transitions: newTransitions });
  };

  const handleQcPercentageChange = (index: number, value: string) => {
    if (!config) return;
    const newTransitions = [...config.transitions];
    const transition = { ...newTransitions[index] };
    
    // Allow empty value to clear it
    if (value === '') {
      transition.qcPercentage = undefined;
      newTransitions[index] = transition;
      setConfig({ ...config, transitions: newTransitions });
      return;
    }

    // Only allow numbers
    if (!/^\d*$/.test(value)) return;

    const percentage = parseInt(value);
    if (!isNaN(percentage) && percentage >= 0 && percentage <= 100) {
      transition.qcPercentage = percentage;
      newTransitions[index] = transition;
      setConfig({ ...config, transitions: newTransitions });
    }
  };

  if (loading) return <div>Loading...</div>;
  if (!config) return <div>Error loading config</div>;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold mb-4">Workflow Stages</h2>
        <div className="bg-white shadow overflow-hidden sm:rounded-md p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-900">QC Data Entry</h3>
              <p className="text-sm text-gray-500">Enable or disable the QC Data Entry stage.</p>
            </div>
            <div className="flex items-center">
              <input
                id="toggle-qc-data-entry"
                type="checkbox"
                checked={config.qcDataEntry !== false} // Default to true
                onChange={(e) => handleToggleStage('qcDataEntry', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
            </div>
          </div>
          
          <div className="flex items-center justify-between border-t pt-4">
            <div>
              <h3 className="text-sm font-medium text-gray-900">Medical Review</h3>
              <p className="text-sm text-gray-500">Enable or disable the Medical Review stage.</p>
            </div>
            <div className="flex items-center">
              <input
                id="toggle-medical-review"
                type="checkbox"
                checked={config.medicalReview !== false} // Default to true
                onChange={(e) => handleToggleStage('medicalReview', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
            </div>
          </div>
        </div>
      </div>

      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Transitions</h2>
        </div>
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {config.transitions.map((transition, index) => (
              <li key={index} className="px-6 py-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{transition.label}</p>
                  <p className="text-sm text-gray-500">
                    {config.stages.find(s => s.id === transition.from)?.label || transition.from}
                    {' -> '}
                    {config.stages.find(s => s.id === transition.to)?.label || transition.to}
                  </p>
                </div>
                
                <div className="flex items-center space-x-4">
                  {transition.from === 'triage' && (
                    <div className="flex items-center gap-2">
                      <label htmlFor={`qc-percent-${index}`} className="text-sm text-gray-900">
                        QC Sample %:
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          id={`qc-percent-${index}`}
                          type="text"
                          inputMode="numeric"
                          value={transition.qcPercentage?.toString() ?? ''}
                          onChange={(e) => handleQcPercentageChange(index, e.target.value)}
                          className="w-16 border border-gray-300 rounded-md shadow-sm p-1 text-sm text-center"
                          placeholder="0-100"
                        />
                        <button
                          onClick={() => saveConfig(config)}
                          disabled={saving}
                          className="bg-blue-600 text-white text-xs px-3 py-1.5 rounded hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium"
                        >
                          {saving ? '...' : 'Save'}
                        </button>
                      </div>
                    </div>
                  )}

                  {transition.from === 'data_entry' && (
                    <div className="flex items-center">
                      <input
                        id={`revoke-${index}`}
                        type="checkbox"
                        checked={transition.canRevoke || false}
                        onChange={(e) => handleToggleRevoke(index, e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor={`revoke-${index}`} className="ml-2 block text-sm text-gray-900">
                        Can Revoke to Triage
                      </label>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
