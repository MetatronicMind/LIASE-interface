"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { getApiBaseUrl } from "@/config/api";
import {
  ChartPieIcon,
  BuildingOfficeIcon,
  Cog6ToothIcon,
  WrenchScrewdriverIcon,
  ServerStackIcon,
  ArrowLeftIcon,
  UsersIcon,
  ClipboardDocumentListIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";

export default function ClientDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const pathname = usePathname();
  const clientId = params.clientId as string;
  const [clientName, setClientName] = useState("Loading...");

  useEffect(() => {
    // Fetch client name for the header
    const fetchClient = async () => {
      try {
        const token = localStorage.getItem("auth_token");
        // We might need a specific endpoint for single org, or filter list
        // Assuming /organizations/:id or similar.
        // If not available, we fall back to generic "Client" or fetch all.
        const response = await fetch(`${getApiBaseUrl()}/organizations`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          const data = await response.json();
          const client = data.find((c: any) => c.id === clientId);
          if (client) setClientName(client.name);
          else setClientName("Client Not Found");
        }
      } catch (e) {
        console.error(e);
        setClientName("Client");
      }
    };
    if (clientId) fetchClient();
  }, [clientId]);

  const tabs = [
    {
      name: "Overview",
      href: `/dashboard/clients/${clientId}`,
      icon: ChartPieIcon,
      exact: true,
    },
    {
      name: "Organization",
      href: `/dashboard/clients/${clientId}/organization`,
      icon: BuildingOfficeIcon,
      exact: false,
    },
    {
      name: "Roles",
      href: `/dashboard/clients/${clientId}/roles`,
      icon: ShieldCheckIcon,
      exact: false,
    },
    {
      name: "Settings",
      href: `/dashboard/clients/${clientId}/settings`,
      icon: Cog6ToothIcon,
      exact: false,
    },
    {
      name: "Users",
      href: `/dashboard/clients/${clientId}/users`,
      icon: UsersIcon,
      exact: false,
    },
    {
      name: "Requests",
      href: `/dashboard/clients/${clientId}/requests`,
      icon: ClipboardDocumentListIcon,
      exact: false,
    },
    {
      name: "Services",
      href: `/dashboard/clients/${clientId}/services`,
      icon: ServerStackIcon,
      exact: false,
    },
    {
      name: "Tools",
      href: `/dashboard/clients/${clientId}/tools`,
      icon: WrenchScrewdriverIcon,
      exact: false,
    },
  ];

  const isActive = (path: string, exact: boolean = false) => {
    if (exact) return pathname === path;
    return pathname.startsWith(path);
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-4 py-4 sm:px-6 sticky top-0 z-10">
        <div className="flex items-center space-x-4 mb-4">
          <Link
            href="/dashboard/clients"
            className="p-2 rounded-full hover:bg-gray-100 text-gray-500 transition-colors"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{clientName}</h1>
            <p className="text-sm text-gray-500">Client Management Portal</p>
          </div>
        </div>

        <div className="flex space-x-1 overflow-x-auto pb-1">
          {tabs.map((tab) => {
            const active = isActive(tab.href, tab.exact);
            return (
              <Link
                key={tab.name}
                href={tab.href}
                className={`flex items-center px-4 py-2 text-sm font-medium rounded-md whitespace-nowrap transition-colors ${active
                  ? "bg-indigo-50 text-indigo-700"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                  }`}
              >
                <tab.icon
                  className={`h-5 w-5 mr-2 ${active ? "text-indigo-500" : "text-gray-400"}`}
                />
                {tab.name}
              </Link>
            );
          })}
        </div>
      </div>

      <div className="flex-1 p-4 sm:p-6 overflow-y-auto w-full max-w-7xl mx-auto">
        {children}
      </div>
    </div>
  );
}
