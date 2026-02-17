"use client";

import React, { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "@/services/authService";

export default function EnvironmentManager() {
  const [environments, setEnvironments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showProvisionModal, setShowProvisionModal] = useState(false);
  const [selectedEnv, setSelectedEnv] = useState(null);

  // Form State
  const [newEnv, setNewEnv] = useState({
    name: "",
    endpoint: "",
    key: "",
    databaseId: "LIASE-Database-Sandbox",
    type: "sandbox",
  });

  const [provisionData, setProvisionData] = useState({
    organizationName: "",
    username: "",
    email: "",
    password: "",
    firstName: "",
    lastName: "",
  });

  const { token } = useAuth(); // Assuming auth hook provides token

  // Fetch Environments
  const fetchEnvironments = async () => {
    try {
      setLoading(true);
      const res = await axios.get("/api/environments", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      setEnvironments(res.data);
    } catch (err) {
      console.error("Failed to load environments", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEnvironments();
  }, []);

  // Handlers
  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      await axios.post("/api/environments", newEnv, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      setShowAddModal(false);
      fetchEnvironments();
      alert("Environment Registered!");
    } catch (err) {
      alert("Registration Failed: " + err.message);
    }
  };

  const handleProvision = async (e) => {
    e.preventDefault();
    if (!selectedEnv) return;
    try {
      await axios.post(
        `/api/environments/${selectedEnv.id}/provision`,
        provisionData,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        },
      );
      setShowProvisionModal(false);
      fetchEnvironments(); // Update status
      alert("Environment Provisioned Successfully!");
    } catch (err) {
      alert("Provisioning Failed: " + err.response?.data?.error || err.message);
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">
          Environment Management
        </h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          + Add Environment
        </button>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {environments.map((env) => (
            <div
              key={env.id}
              className="bg-white p-5 rounded shadow border border-gray-200"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-lg">{env.name}</h3>
                  <span
                    className={`inline-block px-2 py-1 text-xs rounded mt-1 ${
                      env.type === "production"
                        ? "bg-red-100 text-red-800"
                        : "bg-green-100 text-green-800"
                    }`}
                  >
                    {env.type.toUpperCase()}
                  </span>
                </div>
                <div
                  className={`w-3 h-3 rounded-full ${
                    env.status === "active" ? "bg-green-500" : "bg-gray-300"
                  }`}
                  title={env.status}
                />
              </div>

              <div className="mt-4 text-sm text-gray-600 space-y-1">
                <p>
                  <strong>DB ID:</strong> {env.databaseId}
                </p>
                <p className="truncate" title={env.endpoint}>
                  <strong>URL:</strong> {env.endpoint}
                </p>
                <p>
                  <strong>Status:</strong> {env.status}
                </p>
                {env.lastProvisionedAt && (
                  <p className="text-xs text-gray-400">
                    Last Synced:{" "}
                    {new Date(env.lastProvisionedAt).toLocaleDateString()}
                  </p>
                )}
              </div>

              <div className="mt-4 pt-4 border-t border-gray-100 flex justify-end">
                <button
                  onClick={() => {
                    setSelectedEnv(env);
                    setShowProvisionModal(true);
                  }}
                  className="text-sm bg-indigo-50 text-indigo-600 px-3 py-1 rounded hover:bg-indigo-100"
                >
                  Provision / Bootstrap
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Register New Environment</h2>
            <form onSubmit={handleRegister}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Name</label>
                  <input
                    className="w-full border p-2 rounded"
                    value={newEnv.name}
                    onChange={(e) =>
                      setNewEnv({ ...newEnv, name: e.target.value })
                    }
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Type</label>
                  <select
                    className="w-full border p-2 rounded"
                    value={newEnv.type}
                    onChange={(e) =>
                      setNewEnv({ ...newEnv, type: e.target.value })
                    }
                  >
                    <option value="sandbox">Sandbox</option>
                    <option value="client">Client Instance</option>
                    <option value="production">Production</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Cosmos Endpoint
                  </label>
                  <input
                    className="w-full border p-2 rounded"
                    value={newEnv.endpoint}
                    onChange={(e) =>
                      setNewEnv({ ...newEnv, endpoint: e.target.value })
                    }
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Primary Key
                  </label>
                  <input
                    className="w-full border p-2 rounded"
                    type="password"
                    value={newEnv.key}
                    onChange={(e) =>
                      setNewEnv({ ...newEnv, key: e.target.value })
                    }
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Database ID
                  </label>
                  <input
                    className="w-full border p-2 rounded"
                    value={newEnv.databaseId}
                    onChange={(e) =>
                      setNewEnv({ ...newEnv, databaseId: e.target.value })
                    }
                    required
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-gray-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded"
                >
                  Register
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Provision Modal */}
      {showProvisionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">
              Bootstrap Environment: {selectedEnv?.name}
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              This will connect to the remote DB, create necessary containers,
              and inject the Super Admin user below.
            </p>
            <form onSubmit={handleProvision}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Organization / Client Name
                  </label>
                  <input
                    className="w-full border p-2 rounded"
                    value={provisionData.organizationName}
                    placeholder="e.g. Acme Corp"
                    onChange={(e) =>
                      setProvisionData({
                        ...provisionData,
                        organizationName: e.target.value,
                      })
                    }
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Admin Username
                  </label>
                  <input
                    className="w-full border p-2 rounded"
                    value={provisionData.username}
                    onChange={(e) =>
                      setProvisionData({
                        ...provisionData,
                        username: e.target.value,
                      })
                    }
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Admin Email
                  </label>
                  <input
                    className="w-full border p-2 rounded"
                    type="email"
                    value={provisionData.email}
                    onChange={(e) =>
                      setProvisionData({
                        ...provisionData,
                        email: e.target.value,
                      })
                    }
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Initial Password
                  </label>
                  <input
                    className="w-full border p-2 rounded"
                    type="text"
                    value={provisionData.password}
                    onChange={(e) =>
                      setProvisionData({
                        ...provisionData,
                        password: e.target.value,
                      })
                    }
                    required
                  />
                  <p className="text-xs text-red-500 mt-1">
                    Note: In a real app, this should be a hashed password or
                    handled more securely.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      First Name
                    </label>
                    <input
                      className="w-full border p-2 rounded"
                      value={provisionData.firstName}
                      onChange={(e) =>
                        setProvisionData({
                          ...provisionData,
                          firstName: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Last Name
                    </label>
                    <input
                      className="w-full border p-2 rounded"
                      value={provisionData.lastName}
                      onChange={(e) =>
                        setProvisionData({
                          ...provisionData,
                          lastName: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowProvisionModal(false)}
                  className="px-4 py-2 text-gray-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white rounded"
                >
                  Provision Now
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
