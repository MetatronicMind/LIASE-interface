"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PlusIcon, PencilIcon, TrashIcon, ShieldCheckIcon } from "@heroicons/react/24/solid";
import { roleService } from "@/services/roleService";
import { usePermissions } from "@/components/PermissionProvider";

interface Role {
  id: string;
  name: string;
  displayName: string;
  description: string;
  permissions: Record<string, any>;
  isSystemRole: boolean;
  isActive: boolean;
  createdAt: string;
}

export default function RoleManagementTab() {
  const router = useRouter();
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { hasPermission } = usePermissions();

  const canWrite = hasPermission('roles', 'write');
  const canDelete = false;

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    try {
      const data = await roleService.getRoles();
      setRoles(data);
      setError(null);
    } catch (err: any) {
      console.error('Role fetch error:', err);
      setError(err.message || 'Failed to fetch roles');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRole = async (roleId: string, roleName: string) => {
    if (!canDelete) {
      alert("You don't have permission to delete roles");
      return;
    }

    if (!confirm(`Are you sure you want to delete the role "${roleName}"?`)) {
      return;
    }

    try {
      await roleService.deleteRole(roleId);
      await fetchRoles();
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to delete role');
    }
  };

  const navigateToFullRoleManagement = () => {
    router.push('/dashboard/user-management/role-management');
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading roles...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ShieldCheckIcon className="w-7 h-7 text-blue-600" />
            Role Management
          </h2>
          <p className="text-gray-600 mt-1">Manage user roles and permissions</p>
        </div>
        {canWrite && (
          <button
            onClick={navigateToFullRoleManagement}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2.5 rounded-lg shadow transition flex items-center gap-2"
          >
            <PlusIcon className="w-5 h-5" />
            Manage Roles
          </button>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Roles List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {roles.map((role) => (
          <div
            key={role.id}
            className="bg-white border border-gray-200 rounded-lg p-5 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <ShieldCheckIcon className={`w-6 h-6 ${role.isSystemRole ? 'text-purple-600' : 'text-blue-600'}`} />
                <h3 className="font-bold text-gray-900">{role.displayName}</h3>
              </div>
              {role.isSystemRole && (
                <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full font-semibold">
                  System
                </span>
              )}
            </div>

            <p className="text-sm text-gray-600 mb-4">{role.description}</p>

            <div className="flex items-center justify-between pt-3 border-t border-gray-100">
              <span className={`text-xs font-semibold ${role.isActive ? 'text-green-600' : 'text-gray-400'}`}>
                {role.isActive ? 'Active' : 'Inactive'}
              </span>

              {!role.isSystemRole && (
                <div className="flex gap-2">
                  {canWrite && (
                    <button
                      onClick={navigateToFullRoleManagement}
                      className="text-blue-600 hover:text-blue-800 p-1"
                      title="Edit role"
                    >
                      <PencilIcon className="w-4 h-4" />
                    </button>
                  )}
                  {canDelete && (
                    <button
                      onClick={() => handleDeleteRole(role.id, role.displayName)}
                      className="text-red-600 hover:text-red-800 p-1"
                      title="Delete role"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {roles.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <ShieldCheckIcon className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <p>No roles found</p>
        </div>
      )}
    </div>
  );
}
