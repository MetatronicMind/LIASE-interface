"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useDispatch } from "react-redux";
import { LockClosedIcon, ServerStackIcon } from "@heroicons/react/24/solid";
import { setCredentials } from "@/redux/slices/authSlice";
import { getApiBaseUrl, ENVIRONMENTS, environmentManager } from "@/config/api";

export default function CRMLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentEnv, setCurrentEnv] = useState("");
  const router = useRouter();
  const dispatch = useDispatch();

  useEffect(() => {
    // Determine current environment on mount
    const env = environmentManager.getCurrent();
    setCurrentEnv(env.id);

    // Fetch dynamic environments from the Control Plane (backend)
    // We try to hit the default/current API's environment endpoint
    const fetchDynamicEnvs = async () => {
      try {
        // Use local backend or current configured one as control plane
        const controlPlaneUrl =
          process.env.NEXT_PUBLIC_API_URL || getApiBaseUrl();
        const res = await fetch(`${controlPlaneUrl}/environments/public`);
        if (res.ok) {
          const dynamicEnvs = await res.json();
          if (dynamicEnvs && dynamicEnvs.length > 0) {
            environmentManager.merge(dynamicEnvs);
            // Force re-render of local component environment list
            setAvailableEnvs(environmentManager.getAll());
          }
        }
      } catch (e) {
        console.log("Could not fetch dynamic environments", e);
      }
    };
    fetchDynamicEnvs();
  }, []);

  const [availableEnvs, setAvailableEnvs] = useState(
    Object.values(ENVIRONMENTS),
  );

  const handleEnvChange = (envId: string) => {
    environmentManager.set(envId);
    // environmentManager.set() reloads the page, so no state update needed here
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Use the configured API URL (respecting environment selection)
      const apiUrl = getApiBaseUrl();
      console.log(`[Login] Attempting login to: ${apiUrl}`);

      const loginPayload = {
        password: password,
      } as any;

      // Determine if input is email or username
      if (email.includes("@")) {
        loginPayload.email = email;
      } else {
        loginPayload.username = email;
      }

      const res = await fetch(`${apiUrl}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(loginPayload),
      });

      const data = await res.json();

      if (res.ok) {
        // Strict Check: Only allow if role is SuperAdmin (or equivalent)
        const userRole = data.user?.role || "";
        // Normalize: remove underscores, convert to uppercase for comparison
        // "SuperAdmin" -> "SUPERADMIN"
        // "SUPER_ADMIN" -> "SUPERADMIN"
        const normalizedRole = userRole.toUpperCase().replace("_", "");

        const allowedRoles = ["SUPERADMIN", "ADMIN", "SYSTEMADMIN"];

        if (!allowedRoles.includes(normalizedRole)) {
          setError(
            `Access Denied: This portal is for Super Admins only. Your role is: ${userRole}`,
          );
          setLoading(false);
          return;
        }

        // Store tokens in localStorage for persistence across page refreshes
        localStorage.setItem("crm_auth_token", data.token);
        localStorage.setItem("crm_user", JSON.stringify(data.user));
        localStorage.setItem("auth_token", data.token);
        localStorage.setItem("auth_user", JSON.stringify(data.user));
        if (data.organization) {
          localStorage.setItem(
            "auth_organization",
            JSON.stringify(data.organization),
          );
        }

        // Dispatch Redux action to immediately update state
        // This fixes the double-submit bug by ensuring isAuthenticated is true immediately
        dispatch(
          setCredentials({
            message: "Login successful",
            token: data.token,
            user: data.user,
            organization: data.organization || null,
            passwordWarning: data.passwordWarning,
          }),
        );

        router.push("/dashboard");
      } else {
        setError(data.message || "Login failed");
      }
    } catch (err) {
      setError("Connection error. Ensure the backend is running.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center flex-col">
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold text-white tracking-tight">
          LIASE <span className="text-indigo-400">CRM</span>
        </h1>
        <p className="text-slate-400 mt-2">Centralized Management Console</p>
      </div>

      <div className="bg-white p-8 rounded-lg shadow-2xl w-full max-w-md border-t-4 border-indigo-600">
        <div className="flex items-center justify-center mb-6">
          <div className="p-3 bg-indigo-100 rounded-full">
            <LockClosedIcon className="h-6 w-6 text-indigo-600" />
          </div>
        </div>

        <h2 className="text-2xl font-bold text-slate-800 mb-6 text-center">
          Admin Login
        </h2>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-200 text-red-700 rounded text-sm flex items-start">
            <span className="mr-2">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Email or Username
            </label>
            <input
              type="text"
              required
              placeholder="admin@organization.com or username"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-3 border placeholder-gray-400"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              required
              placeholder="••••••••"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-3 border placeholder-gray-400"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className={`w-full bg-indigo-600 text-white py-3 px-4 rounded-md hover:bg-indigo-700 transition font-medium shadow-md ${loading ? "opacity-70 cursor-not-allowed" : ""}`}
          >
            {loading ? "Authenticating..." : "Access CRM Dashboard"}
          </button>
        </form>

        <div className="mt-8 border-t border-gray-200 pt-6">
          <div className="flex items-center justify-center gap-2 text-sm text-gray-500 mb-3">
            <ServerStackIcon className="w-4 h-4" />
            <span>Target Environment</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {availableEnvs.map((env) => (
              <button
                key={env.id}
                type="button"
                onClick={() => handleEnvChange(env.id)}
                className={`px-2 py-2 text-xs font-medium rounded border transition-colors truncate ${
                  currentEnv === env.id
                    ? "bg-indigo-50 border-indigo-200 text-indigo-700 ring-2 ring-indigo-100"
                    : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
                title={env.name}
              >
                {env.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      <p className="mt-8 text-slate-500 text-xs">
        &copy; 2026 LIASE Group. Authorized Personnel Only.
      </p>
    </div>
  );
}
