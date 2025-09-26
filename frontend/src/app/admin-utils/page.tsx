"use client";
import { useState } from 'react';

export default function AdminUtilsPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runMigration = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('http://localhost:8000/api/migrate/migrate-admin-permissions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      if (response.ok) {
        setResult(`Migration completed successfully! Updated ${data.result.updated} admin users.`);
      } else {
        setError(data.error || 'Migration failed');
      }
    } catch (err: any) {
      setError(err.message || 'Network error during migration');
    } finally {
      setLoading(false);
    }
  };

  const testPermissions = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('http://localhost:8000/api/roles', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      if (response.ok) {
        alert(`Roles API Test: SUCCESS\nFound ${data.roles?.length || data.length} roles`);
      } else {
        alert(`Roles API Test: FAILED\nStatus: ${response.status}\nError: ${data.error}`);
      }
    } catch (err: any) {
      alert(`Roles API Test: ERROR\n${err.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Admin Utilities</h1>
        
        {/* Migration Section */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Fix Admin Permissions</h2>
          <p className="text-gray-600 mb-4">
            This will update all admin users to have the correct role permissions, including roles:read and roles:write.
          </p>
          
          <div className="flex gap-4 mb-4">
            <button
              onClick={runMigration}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded disabled:opacity-50"
            >
              {loading ? 'Running Migration...' : 'Fix Admin Permissions'}
            </button>
            
            <button
              onClick={testPermissions}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded"
            >
              Test Roles API
            </button>
          </div>

          {result && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
              {result}
            </div>
          )}

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}
        </div>

        {/* Current User Info */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Current User Info</h2>
          <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
            {JSON.stringify(
              typeof window !== 'undefined' 
                ? JSON.parse(localStorage.getItem('auth_user') || '{}') 
                : {}, 
              null, 
              2
            )}
          </pre>
        </div>

        {/* Navigation */}
        <div className="mt-6 flex gap-4">
          <button
            onClick={() => window.location.href = '/dashboard/user-management'}
            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded"
          >
            Back to User Management
          </button>
          
          <button
            onClick={() => window.location.href = '/dashboard/role-management'}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
          >
            Go to Role Management
          </button>
        </div>
      </div>
    </div>
  );
}