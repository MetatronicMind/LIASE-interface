"use client";
import { useState, useEffect } from "react";
import { PlusIcon } from "@heroicons/react/24/outline";
import { API_CONFIG } from "@/config/api";
import { useAuth } from "@/hooks/useAuth";
import { PermissionGate } from "@/components/PermissionProvider";
import CRMDashboardStats from "@/components/dashboard/CRMDashboardStats";
import ClientsTable from "@/components/dashboard/ClientsTable";
import ActivityFeed from "@/components/dashboard/ActivityFeed";
import OnboardingWizard from "@/components/OnboardingWizard";

interface Client {
  id: string;
  name: string;
  plan: string;
  contactEmail: string;
  userCount: number;
  activeUsers: number;
  studyCount: number;
  pendingStudies: number;
  drugCount: number;
  activeDrugs: number;
  lastActivity: string;
  createdAt: string;
}

interface Activity {
  action: string;
  resource: string;
  timestamp: string;
  userName: string;
  clientId: string;
  clientName: string;
}

interface DashboardData {
  totalClients: number;
  totalUsers: number;
  totalActiveUsers: number;
  totalStudies: number;
  totalPendingStudies: number;
  totalDrugs: number;
  totalActiveDrugs: number;
  clients: Client[];
  recentActivity: Activity[];
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [showWizard, setShowWizard] = useState(false);
  const [createdCreds, setCreatedCreds] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    totalClients: 0,
    totalUsers: 0,
    totalActiveUsers: 0,
    totalStudies: 0,
    totalPendingStudies: 0,
    totalDrugs: 0,
    totalActiveDrugs: 0,
    clients: [],
    recentActivity: [],
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("auth_token") || localStorage.getItem("token");

      if (!token) {
        console.error("No token found");
        setLoading(false);
        return;
      }

      const headers = {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      };

      const response = await fetch(`${API_CONFIG.BASE_URL}/organizations/summary`, {
        headers,
      });

      if (response.ok) {
        const data = await response.json();
        setDashboardData(data);
      } else {
        console.error("Failed to fetch dashboard data:", response.status);
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleOnboardingSuccess = (data: any) => {
    setCreatedCreds(data);
    fetchDashboardData(); // Refresh data after new client onboarding
  };

  const closeWizard = () => {
    setShowWizard(false);
    setCreatedCreds(null);
  };

  return (
    <PermissionGate
      resource="dashboard"
      action="read"
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-xl text-gray-500">Access Denied</div>
        </div>
      }
    >
      <div className="bg-gray-50 min-h-screen">
        {/* Header Section */}
        <div className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  CRM Dashboard
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                  Welcome back, {user?.firstName || "Admin"}. Here's an overview of your ecosystem.
                </p>
              </div>
              <button
                onClick={() => setShowWizard(true)}
                className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
              >
                <PlusIcon className="w-5 h-5" />
                Onboard New Client
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
          {/* Stats Overview */}
          <CRMDashboardStats
            stats={{
              totalClients: dashboardData.totalClients,
              totalUsers: dashboardData.totalUsers,
              totalActiveUsers: dashboardData.totalActiveUsers,
              totalStudies: dashboardData.totalStudies,
              totalPendingStudies: dashboardData.totalPendingStudies,
              totalDrugs: dashboardData.totalDrugs,
              totalActiveDrugs: dashboardData.totalActiveDrugs,
            }}
            loading={loading}
          />

          {/* Clients Table */}
          <ClientsTable
            clients={dashboardData.clients}
            loading={loading}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
          />

          {/* Activity Feed */}
          <ActivityFeed
            activities={dashboardData.recentActivity}
            loading={loading}
          />
        </div>
      </div>

      {/* Onboarding Wizard Modal */}
      {showWizard && !createdCreds && (
        <OnboardingWizard
          onClose={closeWizard}
          onSuccess={handleOnboardingSuccess}
        />
      )}

      {/* Success Modal for New Client */}
      {createdCreds && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-green-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h2 className="text-xl font-bold mb-2">Client Onboarded!</h2>
              <p className="text-gray-600 mb-4">
                Please save these credentials securely.
              </p>

              <div className="bg-gray-50 p-4 rounded-lg text-left mb-6">
                <p className="text-xs font-semibold text-gray-500 uppercase">
                  Database ID
                </p>
                <p className="font-mono text-sm mb-3 break-all">
                  {createdCreds.organization?.id || createdCreds.databaseId}
                </p>

                <p className="text-xs font-semibold text-gray-500 uppercase">
                  Admin Email
                </p>
                <p className="font-medium text-sm mb-3">
                  {createdCreds.adminUser?.email || createdCreds.adminEmail}
                </p>

                {createdCreds.adminUser?.password && (
                  <>
                    <p className="text-xs font-semibold text-gray-500 uppercase">
                      Password
                    </p>
                    <p className="font-mono text-sm bg-white border p-2 rounded break-all">
                      {createdCreds.adminUser.password}
                    </p>
                  </>
                )}
              </div>

              <div className="flex justify-end">
                <button
                  onClick={closeWizard}
                  className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </PermissionGate>
  );
}
