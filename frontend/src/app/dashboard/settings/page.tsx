"use client";
import { useState } from "react";
import {
  ArrowsRightLeftIcon,
  QueueListIcon,
} from "@heroicons/react/24/outline";
import { usePermissions } from "@/components/PermissionProvider";
import dynamic from "next/dynamic";

// Dynamically import components to avoid SSR issues
const WorkflowSettingsTab = dynamic(
  () => import("@/components/settings/WorkflowSettingsTab"),
  { ssr: false },
);
const TriageConfigTab = dynamic(
  () => import("@/components/settings/TriageConfigTab"),
  { ssr: false },
);
const DrugConfigTab = dynamic(
  () => import("@/components/settings/DrugConfigTab"),
  { ssr: false },
);
const RoleManagementTab = dynamic(
  () => import("@/components/settings/RoleManagementTab"),
  { ssr: false },
);

type TabName = "workflow" | "triage-config" | "drug-config" | "roles";

interface Tab {
  id: TabName;
  name: string;
  icon: React.ReactNode;
  requiredPermission?: { resource: string; action: string };
  requireAdmin?: boolean;
  requireSuperAdmin?: boolean;
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabName>("workflow");
  const { hasPermission, isAdmin, isSuperAdmin } = usePermissions();

  const tabs: Tab[] = [
    {
      id: "roles",
      name: "Role Management",
      icon: <span className="w-5 h-5">🛡️</span>,
      requiredPermission: { resource: "roles", action: "read" },
    },
    {
      id: "workflow",
      name: "Workflow",
      icon: <ArrowsRightLeftIcon className="w-5 h-5" />,
      requiredPermission: { resource: "settings", action: "viewWorkflow" },
    },
    {
      id: "triage-config",
      name: "Triage Settings",
      icon: <QueueListIcon className="w-5 h-5" />,
      requiredPermission: { resource: "settings", action: "viewTriageConfig" },
    },
    {
      id: "drug-config",
      name: "Days Available",
      icon: <span className="w-5 h-5">📅</span>,
      // Using admin config permission for now, or we can make it accessible to admins
      requiredPermission: { resource: "settings", action: "viewAdminConfig" },
    },
  ];

  // Filter tabs based on permissions
  const visibleTabs = tabs.filter((tab) => {
    if (tab.requireSuperAdmin && !isSuperAdmin()) return false;
    if (tab.requireAdmin && !isAdmin()) return false;
    if (tab.requiredPermission) {
      return hasPermission(
        tab.requiredPermission.resource,
        tab.requiredPermission.action,
      );
    }
    return true;
  });

  // Set first visible tab as active if current tab is not visible
  if (visibleTabs.length > 0 && !visibleTabs.find((t) => t.id === activeTab)) {
    setActiveTab(visibleTabs[0].id);
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case "roles":
        return <RoleManagementTab />;
      case "workflow":
        return <WorkflowSettingsTab />;
      case "triage-config":
        return <TriageConfigTab />;
      case "drug-config":
        return <DrugConfigTab />;
      default:
        return (
          <div className="p-8 text-center text-gray-500">
            Select a tab to view settings
          </div>
        );
    }
  };

  if (visibleTabs.length === 0) {
    return (
      <div className="bg-white rounded-3xl shadow-2xl border border-blue-100 p-12 w-full max-w-4xl mx-auto text-center">
        <h1 className="text-3xl font-black text-primary mb-4 tracking-wider drop-shadow-sm">
          Settings
        </h1>
        <p className="text-lg text-gray-600 mb-8">
          You don't have permission to access any settings.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-black text-gray-900 mb-2 tracking-wider drop-shadow-sm">
            Settings
          </h1>
          <p className="text-gray-600 text-lg">
            Manage system configuration, roles, and organization settings
          </p>
        </div>

        {/* Tabs Navigation */}
        <div className="bg-white rounded-t-2xl shadow-lg border-b border-gray-200">
          <div className="flex overflow-x-auto">
            {visibleTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-4 font-semibold transition-all whitespace-nowrap ${activeTab === tab.id
                  ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  }`}
              >
                {tab.icon}
                <span>{tab.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-b-2xl shadow-lg p-6">
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
}
