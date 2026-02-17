import React, { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { getApiBaseUrl } from "@/config/api";
import authService from "@/services/authService";
import { roleService, Role } from "@/services/roleService";

interface Stage {
  id: string;
  label: string;
  color: string;
  type: "initial" | "process" | "final";
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
  noCaseQcPercentage?: number;
  // Tri-Channel Track Allocation Percentages
  icsrAllocationPercentage?: number;
  aoiAllocationPercentage?: number;
  noCaseAllocationPercentage?: number;
  // Destination for ICSR track after assessment
  icsrAssessmentDestination?: "data_entry" | "medical_review" | "reporting";
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
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
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
      console.error("Error fetching roles:", error);
      toast.error("Failed to load roles");
    }
  };

  const fetchConfig = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin-config/workflow`, {
        headers: getHeaders(),
      });
      if (!response.ok) throw new Error("Failed to fetch config");
      const data = await response.json();
      setConfig(data.configData);
    } catch (error) {
      console.error("Error fetching workflow config:", error);
      toast.error("Failed to load workflow configuration");
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async (newConfig: WorkflowConfig) => {
    setSaving(true);
    try {
      const response = await fetch(`${API_BASE_URL}/admin-config/workflow`, {
        method: "PUT",
        headers: getHeaders(),
        body: JSON.stringify({ configData: newConfig }),
      });
      if (!response.ok) throw new Error("Failed to save config");
      setConfig(newConfig);
      toast.success("Workflow configuration saved");
    } catch (error) {
      console.error("Error saving workflow config:", error);
      toast.error("Failed to save workflow configuration");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStage = (
    key: "qcDataEntry" | "medicalReview",
    checked: boolean,
  ) => {
    if (!config) return;
    saveConfig({ ...config, [key]: checked });
  };

  const handleRevokeChange = (index: number, revokeToId: string) => {
    if (!config) return;
    const newTransitions = [...config.transitions];
    const transition = { ...newTransitions[index] };

    if (revokeToId === "no_revoke") {
      transition.canRevoke = false;
      transition.revokeTo = undefined;
    } else {
      transition.canRevoke = true;
      transition.revokeTo = revokeToId;
    }

    newTransitions[index] = transition;
    saveConfig({ ...config, transitions: newTransitions });
  };

  const handleQcPercentageChange = (index: number, value: string) => {
    if (!config) return;
    const newTransitions = [...config.transitions];
    const transition = { ...newTransitions[index] };

    // Allow empty value to clear it
    if (value === "") {
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

  const handleNoCaseQcPercentageChange = (value: string) => {
    if (!config) return;

    // Allow empty value to clear it
    if (value === "") {
      setConfig({ ...config, noCaseQcPercentage: undefined });
      return;
    }

    // Only allow numbers
    if (!/^\d*$/.test(value)) return;

    const percentage = parseInt(value);
    if (!isNaN(percentage) && percentage >= 0 && percentage <= 100) {
      setConfig({ ...config, noCaseQcPercentage: percentage });
    }
  };

  const handleTrackAllocationChange = (
    track: "icsr" | "aoi" | "noCase",
    value: string,
  ) => {
    if (!config) return;

    const key = `${track}AllocationPercentage` as keyof WorkflowConfig;

    // Allow empty value to clear it
    if (value === "") {
      setConfig({ ...config, [key]: undefined });
      return;
    }

    // Only allow numbers
    if (!/^\d*$/.test(value)) return;

    const percentage = parseInt(value);
    if (!isNaN(percentage) && percentage >= 0 && percentage <= 100) {
      setConfig({ ...config, [key]: percentage });
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
              <h3 className="text-sm font-medium text-gray-900">
                No Case QC Allocation
              </h3>
              <p className="text-sm text-gray-500">
                Percentage of "No Case" studies sent back to Triage for
                re-evaluation.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                inputMode="numeric"
                value={config.noCaseQcPercentage?.toString() ?? "10"}
                onChange={(e) => handleNoCaseQcPercentageChange(e.target.value)}
                className="w-16 border border-gray-300 rounded-md shadow-sm p-1 text-sm text-center"
                placeholder="0-100"
              />
              <span className="text-sm text-gray-500">%</span>
              <button
                onClick={() => saveConfig(config)}
                disabled={saving}
                className="ml-2 bg-blue-600 text-white text-xs px-3 py-1.5 rounded hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium"
              >
                {saving ? "..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Track Allocation Settings Section */}
      <div>
        <h2 className="text-xl font-semibold mb-4">
          Tri-Channel Track Allocation
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          Configure what percentage of studies in each track should be routed to
          Allocation (Assessment). The remainder will bypass Allocation and go
          directly to Assessment.
        </p>
        <div className="bg-white shadow overflow-hidden sm:rounded-md p-6 space-y-6">
          {/* ICSR Track */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-900">
                ICSR Track Allocation
              </h3>
              <p className="text-sm text-gray-500">
                Percentage of ICSR studies retained for manual assessment.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                inputMode="numeric"
                value={config.icsrAllocationPercentage?.toString() ?? "10"}
                onChange={(e) =>
                  handleTrackAllocationChange("icsr", e.target.value)
                }
                className="w-16 border border-gray-300 rounded-md shadow-sm p-1 text-sm text-center"
                placeholder="0-100"
              />
              <span className="text-sm text-gray-500">%</span>
              <button
                onClick={() => saveConfig(config)}
                disabled={saving}
                className="ml-2 bg-blue-600 text-white text-xs px-3 py-1.5 rounded hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium"
              >
                {saving ? "..." : "Save"}
              </button>
            </div>
          </div>

          {/* AOI Track */}
          <div className="flex items-center justify-between border-t pt-4">
            <div>
              <h3 className="text-sm font-medium text-gray-900">
                AOI Track Allocation
              </h3>
              <p className="text-sm text-gray-500">
                {config.aoiAllocationPercentage || 10}% go to Allocation. The
                remaining {100 - (config.aoiAllocationPercentage || 10)}% go
                directly to Assessment.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                inputMode="numeric"
                value={config.aoiAllocationPercentage?.toString() ?? "10"}
                onChange={(e) =>
                  handleTrackAllocationChange("aoi", e.target.value)
                }
                className="w-16 border border-gray-300 rounded-md shadow-sm p-1 text-sm text-center"
                placeholder="0-100"
              />
              <span className="text-sm text-gray-500">%</span>
              <button
                onClick={() => saveConfig(config)}
                disabled={saving}
                className="ml-2 bg-blue-600 text-white text-xs px-3 py-1.5 rounded hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium"
              >
                {saving ? "..." : "Save"}
              </button>
            </div>
          </div>

          {/* No Case Track */}
          <div className="flex items-center justify-between border-t pt-4">
            <div>
              <h3 className="text-sm font-medium text-gray-900">
                No Case Track Allocation
              </h3>
              <p className="text-sm text-gray-500">
                {config.noCaseAllocationPercentage || 10}% go to Allocation. The
                remaining {100 - (config.noCaseAllocationPercentage || 10)}% go
                directly to Assessment.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                inputMode="numeric"
                value={config.noCaseAllocationPercentage?.toString() ?? "10"}
                onChange={(e) =>
                  handleTrackAllocationChange("noCase", e.target.value)
                }
                className="w-16 border border-gray-300 rounded-md shadow-sm p-1 text-sm text-center"
                placeholder="0-100"
              />
              <span className="text-sm text-gray-500">%</span>
              <button
                onClick={() => saveConfig(config)}
                disabled={saving}
                className="ml-2 bg-blue-600 text-white text-xs px-3 py-1.5 rounded hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium"
              >
                {saving ? "..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">
            Current Workflow Transitions
          </h2>
        </div>
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {[
              { label: "Step 1", desc: "Triage -> Assessment (QC)" },
              { label: "Step 2 (ICSR)", desc: "Assessment -> Data Entry" },
              {
                label: "Step 2 (AOI/No Case)",
                desc: "Assessment -> Reporting",
              },
              {
                label: "Step 3 (ICSR)",
                desc: "Data Entry -> Medical Review / Reporting",
              },
              { label: "Step 4", desc: "Reporting -> Archived" },
            ].map((step, index) => (
              <li
                key={index}
                className="px-6 py-4 flex items-center justify-between"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {step.label}
                  </p>
                  <p className="text-sm text-gray-500">{step.desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">ICSR Routing Configuration</h2>
        </div>
        <div className="bg-white shadow overflow-hidden sm:rounded-md p-6">
          <div className="max-w-xl">
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Where do ICSR studies go after Assessment Approval?
            </label>
            <p className="text-sm text-gray-500 mb-4">
              Select the next stage for approved ICSR cases.
            </p>
            <select
              value={config.icsrAssessmentDestination || "data_entry"}
              onChange={(e) => {
                const newVal = e.target.value as any;
                setConfig({ ...config, icsrAssessmentDestination: newVal });
                saveConfig({ ...config, icsrAssessmentDestination: newVal });
              }}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
              disabled={saving}
            >
              <option value="data_entry">Data Entry</option>
              <option value="medical_review">Medical Review</option>
              {/* <option value="reporting">Reports</option> */}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
