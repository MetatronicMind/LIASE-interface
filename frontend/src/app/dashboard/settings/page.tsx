"use client";
import { useState } from "react";
import { 
  ShieldCheckIcon, 
  BuildingOfficeIcon, 
  Cog6ToothIcon,
  BellIcon,
  EnvelopeIcon,
  ServerStackIcon,
  ArchiveBoxIcon,
  ArrowsRightLeftIcon
} from "@heroicons/react/24/outline";
import { usePermissions } from "@/components/PermissionProvider";
import dynamic from 'next/dynamic';

// Dynamically import components to avoid SSR issues
const RoleManagementTab = dynamic(() => import('@/components/settings/RoleManagementTab'), { ssr: false });
const OrganizationManagementTab = dynamic(() => import('@/components/settings/OrganizationManagementTab'), { ssr: false });
const AdminConfigTab = dynamic(() => import('@/components/settings/AdminConfigTab'), { ssr: false });
const NotificationsTab = dynamic(() => import('@/components/settings/NotificationsTab'), { ssr: false });
const EmailSettingsTab = dynamic(() => import('@/components/settings/EmailSettingsTab'), { ssr: false });
const SuperAdminConfigTab = dynamic(() => import('@/components/settings/SuperAdminConfigTab'), { ssr: false });
const ArchivalSettingsTab = dynamic(() => import('@/components/settings/ArchivalSettingsTab'), { ssr: false });
const WorkflowSettingsTab = dynamic(() => import('@/components/settings/WorkflowSettingsTab'), { ssr: false });
const DateTimeSettingsTab = dynamic(() => import('@/components/settings/DateTimeSettingsTab'), { ssr: false });

type TabName = 'roles' | 'organization' | 'admin-config' | 'notifications' | 'email' | 'archival' | 'super-admin' | 'workflow' | 'datetime';

interface Tab {
  id: TabName;
  name: string;
  icon: React.ReactNode;
  requiredPermission?: { resource: string; action: string };
  requireAdmin?: boolean;
  requireSuperAdmin?: boolean;
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabName>('roles');
  const { hasPermission, isAdmin, isSuperAdmin } = usePermissions();

  const tabs: Tab[] = [
        {
          id: 'datetime',
          name: 'Date/Time Settings',
          icon: <span className="w-5 h-5">🕒</span>,
          requireAdmin: true
        },
    {
      id: 'roles',
      name: 'Role Management',
      icon: <ShieldCheckIcon className="w-5 h-5" />,
      requiredPermission: { resource: 'roles', action: 'read' }
    },
    {
      id: 'organization',
      name: 'Organization',
      icon: <BuildingOfficeIcon className="w-5 h-5" />,
      requiredPermission: { resource: 'organizations', action: 'read' }
    },
    {
      id: 'workflow',
      name: 'Workflow',
      icon: <ArrowsRightLeftIcon className="w-5 h-5" />,
      requireAdmin: true
    },
    {
      id: 'notifications',
      name: 'Notifications',
      icon: <BellIcon className="w-5 h-5" />,
      requiredPermission: { resource: 'notifications', action: 'read' }
    },
    {
      id: 'email',
      name: 'Email Settings',
      icon: <EnvelopeIcon className="w-5 h-5" />,
      requiredPermission: { resource: 'email', action: 'read' }
    },
    {
      id: 'archival',
      name: 'Archival Settings',
      icon: <ArchiveBoxIcon className="w-5 h-5" />,
      requireAdmin: true
    },
    {
      id: 'admin-config',
      name: 'Admin Configuration',
      icon: <Cog6ToothIcon className="w-5 h-5" />,
      requireAdmin: true
    },
    {
      id: 'super-admin',
      name: 'System Configuration',
      icon: <ServerStackIcon className="w-5 h-5" />,
      requireSuperAdmin: true
    }
  ];

  // Filter tabs based on permissions
  const visibleTabs = tabs.filter(tab => {
    if (tab.requireSuperAdmin && !isSuperAdmin()) return false;
    if (tab.requireAdmin && !isAdmin()) return false;
    if (tab.requiredPermission) {
      return hasPermission(tab.requiredPermission.resource, tab.requiredPermission.action);
    }
    return true;
  });

  // Set first visible tab as active if current tab is not visible
  if (visibleTabs.length > 0 && !visibleTabs.find(t => t.id === activeTab)) {
    setActiveTab(visibleTabs[0].id);
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'roles':
        return <RoleManagementTab />;
      case 'organization':
        return <OrganizationManagementTab />;
      case 'workflow':
        return <WorkflowSettingsTab />;
      case 'admin-config':
        return <AdminConfigTab />;
      case 'notifications':
        return <NotificationsTab />;
      case 'email':
        return <EmailSettingsTab />;
      case 'archival':
        return <ArchivalSettingsTab />;
      case 'super-admin':
        return <SuperAdminConfigTab />;
      case 'datetime':
        return <DateTimeSettingsTab />;
      default:
        return <div className="p-8 text-center text-gray-500">Select a tab to view settings</div>;
    }
  };

  if (visibleTabs.length === 0) {
    return (
      <div className="bg-white rounded-3xl shadow-2xl border border-blue-100 p-12 w-full max-w-4xl mx-auto text-center">
        <h1 className="text-3xl font-black text-primary mb-4 tracking-wider drop-shadow-sm">Settings</h1>
        <p className="text-lg text-gray-600 mb-8">You don't have permission to access any settings.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-black text-gray-900 mb-2 tracking-wider drop-shadow-sm">Settings</h1>
          <p className="text-gray-600 text-lg">Manage system configuration, roles, and organization settings</p>
        </div>

        {/* Tabs Navigation */}
        <div className="bg-white rounded-t-2xl shadow-lg border-b border-gray-200">
          <div className="flex overflow-x-auto">
            {visibleTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-4 font-semibold transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
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
