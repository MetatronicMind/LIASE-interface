"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import {
  BriefcaseIcon,
  MagnifyingGlassIcon,
  UserGroupIcon,
  CalendarDaysIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";
import { getApiBaseUrl } from "@/config/api";

interface Organization {
  id: string; // This is the databaseId or generic Id
  name: string;
  contactEmail: string;
  plan: string;
  createdAt: string;
  userCount?: number;
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch(`${getApiBaseUrl()}/organizations`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setClients(data);
      }
    } catch (error) {
      console.error("Failed to fetch clients", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredClients = clients.filter((client) =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Clients</h1>
            <p className="mt-2 text-sm text-gray-600">
              Manage client accounts, services, and configurations.
            </p>
          </div>
          <div className="mt-4 md:mt-0 flex space-x-3">
            {/* Add a button here if we want to create new client, but let's stick to list first */}
          </div>
        </div>

        {/* Search */}
        <div className="bg-white p-4 rounded-lg shadow-sm mb-6 flex items-center border border-gray-200">
          <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 mr-2" />
          <input
            type="text"
            placeholder="Search clients..."
            className="flex-1 outline-none text-gray-700"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="flex justify-center p-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredClients.map((client) => (
              <Link
                key={client.id}
                href={`/dashboard/clients/${client.id}`}
                className="block group"
              >
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow h-full flex flex-col">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-indigo-50 rounded-lg">
                      <BriefcaseIcon className="h-6 w-6 text-indigo-600" />
                    </div>
                    <span
                      className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        client.plan === "Enterprise"
                          ? "bg-purple-100 text-purple-800"
                          : client.plan === "Pro"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {client.plan || "Free"}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-gray-900 group-hover:text-indigo-600 transition-colors mb-1">
                    {client.name}
                  </h3>
                  <p className="text-sm text-gray-500 mb-4 truncate">
                    {client.contactEmail}
                  </p>

                  <div className="mt-auto space-y-2 pt-4 border-t border-gray-100">
                    <div className="flex items-center text-sm text-gray-600">
                      <UserGroupIcon className="h-4 w-4 mr-2" />
                      {client.userCount || 0} Users
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <CalendarDaysIcon className="h-4 w-4 mr-2" />
                      {new Date(client.createdAt).toLocaleDateString()}
                    </div>
                  </div>

                  <div className="mt-4 flex items-center text-sm font-medium text-indigo-600">
                    Manage Client
                    <ChevronRightIcon className="h-4 w-4 ml-1" />
                  </div>
                </div>
              </Link>
            ))}

            {filteredClients.length === 0 && (
              <div className="col-span-full text-center py-12 text-gray-500">
                No clients found matching your search.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
