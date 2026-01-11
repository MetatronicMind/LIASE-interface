"use client";
import { useState, useEffect } from "react";
import {
  ServerIcon,
  CpuChipIcon,
  LinkIcon,
  ClockIcon,
  ShieldCheckIcon,
  DocumentTextIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";

interface SystemConfig {
  // API Endpoints
  aiInferenceEndpoints: {
    primary: string;
    secondary: string;
    tertiary: string;
    quaternary: string;
  };
  r3XmlEndpoint: string;
  pubmedApiEndpoint: string;
  pmidListEndpoint: string;
  
  // Ports and URLs
  backendPort: number;
  frontendPort: number;
  backendUrl: string;
  frontendUrl: string;
  
  // AI Processing Configuration
  aiProcessing: {
    maxConcurrentRequests: number;
    requestTimeout: number;
    retryAttempts: number;
    batchSize: number;
    enableCircuitBreaker: boolean;
    circuitBreakerThreshold: number;
  };
  
  // Database Configuration
  database: {
    cosmosDbEndpoint: string;
    databaseId: string;
    maxConnectionPoolSize: number;
    requestTimeout: number;
  };
  
  // Rate Limiting
  rateLimiting: {
    enabled: boolean;
    windowMs: number;
    maxRequests: number;
  };
  
  // Email Configuration
  email: {
    smtpHost: string;
    smtpPort: number;
    smtpSecure: boolean;
    fromName: string;
    fromEmail: string;
  };
  
  // Scheduler Configuration
  scheduler: {
    drugSearchInterval: string; // cron expression
    dailyReportsTime: string; // cron expression
    notificationProcessingInterval: number; // seconds
  };
  
  // Security Configuration
  security: {
    jwtExpiresIn: string;
    passwordMinLength: number;
    enableMfa: boolean;
    sessionTimeout: number; // minutes
    maxLoginAttempts: number;
  };
  
  // System Maintenance
  maintenance: {
    enabled: boolean;
    message: string;
    allowedIps: string[];
  };
}

export default function SuperAdminConfigTab() {
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<{ [key: string]: boolean }>({});
  const [testResults, setTestResults] = useState<{ [key: string]: { success: boolean; message: string } }>({});
  const [activeSection, setActiveSection] = useState<string>("api-endpoints");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const token = localStorage.getItem("auth_token");
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api";
      const response = await fetch(`${apiUrl}/admin-config/system-config`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setConfig(data);
      } else {
        // Set default configuration if none exists
        setConfig(getDefaultConfig());
      }
    } catch (error) {
      console.error("Error fetching system config:", error);
      setConfig(getDefaultConfig());
    } finally {
      setLoading(false);
    }
  };

  const getDefaultConfig = (): SystemConfig => ({
    aiInferenceEndpoints: {
      primary: process.env.NEXT_PUBLIC_AI_INFERENCE_URL_1 || "http://48.217.12.7/get_AI_inference",
      secondary: process.env.NEXT_PUBLIC_AI_INFERENCE_URL_2 || "http://4.157.127.230/get_AI_inference",
      tertiary: process.env.NEXT_PUBLIC_AI_INFERENCE_URL_3 || "http://4.157.29.153/get_AI_inference",
      quaternary: process.env.NEXT_PUBLIC_AI_INFERENCE_URL_4 || "http://4.236.195.153/get_AI_inference",
    },
    r3XmlEndpoint: process.env.NEXT_PUBLIC_R3_XML_ENDPOINT || "http://4.236.195.153/get_r3_xml",
    pubmedApiEndpoint: "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/",
    pmidListEndpoint: process.env.NEXT_PUBLIC_PMID_LIST_ENDPOINT || "http://48.217.12.7/get_pmidlist/",
    backendPort: 8000,
    frontendPort: 3000,
    backendUrl: process.env.NEXT_PUBLIC_API_URL || "https://liase-backend-fpc8gsbrghgacdgx.centralindia-01.azurewebsites.net/api",
    frontendUrl: process.env.NEXT_PUBLIC_FRONTEND_URL || "https://liase-interface.azurewebsites.net",
    aiProcessing: {
      maxConcurrentRequests: 5,
      requestTimeout: 30000,
      retryAttempts: 3,
      batchSize: 10,
      enableCircuitBreaker: true,
      circuitBreakerThreshold: 5,
    },
    database: {
      cosmosDbEndpoint: process.env.COSMOS_DB_ENDPOINT || "",
      databaseId: process.env.COSMOS_DB_DATABASE_ID || "LIASE-DB",
      maxConnectionPoolSize: 100,
      requestTimeout: 30000,
    },
    rateLimiting: {
      enabled: true,
      windowMs: 900000, // 15 minutes
      maxRequests: 100,
    },
    email: {
      smtpHost: process.env.SMTP_HOST || "",
      smtpPort: parseInt(process.env.SMTP_PORT || "587"),
      smtpSecure: process.env.SMTP_SECURE === "true",
      fromName: process.env.SMTP_FROM_NAME || "LIASE Notifications",
      fromEmail: process.env.SMTP_FROM_EMAIL || "",
    },
    scheduler: {
      drugSearchInterval: "0 */6 * * *", // Every 6 hours
      dailyReportsTime: "0 9 * * *", // 9 AM UTC
      notificationProcessingInterval: 10, // 10 seconds
    },
    security: {
      jwtExpiresIn: "24h",
      passwordMinLength: 8,
      enableMfa: false,
      sessionTimeout: 60, // 60 minutes
      maxLoginAttempts: 5,
    },
    maintenance: {
      enabled: false,
      message: "System is under maintenance. Please try again later.",
      allowedIps: [],
    },
  });

  const handleSave = async () => {
    if (!config) return;
    
    setSaving(true);
    setMessage(null);
    
    try {
      const token = localStorage.getItem("auth_token");
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api";
      const response = await fetch(`${apiUrl}/admin-config/system-config`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(config),
      });

      if (response.ok) {
        setMessage({ type: "success", text: "System configuration saved successfully!" });
      } else {
        const error = await response.json();
        setMessage({ type: "error", text: error.message || "Failed to save configuration" });
      }
    } catch (error) {
      console.error("Error saving config:", error);
      setMessage({ type: "error", text: "Failed to save configuration" });
    } finally {
      setSaving(false);
    }
  };

  const testEndpoint = async (type: string, url: string) => {
    setTesting({ ...testing, [type]: true });
    
    try {
      const token = localStorage.getItem("auth_token");
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api";
      const response = await fetch(`${apiUrl}/admin-config/test-endpoint`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ type, url }),
      });

      const result = await response.json();
      setTestResults({
        ...testResults,
        [type]: {
          success: response.ok && result.success,
          message: result.message || (response.ok ? "Connection successful" : "Connection failed"),
        },
      });
    } catch (error) {
      setTestResults({
        ...testResults,
        [type]: {
          success: false,
          message: "Failed to test connection",
        },
      });
    } finally {
      setTesting({ ...testing, [type]: false });
    }
  };

  const updateConfig = (path: string[], value: any) => {
    if (!config) return;
    
    const newConfig = { ...config };
    let current: any = newConfig;
    
    for (let i = 0; i < path.length - 1; i++) {
      current = current[path[i]];
    }
    
    current[path[path.length - 1]] = value;
    setConfig(newConfig);
  };

  const sections = [
    { id: "api-endpoints", name: "API Endpoints", icon: <LinkIcon className="w-5 h-5" /> },
    { id: "ai-processing", name: "AI Processing", icon: <CpuChipIcon className="w-5 h-5" /> },
    { id: "database", name: "Database", icon: <ServerIcon className="w-5 h-5" /> },
    { id: "email", name: "Email", icon: <DocumentTextIcon className="w-5 h-5" /> },
    { id: "scheduler", name: "Scheduler", icon: <ClockIcon className="w-5 h-5" /> },
    { id: "security", name: "Security", icon: <ShieldCheckIcon className="w-5 h-5" /> },
    { id: "maintenance", name: "Maintenance", icon: <ExclamationTriangleIcon className="w-5 h-5" /> },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="p-8 text-center text-red-600">
        Failed to load system configuration
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Super Admin System Configuration</h2>
        <p className="text-gray-600 mt-2">
          Manage all system-wide configurations, endpoints, and settings
        </p>
      </div>

      {message && (
        <div
          className={`mb-6 p-4 rounded-lg ${
            message.type === "success"
              ? "bg-green-50 text-green-800 border border-green-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Section Navigation */}
      <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
        {sections.map((section) => (
          <button
            key={section.id}
            onClick={() => setActiveSection(section.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
              activeSection === section.id
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {section.icon}
            {section.name}
          </button>
        ))}
      </div>

      {/* Configuration Sections */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        {/* API Endpoints Section */}
        {activeSection === "api-endpoints" && (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">API Endpoints Configuration</h3>

            {/* AI Inference Endpoints */}
            <div className="space-y-4">
              <h4 className="font-medium text-gray-700">AI Inference Endpoints</h4>
              
              {["primary", "secondary", "tertiary", "quaternary"].map((endpoint) => (
                <div key={endpoint} className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 capitalize">
                    {endpoint} AI Endpoint
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={config.aiInferenceEndpoints[endpoint as keyof typeof config.aiInferenceEndpoints]}
                      onChange={(e) =>
                        updateConfig(["aiInferenceEndpoints", endpoint], e.target.value)
                      }
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="https://api.example.com/ai-inference"
                    />
                    <button
                      onClick={() =>
                        testEndpoint(
                          `ai-${endpoint}`,
                          config.aiInferenceEndpoints[endpoint as keyof typeof config.aiInferenceEndpoints]
                        )
                      }
                      disabled={testing[`ai-${endpoint}`]}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 flex items-center gap-2"
                    >
                      {testing[`ai-${endpoint}`] ? (
                        <ArrowPathIcon className="w-4 h-4 animate-spin" />
                      ) : (
                        "Test"
                      )}
                    </button>
                  </div>
                  {testResults[`ai-${endpoint}`] && (
                    <div
                      className={`flex items-center gap-2 text-sm ${
                        testResults[`ai-${endpoint}`].success ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {testResults[`ai-${endpoint}`].success ? (
                        <CheckCircleIcon className="w-4 h-4" />
                      ) : (
                        <XCircleIcon className="w-4 h-4" />
                      )}
                      {testResults[`ai-${endpoint}`].message}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* R3 XML Endpoint */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                R3 XML Processing Endpoint
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={config.r3XmlEndpoint}
                  onChange={(e) => updateConfig(["r3XmlEndpoint"], e.target.value)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="https://api.example.com/r3-xml"
                />
                <button
                  onClick={() => testEndpoint("r3-xml", config.r3XmlEndpoint)}
                  disabled={testing["r3-xml"]}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50"
                >
                  {testing["r3-xml"] ? (
                    <ArrowPathIcon className="w-4 h-4 animate-spin" />
                  ) : (
                    "Test"
                  )}
                </button>
              </div>
              {testResults["r3-xml"] && (
                <div
                  className={`flex items-center gap-2 text-sm ${
                    testResults["r3-xml"].success ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {testResults["r3-xml"].success ? (
                    <CheckCircleIcon className="w-4 h-4" />
                  ) : (
                    <XCircleIcon className="w-4 h-4" />
                  )}
                  {testResults["r3-xml"].message}
                </div>
              )}
            </div>

            {/* PMID List Endpoint */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                PMID List Endpoint
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={config.pmidListEndpoint || ""}
                  onChange={(e) => updateConfig(["pmidListEndpoint"], e.target.value)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="http://..."
                />
                <button
                  onClick={() => testEndpoint("pmid-list", config.pmidListEndpoint)}
                  disabled={testing["pmid-list"]}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 flex items-center gap-2"
                >
                  {testing["pmid-list"] ? (
                    <ArrowPathIcon className="w-4 h-4 animate-spin" />
                  ) : (
                    "Test"
                  )}
                </button>
              </div>
              {testResults["pmid-list"] && (
                <div
                  className={`flex items-center gap-2 text-sm ${
                    testResults["pmid-list"].success ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {testResults["pmid-list"].success ? (
                    <CheckCircleIcon className="w-4 h-4" />
                  ) : (
                    <XCircleIcon className="w-4 h-4" />
                  )}
                  {testResults["pmid-list"].message}
                </div>
              )}
            </div>

            {/* PubMed API Endpoint */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                PubMed API Endpoint
              </label>
              <input
                type="url"
                value={config.pubmedApiEndpoint}
                onChange={(e) => updateConfig(["pubmedApiEndpoint"], e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="https://eutils.ncbi.nlm.nih.gov/entrez/eutils/"
              />
            </div>

            {/* Backend/Frontend URLs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Backend URL</label>
                <input
                  type="url"
                  value={config.backendUrl}
                  onChange={(e) => updateConfig(["backendUrl"], e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="https://liase-backend-fpc8gsbrghgacdgx.centralindia-01.azurewebsites.net/api"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Frontend URL</label>
                <input
                  type="url"
                  value={config.frontendUrl}
                  onChange={(e) => updateConfig(["frontendUrl"], e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="https://liase-interface.azurewebsites.net"
                />
              </div>
            </div>

            {/* Ports */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Backend Port</label>
                <input
                  type="number"
                  value={config.backendPort}
                  onChange={(e) => updateConfig(["backendPort"], parseInt(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="1000"
                  max="65535"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Frontend Port</label>
                <input
                  type="number"
                  value={config.frontendPort}
                  onChange={(e) => updateConfig(["frontendPort"], parseInt(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="1000"
                  max="65535"
                />
              </div>
            </div>
          </div>
        )}

        {/* AI Processing Section */}
        {activeSection === "ai-processing" && (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">AI Processing Configuration</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Max Concurrent Requests
                </label>
                <input
                  type="number"
                  value={config.aiProcessing.maxConcurrentRequests}
                  onChange={(e) =>
                    updateConfig(["aiProcessing", "maxConcurrentRequests"], parseInt(e.target.value))
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="1"
                  max="20"
                />
                <p className="text-xs text-gray-500">Number of simultaneous AI requests (1-20)</p>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Request Timeout (ms)
                </label>
                <input
                  type="number"
                  value={config.aiProcessing.requestTimeout}
                  onChange={(e) =>
                    updateConfig(["aiProcessing", "requestTimeout"], parseInt(e.target.value))
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="5000"
                  max="120000"
                  step="1000"
                />
                <p className="text-xs text-gray-500">Timeout for AI API requests (5000-120000ms)</p>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Retry Attempts
                </label>
                <input
                  type="number"
                  value={config.aiProcessing.retryAttempts}
                  onChange={(e) =>
                    updateConfig(["aiProcessing", "retryAttempts"], parseInt(e.target.value))
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="0"
                  max="10"
                />
                <p className="text-xs text-gray-500">Number of retry attempts on failure (0-10)</p>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Batch Size
                </label>
                <input
                  type="number"
                  value={config.aiProcessing.batchSize}
                  onChange={(e) =>
                    updateConfig(["aiProcessing", "batchSize"], parseInt(e.target.value))
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="1"
                  max="50"
                />
                <p className="text-xs text-gray-500">Items per batch for processing (1-50)</p>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Circuit Breaker Threshold
                </label>
                <input
                  type="number"
                  value={config.aiProcessing.circuitBreakerThreshold}
                  onChange={(e) =>
                    updateConfig(["aiProcessing", "circuitBreakerThreshold"], parseInt(e.target.value))
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="1"
                  max="20"
                  disabled={!config.aiProcessing.enableCircuitBreaker}
                />
                <p className="text-xs text-gray-500">
                  Failures before circuit breaker opens (1-20)
                </p>
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={config.aiProcessing.enableCircuitBreaker}
                    onChange={(e) =>
                      updateConfig(["aiProcessing", "enableCircuitBreaker"], e.target.checked)
                    }
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Enable Circuit Breaker
                  </span>
                </label>
                <p className="text-xs text-gray-500">
                  Automatically disable failing endpoints
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Database Section */}
        {activeSection === "database" && (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Database Configuration</h3>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Cosmos DB Endpoint
                </label>
                <input
                  type="url"
                  value={config.database.cosmosDbEndpoint}
                  onChange={(e) => updateConfig(["database", "cosmosDbEndpoint"], e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="https://your-cosmos-db.documents.azure.com:443/"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Database ID
                </label>
                <input
                  type="text"
                  value={config.database.databaseId}
                  onChange={(e) => updateConfig(["database", "databaseId"], e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="LIASE-DB"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Max Connection Pool Size
                  </label>
                  <input
                    type="number"
                    value={config.database.maxConnectionPoolSize}
                    onChange={(e) =>
                      updateConfig(["database", "maxConnectionPoolSize"], parseInt(e.target.value))
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    min="10"
                    max="500"
                  />
                  <p className="text-xs text-gray-500">Maximum database connections (10-500)</p>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Request Timeout (ms)
                  </label>
                  <input
                    type="number"
                    value={config.database.requestTimeout}
                    onChange={(e) =>
                      updateConfig(["database", "requestTimeout"], parseInt(e.target.value))
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    min="5000"
                    max="120000"
                    step="1000"
                  />
                  <p className="text-xs text-gray-500">Database request timeout (5000-120000ms)</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Email Section */}
        {activeSection === "email" && (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Email Configuration</h3>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    SMTP Host
                  </label>
                  <input
                    type="text"
                    value={config.email.smtpHost}
                    onChange={(e) => updateConfig(["email", "smtpHost"], e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="smtp.gmail.com"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    SMTP Port
                  </label>
                  <input
                    type="number"
                    value={config.email.smtpPort}
                    onChange={(e) => updateConfig(["email", "smtpPort"], parseInt(e.target.value))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="587"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={config.email.smtpSecure}
                    onChange={(e) => updateConfig(["email", "smtpSecure"], e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Use Secure Connection (SSL/TLS)
                  </span>
                </label>
                <p className="text-xs text-gray-500">
                  Enable for port 465, disable for port 587
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    From Name
                  </label>
                  <input
                    type="text"
                    value={config.email.fromName}
                    onChange={(e) => updateConfig(["email", "fromName"], e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="LIASE Notifications"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    From Email
                  </label>
                  <input
                    type="email"
                    value={config.email.fromEmail}
                    onChange={(e) => updateConfig(["email", "fromEmail"], e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="noreply@example.com"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Scheduler Section */}
        {activeSection === "scheduler" && (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Scheduler Configuration</h3>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Drug Search Interval (Cron Expression)
                </label>
                <input
                  type="text"
                  value={config.scheduler.drugSearchInterval}
                  onChange={(e) => updateConfig(["scheduler", "drugSearchInterval"], e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                  placeholder="0 */6 * * *"
                />
                <p className="text-xs text-gray-500">
                  Default: "0 */6 * * *" (Every 6 hours)
                </p>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Daily Reports Time (Cron Expression)
                </label>
                <input
                  type="text"
                  value={config.scheduler.dailyReportsTime}
                  onChange={(e) => updateConfig(["scheduler", "dailyReportsTime"], e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                  placeholder="0 9 * * *"
                />
                <p className="text-xs text-gray-500">
                  Default: "0 9 * * *" (9:00 AM UTC daily)
                </p>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Notification Processing Interval (Seconds)
                </label>
                <input
                  type="number"
                  value={config.scheduler.notificationProcessingInterval}
                  onChange={(e) =>
                    updateConfig(
                      ["scheduler", "notificationProcessingInterval"],
                      parseInt(e.target.value)
                    )
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="5"
                  max="300"
                />
                <p className="text-xs text-gray-500">
                  How often to process notification queue (5-300 seconds)
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">Cron Expression Examples</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• "0 */6 * * *" - Every 6 hours</li>
                  <li>• "0 9 * * *" - Daily at 9:00 AM</li>
                  <li>• "0 0 * * 0" - Weekly on Sunday at midnight</li>
                  <li>• "*/30 * * * *" - Every 30 minutes</li>
                  <li>• "0 0 1 * *" - Monthly on the 1st at midnight</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Security Section */}
        {activeSection === "security" && (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Security Configuration</h3>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    JWT Expires In
                  </label>
                  <input
                    type="text"
                    value={config.security.jwtExpiresIn}
                    onChange={(e) => updateConfig(["security", "jwtExpiresIn"], e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="24h"
                  />
                  <p className="text-xs text-gray-500">Examples: 24h, 7d, 30d</p>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Password Min Length
                  </label>
                  <input
                    type="number"
                    value={config.security.passwordMinLength}
                    onChange={(e) =>
                      updateConfig(["security", "passwordMinLength"], parseInt(e.target.value))
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    min="6"
                    max="32"
                  />
                  <p className="text-xs text-gray-500">Minimum password length (6-32)</p>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Session Timeout (Minutes)
                  </label>
                  <input
                    type="number"
                    value={config.security.sessionTimeout}
                    onChange={(e) =>
                      updateConfig(["security", "sessionTimeout"], parseInt(e.target.value))
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    min="15"
                    max="480"
                  />
                  <p className="text-xs text-gray-500">Auto-logout after inactivity (15-480 min)</p>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Max Login Attempts
                  </label>
                  <input
                    type="number"
                    value={config.security.maxLoginAttempts}
                    onChange={(e) =>
                      updateConfig(["security", "maxLoginAttempts"], parseInt(e.target.value))
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    min="3"
                    max="10"
                  />
                  <p className="text-xs text-gray-500">Failed attempts before lockout (3-10)</p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={config.security.enableMfa}
                    onChange={(e) => updateConfig(["security", "enableMfa"], e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Enable Multi-Factor Authentication (MFA)
                  </span>
                </label>
                <p className="text-xs text-gray-500">
                  Require additional verification for user logins
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Maintenance Section */}
        {activeSection === "maintenance" && (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Maintenance Mode</h3>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={config.maintenance.enabled}
                    onChange={(e) => updateConfig(["maintenance", "enabled"], e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Enable Maintenance Mode
                  </span>
                </label>
                <p className="text-xs text-gray-500">
                  When enabled, only allowed IPs can access the system
                </p>
              </div>

              {config.maintenance.enabled && (
                <>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Maintenance Message
                    </label>
                    <textarea
                      value={config.maintenance.message}
                      onChange={(e) => updateConfig(["maintenance", "message"], e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      rows={3}
                      placeholder="System is under maintenance. Please try again later."
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Allowed IP Addresses
                    </label>
                    <textarea
                      value={config.maintenance.allowedIps.join("\n")}
                      onChange={(e) =>
                        updateConfig(
                          ["maintenance", "allowedIps"],
                          e.target.value.split("\n").filter((ip) => ip.trim())
                        )
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                      rows={5}
                      placeholder="192.168.1.1&#10;10.0.0.0/8&#10;Enter one IP per line"
                    />
                    <p className="text-xs text-gray-500">
                      Enter one IP address per line. Supports CIDR notation.
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Save Button */}
      <div className="mt-6 flex justify-end gap-3">
        <button
          onClick={fetchConfig}
          className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
        >
          Reset Changes
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
        >
          {saving ? (
            <>
              <ArrowPathIcon className="w-5 h-5 animate-spin" />
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
