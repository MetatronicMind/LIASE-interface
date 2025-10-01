"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/components/PermissionProvider";

export default function UserPermissionsDebugPage() {
  const { user, isAuthenticated } = useAuth();
  const { hasPermission, hasRole, isAdmin, isSuperAdmin } = usePermissions();
  const [debugInfo, setDebugInfo] = useState<any>({});

  useEffect(() => {
    if (typeof window !== 'undefined' && isAuthenticated && user) {
      const permissions = {
        // Core permissions
        'dashboard:read': hasPermission('dashboard', 'read'),
        'users:read': hasPermission('users', 'read'),
        'users:write': hasPermission('users', 'write'),
        'users:delete': hasPermission('users', 'delete'),
        'roles:read': hasPermission('roles', 'read'),
        'roles:write': hasPermission('roles', 'write'),
        'roles:delete': hasPermission('roles', 'delete'),
        'drugs:read': hasPermission('drugs', 'read'),
        'drugs:write': hasPermission('drugs', 'write'),
        'drugs:delete': hasPermission('drugs', 'delete'),
        'studies:read': hasPermission('studies', 'read'),
        'studies:write': hasPermission('studies', 'write'),
        'studies:delete': hasPermission('studies', 'delete'),
        'audit:read': hasPermission('audit', 'read'),
        'audit:write': hasPermission('audit', 'write'),
        'settings:read': hasPermission('settings', 'read'),
        'settings:write': hasPermission('settings', 'write'),
        'organizations:read': hasPermission('organizations', 'read'),
        'organizations:write': hasPermission('organizations', 'write'),
        'organizations:delete': hasPermission('organizations', 'delete'),
        // CRITICAL: Reports permission for Full Report access
        'reports:read': hasPermission('reports', 'read'),
        'reports:write': hasPermission('reports', 'write'),
        'reports:delete': hasPermission('reports', 'delete'),
      };

      const roleChecks = {
        'isAdmin': isAdmin(),
        'isSuperAdmin': isSuperAdmin(),
        'hasRole:admin': hasRole('admin'),
        'hasRole:superadmin': hasRole('superadmin'),
        'hasRole:medical_examiner': hasRole('medical_examiner'),
        'hasRole:data_entry': hasRole('data_entry'),
        'hasRole:sponsor_auditor': hasRole('sponsor_auditor'),
      };

      const navigationAccess = {
        'Dashboard': true, // Always accessible
        'Drug Management': hasPermission('drugs', 'read') && isSuperAdmin(),
        'Triage': hasPermission('studies', 'read') && isAdmin(),
        'Data Entry': hasPermission('studies', 'write'),
        'Full Report': hasPermission('reports', 'read'), // This is the key one!
        'Audit Trail': hasPermission('audit', 'read'),
        'User Management': hasPermission('users', 'read'),
        'Settings': hasPermission('settings', 'read'),
      };

      setDebugInfo({
        permissions,
        roleChecks,
        navigationAccess,
        timestamp: new Date().toISOString()
      });
    }
  }, [user, isAuthenticated, hasPermission, hasRole, isAdmin, isSuperAdmin]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-8 text-red-600">Not Authenticated</h1>
          <p>Please log in to view your permissions.</p>
        </div>
      </div>
    );
  }

  const canAccessFullReport = hasPermission('reports', 'read');

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">User Permissions Debug</h1>
        
        <div className="grid gap-6">
          {/* Full Report Access Status */}
          <div className={`rounded-lg shadow p-6 ${canAccessFullReport ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              {canAccessFullReport ? '✅' : '❌'} Full Report Access
            </h2>
            {canAccessFullReport ? (
              <div>
                <p className="text-green-800 font-medium">🎉 You have access to the Full Report functionality!</p>
                <p className="text-green-700 mt-2">You should see "Full Report" in your dashboard navigation menu.</p>
              </div>
            ) : (
              <div>
                <p className="text-red-800 font-medium">❌ You do not have access to the Full Report functionality.</p>
                <p className="text-red-700 mt-2">You need the 'reports:read' permission to access this feature.</p>
                <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded">
                  <p className="font-medium text-yellow-800">To fix this:</p>
                  <ol className="list-decimal list-inside mt-2 text-yellow-700">
                    <li>Contact your administrator</li>
                    <li>Request the 'medical_examiner' role OR</li>
                    <li>Request 'reports' permission to be added to your current role</li>
                  </ol>
                </div>
              </div>
            )}
          </div>

          {/* Current User Info */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Current User Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p><strong>Username:</strong> {(user as any)?.username || 'N/A'}</p>
                <p><strong>Email:</strong> {user?.email || 'N/A'}</p>
                <p><strong>Role:</strong> {user?.role || 'N/A'}</p>
                <p><strong>Role Display Name:</strong> {(user as any)?.roleDisplayName || 'N/A'}</p>
              </div>
              <div>
                <p><strong>Organization ID:</strong> {(user as any)?.organizationId || 'N/A'}</p>
                <p><strong>User ID:</strong> {user?.id || 'N/A'}</p>
                <p><strong>Is Active:</strong> {(user as any)?.isActive ? 'Yes' : 'No'}</p>
                <p><strong>First Name:</strong> {(user as any)?.firstName || 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* Navigation Access */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Dashboard Navigation Access</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(debugInfo.navigationAccess || {}).map(([page, hasAccess]) => (
                <div key={page} className={`p-3 rounded border ${hasAccess ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                  <div className="flex items-center">
                    <span className="mr-2">{hasAccess ? '✅' : '❌'}</span>
                    <span className={`text-sm font-medium ${hasAccess ? 'text-green-800' : 'text-red-800'}`}>
                      {page}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Role Checks */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Role Checks</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {Object.entries(debugInfo.roleChecks || {}).map(([check, result]) => (
                <div key={check} className={`p-3 rounded border ${result ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                  <div className="flex items-center">
                    <span className="mr-2">{result ? '✅' : '❌'}</span>
                    <span className={`text-sm ${result ? 'text-green-800' : 'text-gray-700'}`}>
                      {check}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Permission Details */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Detailed Permissions</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
              {Object.entries(debugInfo.permissions || {}).map(([permission, hasIt]) => (
                <div key={permission} className={`p-2 rounded ${hasIt ? 'bg-green-50 text-green-800' : 'bg-gray-50 text-gray-600'}`}>
                  <span className="mr-2">{hasIt ? '✅' : '❌'}</span>
                  {permission}
                </div>
              ))}
            </div>
          </div>

          {/* Raw User Data */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Raw User Data</h2>
            <pre className="bg-gray-100 p-4 rounded text-xs overflow-auto">
              {JSON.stringify(user, null, 2)}
            </pre>
          </div>

          {/* Raw Debug Info */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Debug Information</h2>
            <pre className="bg-gray-100 p-4 rounded text-xs overflow-auto">
              {JSON.stringify(debugInfo, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}