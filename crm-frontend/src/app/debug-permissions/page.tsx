"use client";
import { useEffect, useState } from 'react';
import { usePermissions } from '@/components/PermissionProvider';
import { getApiBaseUrl } from '@/config/api';

export default function PermissionsDebugPage() {
  const [debugInfo, setDebugInfo] = useState<any>({});
  const [user, setUser] = useState<any>(null);
  const { hasPermission, hasRole, isAdmin, isSuperAdmin } = usePermissions();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const userStr = localStorage.getItem('auth_user');
        const userObj = userStr ? JSON.parse(userStr) : null;
        setUser(userObj);

        const permissions = {
          'users:read': hasPermission('users', 'read'),
          'users:write': hasPermission('users', 'write'),
          'users:delete': hasPermission('users', 'delete'),
          'roles:read': hasPermission('roles', 'read'),
          'roles:write': hasPermission('roles', 'write'),
          'roles:delete': hasPermission('roles', 'delete'),
        };

        const roles = {
          'isAdmin': isAdmin(),
          'isSuperAdmin': isSuperAdmin(),
          'hasAdminRole': hasRole('admin'),
          'hasSuperAdminRole': hasRole('superadmin'),
        };

        setDebugInfo({
          permissions,
          roles,
          userRole: userObj?.role,
          organizationId: userObj?.organizationId
        });
      } catch (error) {
        console.error('Error loading debug info:', error);
      }
    }
  }, [hasPermission, hasRole, isAdmin, isSuperAdmin]);

  const handleTestAPI = async (endpoint: string) => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${getApiBaseUrl()}${endpoint}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      alert(`${endpoint} Response: ${response.status}\n${JSON.stringify(data, null, 2)}`);
    } catch (error) {
      alert(`${endpoint} Error: ${error}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Permissions Debug</h1>
        
        <div className="grid gap-6">
          {/* User Info */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Current User</h2>
            <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
              {JSON.stringify(user, null, 2)}
            </pre>
          </div>

          {/* Permission Checks */}  
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Permission Checks</h2>
            <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
              {JSON.stringify(debugInfo, null, 2)}
            </pre>
          </div>

          {/* API Tests */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">API Tests</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <button
                onClick={() => handleTestAPI('/users')}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
              >
                Test /users
              </button>
              
              <button
                onClick={() => handleTestAPI('/roles')}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
              >
                Test /roles
              </button>
              
              <button
                onClick={() => handleTestAPI('/health')}
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded"
              >
                Test /health
              </button>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex gap-4">
            <button
              onClick={() => window.location.href = '/dashboard/user-management'}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
            >
              Back to User Management
            </button>
            
            <button
              onClick={() => window.location.href = '/debug-auth'}
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded"
            >
              Auth Debug
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}