"use client";
import { useState, useEffect } from "react";
import { getApiBaseUrl } from "@/config/api";
import {
  ArrowPathIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  Bars3Icon,
  TrashIcon,
} from "@heroicons/react/24/outline";

interface TriageConfig {
  batchSize: number; // Keep for backward compatibility
  // Specific Triage Batch Sizes
  icsrTriageBatchSize?: number;
  aoiTriageBatchSize?: number;
  noCaseTriageBatchSize?: number;
  // Assessment Batch Sizes
  icsrAssessmentBatchSize?: number;
  aoiAssessmentBatchSize?: number;
  noCaseAssessmentBatchSize?: number;
  priorityQueue: string[];
}

export default function TriageConfigTab() {
  const [config, setConfig] = useState<TriageConfig>({
    batchSize: 10,
    // Initialize with defaults if not present
    icsrTriageBatchSize: 10,
    aoiTriageBatchSize: 10,
    noCaseTriageBatchSize: 10,
    icsrAssessmentBatchSize: 10,
    aoiAssessmentBatchSize: 10,
    noCaseAssessmentBatchSize: 10,
    priorityQueue: [],
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch(`${getApiBaseUrl()}/admin-config/triage`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data && data.configData) {
          // Merge with defaults to ensure all fields exist
          setConfig((prev) => ({
            ...prev,
            ...data.configData,
            // Ensure defaults if missing in saved config
            icsrTriageBatchSize:
              data.configData.icsrTriageBatchSize ||
              data.configData.batchSize ||
              10,
            aoiTriageBatchSize:
              data.configData.aoiTriageBatchSize ||
              data.configData.batchSize ||
              10,
            noCaseTriageBatchSize:
              data.configData.noCaseTriageBatchSize ||
              data.configData.batchSize ||
              10,
            icsrAssessmentBatchSize:
              data.configData.icsrAssessmentBatchSize || 10,
            aoiAssessmentBatchSize:
              data.configData.aoiAssessmentBatchSize || 10,
            noCaseAssessmentBatchSize:
              data.configData.noCaseAssessmentBatchSize || 10,
          }));
        }
      }
    } catch (error) {
      console.error("Error fetching triage config:", error);
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch(`${getApiBaseUrl()}/admin-config/triage`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          configData: config,
        }),
      });

      if (response.ok) {
        alert("Configuration saved successfully");
      } else {
        alert("Failed to save configuration");
      }
    } catch (error) {
      console.error("Error saving config:", error);
      alert("Error saving configuration");
    } finally {
      setSaving(false);
    }
  };

  const moveItem = (index: number, direction: "up" | "down") => {
    const newQueue = [...config.priorityQueue];
    if (direction === "up" && index > 0) {
      [newQueue[index], newQueue[index - 1]] = [
        newQueue[index - 1],
        newQueue[index],
      ];
    } else if (direction === "down" && index < newQueue.length - 1) {
      [newQueue[index], newQueue[index + 1]] = [
        newQueue[index + 1],
        newQueue[index],
      ];
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
    if (
      confirm(
        'Are you sure you want to reset to default settings? This will remove "Potential" statuses if present.',
      )
    ) {
      setConfig({
        batchSize: 10,
        icsrTriageBatchSize: 10,
        aoiTriageBatchSize: 10,
        noCaseTriageBatchSize: 10,
        icsrAssessmentBatchSize: 10,
        aoiAssessmentBatchSize: 10,
        noCaseAssessmentBatchSize: 10,
        priorityQueue: [
          "Probable ICSR",
          "Probable AOI",
          "Probable ICSR/AOI",
          "No Case",
          "Manual Review",
        ],
      });
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
          Batch Allocation Settings
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Triage Phase */}
          <div className="space-y-4">
            <h4 className="text-md font-medium text-gray-700 border-b pb-2">
              Triage Phase Batch Sizes
            </h4>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                ICSR Triage Batch Size
              </label>
              <input
                type="number"
                min="1"
                max="100"
                className="mt-1 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                value={config.icsrTriageBatchSize || 10}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    icsrTriageBatchSize: parseInt(e.target.value) || 10,
                  })
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                AOI Triage Batch Size
              </label>
              <input
                type="number"
                min="1"
                max="100"
                className="mt-1 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                value={config.aoiTriageBatchSize || 10}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    aoiTriageBatchSize: parseInt(e.target.value) || 10,
                  })
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                No Case Triage Batch Size
              </label>
              <input
                type="number"
                min="1"
                max="100"
                className="mt-1 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                value={config.noCaseTriageBatchSize || 10}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    noCaseTriageBatchSize: parseInt(e.target.value) || 10,
                  })
                }
              />
            </div>
          </div>

          {/* Assessment Phase */}
          <div className="space-y-4">
            <h4 className="text-md font-medium text-gray-700 border-b pb-2">
              Assessment Phase Batch Sizes
            </h4>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                ICSR Assessment Batch Size
              </label>
              <input
                type="number"
                min="1"
                max="100"
                className="mt-1 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                value={config.icsrAssessmentBatchSize || 10}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    icsrAssessmentBatchSize: parseInt(e.target.value) || 10,
                  })
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                AOI Assessment Batch Size
              </label>
              <input
                type="number"
                min="1"
                max="100"
                className="mt-1 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                value={config.aoiAssessmentBatchSize || 10}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    aoiAssessmentBatchSize: parseInt(e.target.value) || 10,
                  })
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                No Case Assessment Batch Size
              </label>
              <input
                type="number"
                min="1"
                max="100"
                className="mt-1 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                value={config.noCaseAssessmentBatchSize || 10}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    noCaseAssessmentBatchSize: parseInt(e.target.value) || 10,
                  })
                }
              />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
          Priority Queue Order
        </h3>
        <p className="mb-4 text-sm text-gray-500">
          Drag and drop items to reorder the priority queue. Top items have
          higher priority.
        </p>

        <div className="space-y-2">
          {config.priorityQueue.map((status, index) => (
            <div
              key={status}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
              className={`flex items-center justify-between p-3 bg-gray-50 border rounded-md cursor-move ${draggedItemIndex === index ? "opacity-50" : ""}`}
            >
              <div className="flex items-center">
                <span className="mr-3 text-gray-400 font-mono">
                  {index + 1}.
                </span>
                <span className="font-medium text-gray-700">{status}</span>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => moveItem(index, "up")}
                  disabled={index === 0}
                  className={`p-1 rounded hover:bg-gray-200 ${index === 0 ? "text-gray-300" : "text-gray-600"}`}
                >
                  <ArrowUpIcon className="w-4 h-4" />
                </button>
                <button
                  onClick={() => moveItem(index, "down")}
                  disabled={index === config.priorityQueue.length - 1}
                  className={`p-1 rounded hover:bg-gray-200 ${index === config.priorityQueue.length - 1 ? "text-gray-300" : "text-gray-600"}`}
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
            "Save Configuration"
          )}
        </button>
      </div>
    </div>
  );
}
