"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  developerService,
  Environment,
  EnvironmentUser,
  EnvironmentSettings,
  EnvironmentMetrics,
} from "@/services/developerService";
import { toast } from "react-hot-toast";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";

export default function EnvironmentDetail() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [environment, setEnvironment] = useState<Environment | null>(null);
  const [users, setUsers] = useState<EnvironmentUser[]>([]);
  const [settings, setSettings] = useState<EnvironmentSettings | null>(null);
  const [metrics, setMetrics] = useState<EnvironmentMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<
    "overview" | "users" | "settings" | "monitoring"
  >("overview");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserRole, setNewUserRole] = useState("viewer");

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // In a real app, we might fetch these based on the active tab or all at once
        // For now, let's try to get the environment details first
        const envData = await developerService.getEnvironment(id);
        setEnvironment(envData);

        // Load other data based on tab or pre-load
        if (activeTab === "users") {
          const usersData = await developerService.getEnvironmentUsers(id);
          setUsers(usersData);
        } else if (activeTab === "settings") {
          const settingsData =
            await developerService.getEnvironmentSettings(id);
          setSettings(settingsData);
        } else if (activeTab === "monitoring") {
          const metricsData = await developerService.getEnvironmentMetrics(id);
          setMetrics(metricsData);
        }
      } catch (error) {
        console.error(error);
        toast.error("Failed to load environment details");
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchData();
    }
  }, [id, activeTab]);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await developerService.addEnvironmentUser(id, newUserEmail, newUserRole);
      toast.success("User added successfully");
      setNewUserEmail("");
      // Refresh users
      const usersData = await developerService.getEnvironmentUsers(id);
      setUsers(usersData);
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Failed to add user");
    }
  };

  const handleUpdateSettings = async (
    newSettings: Partial<EnvironmentSettings>,
  ) => {
    if (!settings) return;
    try {
      await developerService.updateEnvironmentSettings(id, newSettings);
      toast.success("Settings updated");
      setSettings({ ...settings, ...newSettings });
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Failed to update settings");
    }
  };

  if (loading && !environment) {
    return (
      <div className="p-8 text-center text-gray-500">
        Loading Environment Details...
      </div>
    );
  }

  if (!environment) {
    return (
      <div className="p-8 text-center text-red-500">Environment not found</div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <button
        onClick={() => router.push("/dashboard/developer")}
        className="mb-6 flex items-center text-gray-500 hover:text-indigo-600 transition-colors"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5 mr-1"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z"
            clipRule="evenodd"
          />
        </svg>
        Back to Dashboard
      </button>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {environment.name}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              ID: {environment.id} • Branch:{" "}
              <span className="font-mono bg-gray-100 px-1 rounded">
                {environment.branch}
              </span>
            </p>
          </div>
          <div
            className={`px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-2 ${
              environment.status === "healthy"
                ? "bg-green-100 text-green-800"
                : environment.status === "deploying"
                  ? "bg-blue-100 text-blue-800"
                  : "bg-red-100 text-red-800"
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                environment.status === "healthy"
                  ? "bg-green-500"
                  : environment.status === "deploying"
                    ? "bg-blue-500"
                    : "bg-red-500"
              }`}
            ></span>
            {environment.status.toUpperCase()}
          </div>
        </div>

        <div className="mt-6 flex space-x-4 border-b border-gray-200">
          {["overview", "users", "settings", "monitoring"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors capitalize ${
                activeTab === tab
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6">
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                Environment Information
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500">URL</span>
                  <a
                    href={environment.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-600 hover:underline"
                  >
                    {environment.url}
                  </a>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500">Database Name</span>
                  <span className="font-mono text-sm">
                    {environment.dbName || "N/A"}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500">Current Version</span>
                  <span className="font-mono text-sm">
                    {environment.version}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500">Last Deployed</span>
                  <span className="text-sm">
                    {new Date(environment.lastDeploy).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                Quick Actions
              </h3>
              <div className="space-y-3">
                <button className="w-full py-2 px-4 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 transition-colors text-left flex items-center">
                  <svg
                    className="w-5 h-5 mr-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  Trigger Redeploy
                </button>
                <button className="w-full py-2 px-4 bg-yellow-50 text-yellow-700 rounded-lg hover:bg-yellow-100 transition-colors text-left flex items-center">
                  <svg
                    className="w-5 h-5 mr-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                  View Error Logs
                </button>
                <button className="w-full py-2 px-4 bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors text-left flex items-center">
                  <svg
                    className="w-5 h-5 mr-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
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
                  Restart Services
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === "users" && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                Add User to Environment
              </h3>
              <form onSubmit={handleAddUser} className="flex gap-4 items-end">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="colleague@example.com"
                  />
                </div>
                <div className="w-48">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Role
                  </label>
                  <select
                    value={newUserRole}
                    onChange={(e) => setNewUserRole(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="viewer">Viewer</option>
                    <option value="developer">Developer</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <button
                  type="submit"
                  className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
                >
                  Add User
                </button>
              </form>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                <h3 className="font-semibold text-gray-700">Access List</h3>
                <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded-full">
                  {users?.length || 0} Users
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Role
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Last Login
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {users?.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {user.email}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-indigo-100 text-indigo-800 uppercase">
                            {user.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-1 text-xs font-semibold rounded-full ${
                              user.status === "active"
                                ? "bg-green-100 text-green-800"
                                : "bg-yellow-100 text-yellow-800"
                            }`}
                          >
                            {user.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {user.lastLogin || "-"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button className="text-red-600 hover:text-red-900">
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                    {(!users || users.length === 0) && (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-6 py-4 text-center text-gray-500 text-sm"
                        >
                          No users found for this environment.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === "settings" && settings && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                General Configuration
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">
                      Maintenance Mode
                    </h4>
                    <p className="text-xs text-gray-500">
                      Disable access for non-admins
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      handleUpdateSettings({
                        maintenanceMode: !settings.maintenanceMode,
                      })
                    }
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      settings.maintenanceMode ? "bg-indigo-600" : "bg-gray-200"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        settings.maintenanceMode
                          ? "translate-x-6"
                          : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">
                      Debug Logging
                    </h4>
                    <p className="text-xs text-gray-500">
                      Enable verbose error logs
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      handleUpdateSettings({
                        debugLogging: !settings.debugLogging,
                      })
                    }
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      settings.debugLogging ? "bg-indigo-600" : "bg-gray-200"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        settings.debugLogging
                          ? "translate-x-6"
                          : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                Feature Flags
              </h3>
              <div className="space-y-4">
                {Object.entries(settings.featureFlags || {}).map(
                  ([feature, enabled]) => (
                    <div
                      key={feature}
                      className="flex items-center justify-between border-b border-gray-100 pb-2 last:border-0"
                    >
                      <span className="text-sm font-medium text-gray-700 capitalize">
                        {feature.replace(/([A-Z])/g, " $1").trim()}
                      </span>
                      <button
                        onClick={() =>
                          handleUpdateSettings({
                            featureFlags: {
                              ...settings.featureFlags,
                              [feature]: !enabled,
                            },
                          })
                        }
                        className={`px-2 py-1 text-xs font-semibold rounded-md ${
                          enabled
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {enabled ? "Enabled" : "Disabled"}
                      </button>
                    </div>
                  ),
                )}
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 md:col-span-2">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                Environment Variables
              </h3>
              <div className="bg-gray-900 rounded-lg p-4 font-mono text-sm text-gray-300 overflow-x-auto">
                <p>
                  <span className="text-blue-400">NODE_ENV</span>=production
                </p>
                <p>
                  <span className="text-blue-400">DB_HOST</span>=db.{id}
                  .internal
                </p>
                <p>
                  <span className="text-blue-400">API_URL</span>=https://api.
                  {id}.liase.com
                </p>
                <p className="text-gray-500 mt-2">
                  ... 15 more variables hidden
                </p>
              </div>
              <button className="mt-4 text-indigo-600 text-sm font-medium hover:underline">
                Reveal all variables
              </button>
            </div>
          </div>
        )}

        {activeTab === "monitoring" && metrics?.length > 0 && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  CPU & Memory Usage
                </h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={metrics}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis
                        dataKey="timestamp"
                        tickFormatter={(t) =>
                          new Date(t).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        }
                        minTickGap={30}
                      />
                      <YAxis />
                      <Tooltip
                        labelFormatter={(t) => new Date(t).toLocaleString()}
                      />
                      <Legend />
                      <Area
                        type="monotone"
                        dataKey="cpuUsage"
                        stackId="1"
                        stroke="#8884d8"
                        fill="#8884d8"
                        name="CPU %"
                      />
                      <Area
                        type="monotone"
                        dataKey="memoryUsage"
                        stackId="2"
                        stroke="#82ca9d"
                        fill="#82ca9d"
                        name="Memory %"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  Request Traffic
                </h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={metrics}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis
                        dataKey="timestamp"
                        tickFormatter={(t) =>
                          new Date(t).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        }
                        minTickGap={30}
                      />
                      <YAxis />
                      <Tooltip
                        labelFormatter={(t) => new Date(t).toLocaleString()}
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="requestRate"
                        stroke="#ff7300"
                        name="Req/sec"
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="errorRate"
                        stroke="#ff0000"
                        name="Errors/sec"
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 md:col-span-2">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  Response Time Latency
                </h3>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={metrics}>
                      <defs>
                        <linearGradient
                          id="colorLatency"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor="#0088FE"
                            stopOpacity={0.8}
                          />
                          <stop
                            offset="95%"
                            stopColor="#0088FE"
                            stopOpacity={0}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis
                        dataKey="timestamp"
                        tickFormatter={(t) =>
                          new Date(t).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        }
                        minTickGap={30}
                      />
                      <YAxis />
                      <Tooltip
                        labelFormatter={(t) => new Date(t).toLocaleString()}
                      />
                      <Area
                        type="monotone"
                        dataKey="responseTime"
                        stroke="#0088FE"
                        fillOpacity={1}
                        fill="url(#colorLatency)"
                        name="Latency (ms)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
