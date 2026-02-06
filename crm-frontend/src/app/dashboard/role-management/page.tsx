"use client";
import { useState, useEffect } from "react";
import { PencilIcon, TrashIcon, PlusIcon, XMarkIcon } from "@heroicons/react/24/solid";
import { getApiBaseUrl } from '@/config/api';

interface Permission {
  read: boolean;
  write: boolean;
  delete?: boolean;
}

interface Role {
  id: string;
  name: string;
  displayName: string;
  description: string;
  permissions: Record<string, Permission>;
  isSystemRole: boolean;
  isActive: boolean;
  createdAt: string;
}

export default function RoleManagementPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    try {
      const { roleService } = await import('@/services/roleService');
      const data = await roleService.getRoles();
      setRoles(data);
      setError(null);
    } catch (err: any) {
      console.error('Roles fetch error:', err);
      setError(err.message || 'Failed to fetch roles');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRole = async (roleId: string, roleName: string) => {
    if (!confirm(`Are you sure you want to delete the role "${roleName}"?`)) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${getApiBaseUrl()}/roles/${roleId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        await fetchRoles();
        setError(null);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to delete role');
      }
    } catch (err) {
      setError('Network error while deleting role');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-2 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading roles...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-2 sm:px-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
          <div>
            <h1 className="text-4xl font-black text-gray-900 mb-1 tracking-wider drop-shadow-sm">Role Management</h1>
            <div className="text-gray-600 text-base font-medium">Manage user roles and permissions</div>
          </div>
          <button
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2 rounded-lg shadow transition flex items-center gap-2 self-start sm:self-auto"
          >
            <PlusIcon className="w-5 h-5" />
            Create New Role
          </button>
        </div>

        {error && (
          <div className="mb-6 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <div className="bg-white rounded-xl shadow border border-blue-100 p-0">
          <div className="px-6 pt-6 pb-2 text-lg font-bold text-blue-900">System Roles ({roles.length})</div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm border border-blue-100 rounded-lg">
              <thead>
                <tr className="bg-blue-50 text-blue-900">
                  <th className="py-3 px-4 text-left font-semibold whitespace-nowrap">Role Name</th>
                  <th className="py-3 px-4 text-left font-semibold whitespace-nowrap">Description</th>
                  <th className="py-3 px-4 text-left font-semibold whitespace-nowrap">Type</th>
                  <th className="py-3 px-4 text-left font-semibold whitespace-nowrap">Permissions</th>
                  <th className="py-3 px-4 text-left font-semibold whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody>
                {roles.map((role) => (
                  <tr key={role.id} className="border-t border-blue-100 hover:bg-blue-50 transition">
                    <td className="py-3 px-4 align-top">
                      <div className="font-bold text-gray-900">{role.displayName}</div>
                      <div className="text-xs text-gray-500 font-mono">{role.name}</div>
                    </td>
                    <td className="py-3 px-4 align-top text-gray-700 max-w-xs">
                      <div className="truncate" title={role.description}>
                        {role.description || 'No description'}
                      </div>
                    </td>
                    <td className="py-3 px-4 align-top">
                      <span className={`px-3 py-1 rounded text-xs font-semibold ${
                        role.isSystemRole 
                          ? 'bg-purple-100 text-purple-700' 
                          : 'bg-green-100 text-green-700'
                      }`}>
                        {role.isSystemRole ? 'System' : 'Custom'}
                      </span>
                    </td>
                    <td className="py-3 px-4 align-top">
                      <div className="flex flex-wrap gap-1">
                        {Object.entries(role.permissions).map(([resource, perms]) => {
                          const hasAnyPermission = Object.values(perms).some(Boolean);
                          if (!hasAnyPermission) return null;
                          
                          return (
                            <span 
                              key={resource}
                              className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs"
                              title={`${resource}: ${Object.entries(perms).filter(([_, v]) => v).map(([k]) => k).join(', ')}`}
                            >
                              {resource}
                            </span>
                          );
                        })}
                      </div>
                    </td>
                    <td className="py-3 px-4 align-top">
                      <div className="flex gap-2">
                        <button 
                          className="bg-gray-100 hover:bg-blue-100 text-blue-700 p-2 rounded transition" 
                          title="Edit"
                        >
                          <PencilIcon className="w-4 h-4" />
                        </button>
                        {!role.isSystemRole && (
                          <button 
                            onClick={() => handleDeleteRole(role.id, role.displayName)}
                            className="bg-red-100 hover:bg-red-200 text-red-600 p-2 rounded transition" 
                            title="Delete"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}