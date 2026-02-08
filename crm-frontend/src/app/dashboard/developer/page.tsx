"use client";

import React, { useEffect, useState } from "react";
import {
  developerService,
  SystemHealth,
  AnalyticsData,
  MaintenanceAction,
  Environment,
} from "@/services/developerService"; // Adjust import path if needed, but @/services works
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { toast } from "react-hot-toast";

// ... (Rest of the component is same, but let's copy it properly)
const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8"];

export default function DeveloperDashboard() {
  const [activeTab, setActiveTab] = useState<
    "overview" | "analytics" | "logs" | "maintenance" | "environments"
  >("overview");
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [maintenanceOptions, setMaintenanceOptions] = useState<
    MaintenanceAction[]
  >([]);
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [deploying, setDeploying] = useState<string | null>(null);
  const [restarting, setRestarting] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    setRefreshing(true);
    try {
      const [healthData, analyticsData] = await Promise.all([
        developerService.getSystemHealth(),
        developerService.getAnalytics(),
      ]);
      setHealth(healthData);
      setAnalytics(analyticsData);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const loadLogs = async () => {
    try {
      const logData = await developerService.getLogs(100);
      setLogs(logData);
    } catch (error) {
      toast.error("Failed to load logs");
    }
  };

  const loadMaintenance = async () => {
    try {
      const options = await developerService.getMaintenanceOptions();
      setMaintenanceOptions(options);
    } catch (error) {
      toast.error("Failed to load maintenance options");
    }
  };

  const loadEnvironments = async () => {
    try {
      const envs = await developerService.getEnvironments();
      setEnvironments(envs);
    } catch (error) {
      toast.error("Failed to load environments");
    }
  };

  useEffect(() => {
    if (activeTab === "logs") loadLogs();
    if (activeTab === "maintenance") loadMaintenance();
    if (activeTab === "environments") loadEnvironments();
  }, [activeTab]);

  const handleDeploy = async (envId: string) => {
    if (!confirm(`Are you sure you want to trigger a deployment for ${envId}?`))
      return;
    setDeploying(envId);
    try {
      const result = await developerService.deployEnvironment(envId);
      toast.success(result.message);
      loadEnvironments(); // Refresh status
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setDeploying(null);
    }
  };

  const handleRestart = async (envId: string) => {
    if (
      !confirm(
        `Are you sure you want to RESTART the ${envId} environment? This will cause brief downtime.`,
      )
    )
      return;
    setRestarting(envId);
    try {
      const result = await developerService.restartEnvironment(envId);
      toast.success(result.message);
      // Wait a bit then refresh to see if status changes (might go down then up)
      setTimeout(loadEnvironments, 5000);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setRestarting(null);
    }
  };

  const handleMaintenanceAction = async (actionId: string) => {
    if (!confirm("Are you sure you want to execute this action?")) return;
    try {
      const result = await developerService.triggerMaintenance(actionId);
      toast.success(result.message);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  if (loading)
    return (
      <div className="p-8 text-center text-gray-500">Loading Dashboard...</div>
    );

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        Developer & System Dashboard
      </h1>

      <div className="flex justify-between items-center mb-6">
        <div className="flex space-x-2 bg-gray-100 p-1 rounded-lg">
          {["overview", "analytics", "logs", "maintenance", "environments"].map(
            (tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`px-4 py-2 rounded-md text-sm font-medium capitalize transition-colors
                    ${activeTab === tab ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-900"}`}
              >
                {tab}
              </button>
            ),
          )}
        </div>
        <button
          onClick={fetchData}
          className="p-2 text-gray-400 hover:text-indigo-600 rounded-full hover:bg-gray-100 transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className={`h-5 w-5 ${refreshing ? "animate-spin" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </button>
      </div>

      {activeTab === "overview" && health && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
                System Status
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 flex items-center">
                    <span
                      className={`w-2 h-2 rounded-full mr-2 ${health.database.status === "connected" ? "bg-green-500" : "bg-red-500"}`}
                    ></span>
                    Database
                  </span>
                  <span
                    className={`font-mono text-sm ${health.database.status === "connected" ? "text-green-600" : "text-red-600"}`}
                  >
                    {health.database.status}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 flex items-center">
                    <span
                      className={`w-2 h-2 rounded-full mr-2 ${health.cache.status ? "bg-green-500" : "bg-yellow-500"}`}
                    ></span>
                    Cache
                  </span>
                  <span
                    className={`font-mono text-sm ${health.cache.status ? "text-green-600" : "text-yellow-600"}`}
                  >
                    {health.cache.status || "Unknown"}
                  </span>
                </div>
                <div className="flex items-center justify-between border-t pt-4">
                  <span className="text-gray-600">Uptime</span>
                  <span className="font-mono text-sm">
                    {health.server.uptime}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
                Server Health
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">RSS Memory</span>
                  <span className="font-mono text-sm">
                    {health.server.memory.rss}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Heap Used</span>
                  <span className="font-mono text-sm">
                    {health.server.memory.heapUsed}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div
                    className="bg-indigo-600 h-2 rounded-full"
                    style={{ width: "40%" }}
                  ></div>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
                24h Activity Snapshot
              </h3>
              {analytics && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {analytics.activity.logsWithIn24h}
                    </div>
                    <div className="text-xs text-blue-600 mt-1">Activities</div>
                  </div>
                  <div className="text-center p-3 bg-red-50 rounded-lg">
                    <div className="text-2xl font-bold text-red-600">
                      {analytics.activity.errorsIn24h}
                    </div>
                    <div className="text-xs text-red-600 mt-1">Errors</div>
                  </div>
                  <div className="text-center p-3 bg-yellow-50 rounded-lg">
                    <div className="text-2xl font-bold text-yellow-600">
                      {analytics.activity.failedJobsTotal}
                    </div>
                    <div className="text-xs text-yellow-600 mt-1">
                      Failed Jobs
                    </div>
                  </div>
                  <div className="text-center p-3 bg-purple-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">
                      {analytics.users.total}
                    </div>
                    <div className="text-xs text-purple-600 mt-1">Users</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === "analytics" && analytics && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800 mb-6">
                Study Status Distribution
              </h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={Object.entries(analytics.studies.breakdown).map(
                      ([name, value]) => ({ name, value }),
                    )}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} />
                    <YAxis axisLine={false} tickLine={false} />
                    <Tooltip cursor={{ fill: "#f3f4f6" }} />
                    <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800 mb-6">
                User Roles
              </h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={Object.entries(analytics.users.breakdown).map(
                        ([name, value]) => ({ name, value }),
                      )}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {Object.entries(analytics.users.breakdown).map(
                        (entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={COLORS[index % COLORS.length]}
                          />
                        ),
                      )}
                    </Pie>
                    <Tooltip />
                    <Legend verticalAlign="bottom" height={36} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "logs" && (
        <div className="bg-white shadow-sm border border-gray-200 rounded-xl overflow-hidden">
          <div className="flex justify-between items-center p-4 border-b border-gray-200 bg-gray-50">
            <h3 className="font-semibold text-gray-700">Recent System Logs</h3>
            <button
              onClick={loadLogs}
              className="text-indigo-600 text-sm hover:text-indigo-800 font-medium"
            >
              Refresh Logs
            </button>
          </div>
          <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Timestamp
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Message/Action
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200 font-mono text-sm">
                {logs.map((log, idx) => (
                  <tr
                    key={log._id || idx}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-3 whitespace-nowrap text-gray-500 text-xs">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs font-semibold rounded-full 
                                        ${log.action && log.action.toLowerCase().includes("error") ? "bg-red-100 text-red-800" : "bg-blue-100 text-blue-800"}`}
                      >
                        {log.entityType || "SYSTEM"}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-gray-900 break-all">
                      {log.action}
                      {log.details && (
                        <span className="block text-xs text-gray-400 mt-1 truncate max-w-md">
                          {JSON.stringify(log.details)}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap text-gray-500 text-xs">
                      {log.userId
                        ? log.userId.username || log.userId.email || "User"
                        : "System"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {logs.length === 0 && (
            <div className="p-8 text-center text-gray-500">No logs found</div>
          )}
        </div>
      )}

      {activeTab === "maintenance" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {maintenanceOptions.map((option) => (
            <div
              key={option.id}
              className={`p-6 bg-white rounded-xl shadow-sm border-2 transition-transform hover:-translate-y-1 ${option.danger ? "border-red-100" : "border-indigo-100"}`}
            >
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center mb-4 ${option.danger ? "bg-red-100 text-red-600" : "bg-indigo-100 text-indigo-600"}`}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-900">
                {option.label}
              </h3>
              <p className="mt-2 text-sm text-gray-500 h-10">
                {option.description}
              </p>
              <button
                onClick={() => handleMaintenanceAction(option.id)}
                className={`mt-6 w-full px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2
                            ${option.danger ? "bg-red-600 hover:bg-red-700 focus:ring-red-500" : "bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500"}`}
              >
                Execute Action
              </button>
            </div>
          ))}
        </div>
      )}

      {activeTab === "environments" && (
        <div className="space-y-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">Environment Management</h2>
            <button
              onClick={loadEnvironments}
              className="p-2 text-gray-500 hover:text-indigo-600 transition-colors"
              title="Refresh"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-5 h-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"
                />
              </svg>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {environments.map((env) => (
              <div
                key={env.id}
                className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-bold text-lg text-gray-800">
                      {env.name}
                    </h3>
                    <p
                      className="text-xs text-gray-400 mt-1 truncate max-w-[200px]"
                      title={env.dbName}
                    >
                      DB: {env.dbName || "Unknown"}
                    </p>
                  </div>
                  <div className="flex flex-col items-end">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-semibold flex items-center gap-1 ${
                        env.status === "healthy"
                          ? "bg-green-100 text-green-800"
                          : env.status === "deploying"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-red-100 text-red-800"
                      }`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${
                          env.status === "healthy"
                            ? "bg-green-500"
                            : env.status === "deploying"
                              ? "bg-blue-500"
                              : "bg-red-500"
                        }`}
                      ></span>
                      {env.status.toUpperCase()}
                    </span>
                    {env.error && (
                      <span
                        className="text-[10px] text-red-500 mt-1 max-w-[100px] truncate"
                        title={env.error}
                      >
                        Check failed
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-4 mb-6">
                  <div className="flex justify-between border-b pb-2 border-gray-100">
                    <span className="text-gray-500 text-sm">Branch</span>
                    <span className="font-mono text-sm bg-gray-100 px-2 py-0.5 rounded">
                      {env.branch}
                    </span>
                  </div>
                  <div className="flex justify-between border-b pb-2 border-gray-100">
                    <span className="text-gray-500 text-sm">Version</span>
                    <span className="font-medium text-sm">{env.version}</span>
                  </div>
                  <div className="flex justify-between border-b pb-2 border-gray-100">
                    <span className="text-gray-500 text-sm">Last Deploy</span>
                    <span className="text-xs text-right max-w-[60%]">
                      {env.lastDeploy}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-1">
                    <span className="text-gray-500 text-sm">URL</span>
                    <a
                      href={env.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 hover:text-indigo-800 text-sm flex items-center gap-1"
                    >
                      Visit <span aria-hidden="true">&rarr;</span>
                    </a>
                  </div>
                </div>

                <div className="mt-4">
                  <button
                    onClick={() => handleDeploy(env.id)}
                    disabled={deploying === env.id || env.id !== "sandbox"}
                    className={`w-full py-2 px-4 rounded-md font-medium text-white transition-all duration-200 ${
                      env.id === "sandbox"
                        ? "bg-indigo-600 hover:bg-indigo-700 shadow-sm hover:shadow active:scale-95"
                        : "bg-gray-300 cursor-not-allowed text-gray-500"
                    }`}
                  >
                    {deploying === env.id ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg
                          className="animate-spin h-4 w-4 text-white"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                        Deploying...
                      </span>
                    ) : (
                      "Trigger Deployment"
                    )}
                  </button>
                  {env.id !== "sandbox" && (
                    <div className="mt-2">
                      <button
                        onClick={() => handleRestart(env.id)}
                        disabled={restarting === env.id}
                        className="w-full py-2 px-4 rounded-md font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 transition-all text-sm"
                      >
                        {restarting === env.id
                          ? "Restarting..."
                          : "Restart Server"}
                      </button>
                    </div>
                  )}
                  {env.id !== "sandbox" && (
                    <p className="text-xs text-gray-400 mt-2 text-center">
                      Deployment managed by CI/CD Pipeline
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mt-8">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-blue-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-blue-700">
                  <span className="font-bold">Note:</span> Triggering a
                  deployment for Sandbox will update the version to the latest
                  commit on the <code>dev</code> branch. This process typically
                  takes 2-5 minutes.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
