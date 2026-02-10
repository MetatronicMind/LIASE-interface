"use client";
import { useState, useEffect } from "react";
import {
  BuildingOfficeIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  CheckCircleIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";
import { getApiBaseUrl } from "@/config/api";
import OnboardingWizard from "@/components/OnboardingWizard";

interface Organization {
  id: string; // This is the databaseId
  name: string;
  contactEmail: string;
  plan: string;
  createdAt: string;
  userCount?: number;
  industry?: string;
  settings?: any;
}

export default function OrganizationsPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showWizard, setShowWizard] = useState(false);
  const [createdCreds, setCreatedCreds] = useState<any>(null);

  useEffect(() => {
    fetchOrganizations();
  }, []);

  const fetchOrganizations = async () => {
    setError(null);
    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch(`${getApiBaseUrl()}/organizations`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setOrganizations(data);
      } else {
        if (response.status === 403) {
          setError(
            "You do not have permission to view organizations. Super Admin role required.",
          );
        } else {
          setError(`Failed to load organizations (${response.status})`);
        }
      }
    } catch (error) {
      console.error("Failed to fetch organizations", error);
      setError("Network error. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  const handleOnboardingSuccess = (data: any) => {
    setCreatedCreds(data);
    fetchOrganizations();
  };

  const closeWizard = () => {
    setShowWizard(false);
    setCreatedCreds(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-black text-gray-900 mb-2">
              Organizations
            </h1>
            <p className="text-gray-600">
              Onboard and manage client organizations
            </p>
          </div>
          <button
            onClick={() => setShowWizard(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            <PlusIcon className="w-5 h-5" />
            Onboard New Client
          </button>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
            <XCircleIcon className="w-5 h-5" />
            {error}
          </div>
        )}

        {/* List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading...</div>
          ) : error ? (
            <div className="p-12 text-center text-gray-500">
              Please resolve the error above to view organizations.
            </div>
          ) : organizations.length === 0 ? (
            <div className="p-12 text-center">
              <BuildingOfficeIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-gray-900">
                No organizations found
              </h3>
              <p className="text-gray-500 max-w-sm mx-auto mt-1 mb-6">
                Get started by onboarding your first client organization.
              </p>
              <button
                onClick={() => setShowWizard(true)}
                className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
              >
                <PlusIcon className="w-5 h-5" />
                Onboard Client
              </button>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Database ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Plan
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {organizations.map((org) => (
                  <tr key={org.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                      {org.id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {org.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {org.contactEmail}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">
                        {org.plan || "Standard"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(org.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Onboarding Wizard */}
      {showWizard && !createdCreds && (
        <OnboardingWizard
          onClose={closeWizard}
          onSuccess={handleOnboardingSuccess}
        />
      )}

      {/* Success Modal */}
      {createdCreds && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="text-center">
              <CheckCircleIcon className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold mb-2">Organization Created!</h2>
              <p className="text-gray-600 mb-4">
                Please save these credentials securely.
              </p>

              <div className="bg-gray-50 p-4 rounded-lg text-left mb-6">
                <p className="text-sm font-semibold text-gray-500 uppercase text-xs">
                  Database ID
                </p>
                <p className="font-mono text-lg mb-3">
                  {createdCreds.organization?.id || createdCreds.databaseId}
                </p>

                <p className="text-sm font-semibold text-gray-500 uppercase text-xs">
                  Admin Email
                </p>
                <p className="font-medium mb-3">
                  {createdCreds.adminUser?.email || createdCreds.adminEmail}
                </p>

                {createdCreds.adminUser?.password && (
                  <>
                    <p className="text-sm font-semibold text-gray-500 uppercase text-xs">
                      Password
                    </p>
                    <p className="font-mono text-lg bg-white border p-2 rounded">
                      {createdCreds.adminUser.password}
                    </p>
                  </>
                )}
              </div>

              <div className="flex justify-end">
                <button
                  onClick={closeWizard}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
