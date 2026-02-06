"use client";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeftIcon, ShieldCheckIcon } from "@heroicons/react/24/solid";
import { PermissionGate } from "@/components/PermissionProvider";
import { roleService } from "@/services/roleService";

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

interface PermissionStructure {
  [key: string]: {
    displayName: string;
    description: string;
    actions: {
      [key: string]: string;
    };
  };
}

export default function EditRolePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const roleId = searchParams.get('id');

  const [role, setRole] = useState<Role | null>(null);
  const [permissionStructure, setPermissionStructure] = useState<PermissionStructure>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    displayName: '',
    description: '',
    permissions: {} as Record<string, Record<string, boolean>>
  });

  useEffect(() => {
    if (!roleId) {
      setError('Role ID is required');
      setLoading(false);
      return;
    }
    
    fetchRoleAndPermissions();
  }, [roleId]);

  const fetchRoleAndPermissions = async () => {
    try {
      const [roleResponse, permissionStructureResponse] = await Promise.all([
        roleService.getRole(roleId!),
        roleService.getPermissionStructure()
      ]);

      const roleData = (roleResponse as any).role || roleResponse;
      setRole(roleData);
      setPermissionStructure(permissionStructureResponse);
      
      // Convert role permissions to form format
      const formPermissions: Record<string, Record<string, boolean>> = {};
      Object.keys(permissionStructureResponse).forEach(resource => {
        formPermissions[resource] = {};
        Object.keys(permissionStructureResponse[resource].actions).forEach(action => {
          formPermissions[resource][action] = roleData.permissions?.[resource]?.[action] === true;
        });
      });

      setFormData({
        displayName: roleData.displayName || '',
        description: roleData.description || '',
        permissions: formPermissions
      });
      
      setError(null);
    } catch (err: any) {
      console.error('Error fetching data:', err);
      setError(err.message || 'Failed to fetch role data');
    } finally {
      setLoading(false);
    }
  };

  const handlePermissionChange = (resource: string, action: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [resource]: {
          ...prev.permissions[resource],
          [action]: checked
        }
      }
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!roleId || !role) {
      setError('Role ID is required');
      return;
    }

    // System roles cannot be edited
    if (role.isSystemRole) {
      setError('System roles cannot be modified');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      // Convert form permissions back to the expected format
      const permissionsToSave: Record<string, Record<string, boolean>> = {};
      Object.keys(formData.permissions).forEach(resource => {
        const resourcePermissions = formData.permissions[resource];
        permissionsToSave[resource] = {};
        Object.keys(resourcePermissions).forEach(action => {
          permissionsToSave[resource][action] = resourcePermissions[action];
        });
      });

      await roleService.updateRole(roleId, {
        displayName: formData.displayName,
        description: formData.description,
        permissions: permissionsToSave
      });
      
      router.push('/dashboard/user-management/role-management');
    } catch (err: any) {
      setError(err.message || 'Failed to update role');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-2 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading role data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!roleId || !role) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-2 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Role Not Found</h1>
            <button
              onClick={() => router.push('/dashboard/user-management/role-management')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
            >
              Back to Role Management
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-2 sm:px-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/dashboard/user-management/role-management')}
            className="flex items-center text-blue-600 hover:text-blue-700 mb-4"
          >
            <ChevronLeftIcon className="w-5 h-5 mr-1" />
            Back to Role Management
          </button>
          <h1 className="text-4xl font-black text-gray-900 mb-1 tracking-wider drop-shadow-sm">
            Edit Role
          </h1>
          <div className="text-gray-600 text-base font-medium">
            Modify role details and permissions
          </div>
        </div>

        {/* Warning for system roles */}
        {role.isSystemRole && (
          <div className="mb-6 bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded flex items-center">
            <ShieldCheckIcon className="w-5 h-5 mr-2" />
            <span>
              <strong>System Role:</strong> This is a system-managed role and cannot be modified.
            </span>
          </div>
        )}

        {/* Form */}
        <div className="bg-white rounded-xl shadow border border-blue-100 p-6">
          {error && (
            <div className="mb-6 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Role Name (Internal)
              </label>
              <input
                type="text"
                value={role.name}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600"
                placeholder="Role name cannot be changed"
              />
              <p className="text-sm text-gray-500 mt-1">
                Role names cannot be modified after creation
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Display Name *
              </label>
              <input
                type="text"
                required
                disabled={role.isSystemRole}
                value={formData.displayName}
                onChange={(e) => setFormData(prev => ({ ...prev, displayName: e.target.value }))}
                className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  role.isSystemRole ? 'bg-gray-100 text-gray-600' : ''
                }`}
                placeholder="Enter display name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                disabled={role.isSystemRole}
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  role.isSystemRole ? 'bg-gray-100 text-gray-600' : ''
                }`}
                rows={3}
                placeholder="Describe what this role is for..."
              />
            </div>

            {/* Permissions */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Module Access & Permissions</h3>
              <p className="text-sm text-gray-600 mb-4">
                First enable access to a module, then configure specific permissions. Disabling a module will hide it from the user's navigation.
              </p>
              <div className="space-y-6">
                {Object.entries(permissionStructure).map(([resource, config]) => {
                  // Check if this module has any permission enabled
                  const hasAnyPermission = Object.keys(config.actions).some(
                    action => formData.permissions[resource]?.[action] === true
                  );
                  
                  return (
                    <div key={resource} className={`border rounded-lg p-4 transition-all ${
                      hasAnyPermission ? 'border-blue-300 bg-blue-50' : 'border-gray-200 bg-white'
                    }`}>
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{config.displayName}</h4>
                          <p className="text-sm text-gray-600">{config.description}</p>
                        </div>
                        <div className="ml-4">
                          <label className="flex items-center space-x-2 cursor-pointer bg-white px-3 py-2 rounded-lg border-2 border-gray-300 hover:border-blue-400 transition">
                            <input
                              type="checkbox"
                              disabled={role.isSystemRole}
                              checked={hasAnyPermission}
                              onChange={(e) => {
                                const isChecked = e.target.checked;
                                // If enabling, turn on 'read' permission by default
                                // If disabling, turn off all permissions
                                const updatedPermissions = { ...formData.permissions[resource] };
                                Object.keys(config.actions).forEach(action => {
                                  if (isChecked) {
                                    // Enable 'read' by default, keep others as they were
                                    if (action === 'read') {
                                      updatedPermissions[action] = true;
                                    }
                                  } else {
                                    // Disable all permissions
                                    updatedPermissions[action] = false;
                                  }
                                });
                                
                                setFormData(prev => ({
                                  ...prev,
                                  permissions: {
                                    ...prev.permissions,
                                    [resource]: updatedPermissions
                                  }
                                }));
                              }}
                              className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <span className="text-sm font-semibold text-gray-700">
                              {hasAnyPermission ? '✓ Enabled' : 'Disabled'}
                            </span>
                          </label>
                        </div>
                      </div>
                      
                      {/* Show detailed permissions only if module is enabled */}
                      {hasAnyPermission && (
                        <div className="mt-4 pt-4 border-t border-blue-200">
                          <p className="text-xs font-semibold text-gray-700 mb-3 uppercase tracking-wide">Detailed Permissions:</p>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {Object.entries(config.actions).map(([action, label]) => (
                              <label key={action} className="flex items-center space-x-2 cursor-pointer bg-white px-3 py-2 rounded border border-gray-200 hover:border-blue-300 transition">
                                <input
                                  type="checkbox"
                                  disabled={role.isSystemRole}
                                  checked={formData.permissions[resource]?.[action] || false}
                                  onChange={(e) => handlePermissionChange(resource, action, e.target.checked)}
                                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                />
                                <span className="text-sm text-gray-700">{label}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {!hasAnyPermission && (
                        <div className="mt-3 text-xs text-gray-500 italic">
                          Enable this module to configure detailed permissions
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-4 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={() => router.push('/dashboard/user-management/role-management')}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                disabled={saving}
              >
                Cancel
              </button>
              {!role.isSystemRole && (
                <PermissionGate resource="roles" action="write">
                  <button
                    type="submit"
                    disabled={saving}
                    className={`px-6 py-2 rounded-lg text-white transition ${
                      saving
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-700'
                    }`}
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </PermissionGate>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}