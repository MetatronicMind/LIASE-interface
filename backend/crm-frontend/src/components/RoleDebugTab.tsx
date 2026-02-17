"use client";
import { useState } from "react";
import { TrashIcon, ArrowPathIcon, ExclamationTriangleIcon } from "@heroicons/react/24/solid";
import { roleService, type Role } from "@/services/roleService";
import { formatDateTime } from "@/utils/dateTimeFormatter";

interface DebugTabProps {
  roles: Role[];
  onRolesChange: () => void;
  onError: (error: string) => void;
}

export default function RoleDebugTab({ roles, onRolesChange, onError }: DebugTabProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [isForceDeleting, setIsForceDeleting] = useState(false);
  const [isInspecting, setIsInspecting] = useState(false);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showForceDeleteConfirm, setShowForceDeleteConfirm] = useState(false);
  const [inspectionData, setInspectionData] = useState<any>(null);

  const handleSelectRole = (roleId: string) => {
    setSelectedRoles(prev => 
      prev.includes(roleId) 
        ? prev.filter(id => id !== roleId)
        : [...prev, roleId]
    );
  };

  const handleSelectAll = () => {
    const customRoles = roles.filter(role => !role.isSystemRole);
    setSelectedRoles(
      selectedRoles.length === customRoles.length 
        ? [] 
        : customRoles.map(role => role.id)
    );
  };

  const handleFetchAllRoles = async () => {
    setIsFetching(true);
    try {
      await onRolesChange();
      onError('');
    } catch (error: any) {
      onError(error.message || 'Failed to fetch roles');
    } finally {
      setIsFetching(false);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedRoles.length === 0) return;
    
    setIsDeleting(true);
    const errors: string[] = [];

    try {
      for (const roleId of selectedRoles) {
        try {
          await roleService.deleteRole(roleId);
        } catch (error: any) {
          const role = roles.find(r => r.id === roleId);
          errors.push(`Failed to delete ${role?.displayName || roleId}: ${error.message}`);
        }
      }

      if (errors.length === 0) {
        onError('');
      } else {
        onError(`Some deletions failed: ${errors.join('; ')}`);
      }

      setSelectedRoles([]);
      await onRolesChange();
    } catch (error: any) {
      onError(error.message || 'Failed to delete roles');
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleDeleteAll = async () => {
    const customRoles = roles.filter(role => !role.isSystemRole);
    if (customRoles.length === 0) return;

    setIsDeleting(true);
    const errors: string[] = [];

    try {
      for (const role of customRoles) {
        try {
          await roleService.deleteRole(role.id);
        } catch (error: any) {
          errors.push(`Failed to delete ${role.displayName}: ${error.message}`);
        }
      }

      if (errors.length === 0) {
        onError('');
      } else {
        onError(`Some deletions failed: ${errors.join('; ')}`);
      }

      await onRolesChange();
    } catch (error: any) {
      onError(error.message || 'Failed to delete all roles');
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleForceDeleteAll = async () => {
    setIsForceDeleting(true);
    
    try {
      const result = await roleService.forceDeleteAllRoles();
      
      if (result.errors.length === 0) {
        onError('');
        alert(`✅ Successfully deleted all ${result.summary.successfullyDeleted} roles!`);
      } else {
        onError(`Partial success: ${result.summary.successfullyDeleted} deleted, ${result.summary.failed} failed`);
        console.error('Delete errors:', result.errors);
      }

      await onRolesChange();
    } catch (error: any) {
      onError(error.message || 'Failed to force delete all roles');
    } finally {
      setIsForceDeleting(false);
      setShowForceDeleteConfirm(false);
    }
  };

  const handleInspectDatabase = async () => {
    setIsInspecting(true);
    
    try {
      const data = await roleService.inspectDatabase();
      setInspectionData(data);
      onError('');
      console.log('Database inspection data:', data);
    } catch (error: any) {
      onError(error.message || 'Failed to inspect database');
    } finally {
      setIsInspecting(false);
    }
  };

  const handleTestCreateRole = async () => {
    try {
      const result = await roleService.testCreateRole();
      if (result.success) {
        onError('');
        alert(`✅ Test role created successfully! ID: ${result.role.id}`);
        await onRolesChange();
      } else {
        onError(`Test role creation failed: ${result.message}`);
      }
    } catch (error: any) {
      onError(error.message || 'Failed to test role creation');
    }
  };

  const customRoles = roles.filter(role => !role.isSystemRole);
  const systemRoles = roles.filter(role => role.isSystemRole);

  return (
    <div className="space-y-6">
      {/* Action Bar */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600" />
          <h3 className="text-lg font-semibold text-yellow-800">Debug Operations</h3>
        </div>
        <p className="text-sm text-yellow-700 mb-4">
          These operations are for debugging and administrative purposes. Use with caution.
        </p>
        
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleFetchAllRoles}
            disabled={isFetching}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition"
          >
            <ArrowPathIcon className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
            {isFetching ? 'Refreshing...' : 'Refresh All Roles'}
          </button>

          <button
            onClick={handleInspectDatabase}
            disabled={isInspecting}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-lg transition"
          >
            <ArrowPathIcon className={`w-4 h-4 ${isInspecting ? 'animate-spin' : ''}`} />
            {isInspecting ? 'Inspecting...' : '🔍 Inspect Database'}
          </button>

          <button
            onClick={handleTestCreateRole}
            className="flex items-center gap-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition"
          >
            <ArrowPathIcon className="w-4 h-4" />
            🧪 Test Role Creation
          </button>

          <button
            onClick={() => setShowDeleteConfirm(true)}
            disabled={isDeleting || customRoles.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-lg transition"
          >
            <TrashIcon className="w-4 h-4" />
            {isDeleting ? 'Deleting...' : `Delete All Custom Roles (${customRoles.length})`}
          </button>

          <button
            onClick={() => setShowForceDeleteConfirm(true)}
            disabled={isForceDeleting || roles.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white rounded-lg transition"
          >
            <TrashIcon className="w-4 h-4" />
            {isForceDeleting ? 'Force Deleting...' : `🚨 FORCE DELETE ALL ROLES (${roles.length})`}
          </button>

          {selectedRoles.length > 0 && (
            <button
              onClick={handleDeleteSelected}
              disabled={isDeleting}
              className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-orange-400 text-white rounded-lg transition"
            >
              <TrashIcon className="w-4 h-4" />
              Delete Selected ({selectedRoles.length})
            </button>
          )}
        </div>
      </div>

      {/* Role Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-semibold text-blue-900">Total Roles</h4>
          <p className="text-2xl font-bold text-blue-700">{roles.length}</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h4 className="font-semibold text-green-900">System Roles</h4>
          <p className="text-2xl font-bold text-green-700">{systemRoles.length}</p>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <h4 className="font-semibold text-purple-900">Custom Roles</h4>
          <p className="text-2xl font-bold text-purple-700">{customRoles.length}</p>
        </div>
      </div>

      {/* Database Inspection Results */}
      {inspectionData && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h4 className="text-lg font-semibold text-gray-900">🔍 Database Inspection Results</h4>
            <p className="text-sm text-gray-600">Raw data from the database for your organization</p>
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <h5 className="font-semibold text-blue-900 text-sm">Total Items</h5>
                <p className="text-xl font-bold text-blue-700">{inspectionData.summary.totalItems}</p>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <h5 className="font-semibold text-green-900 text-sm">Total Roles</h5>
                <p className="text-xl font-bold text-green-700">{inspectionData.summary.totalRoles}</p>
              </div>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <h5 className="font-semibold text-yellow-900 text-sm">Entity Types</h5>
                <p className="text-xl font-bold text-yellow-700">{inspectionData.summary.itemsByType.length}</p>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <h5 className="font-semibold text-red-900 text-sm">Conflicts Found</h5>
                <p className="text-xl font-bold text-red-700">
                  {Object.values(inspectionData.conflictingIds).filter((items: any) => items.length > 0).length}
                </p>
              </div>
            </div>

            {/* All Roles (including inactive) */}
            {inspectionData.allRoles.length > 0 && (
              <div className="mb-6">
                <h5 className="font-semibold text-gray-900 mb-3">All Roles (including inactive):</h5>
                <div className="bg-gray-50 rounded-lg p-4 max-h-60 overflow-y-auto">
                  {inspectionData.allRoles.map((role: any, index: number) => (
                    <div key={index} className="flex justify-between items-center py-2 border-b border-gray-200 last:border-b-0">
                      <span className="font-mono text-sm">
                        {role.name} ({role.id.substring(0, 8)}...)
                      </span>
                      <div className="flex gap-2">
                        <span className={`px-2 py-1 rounded text-xs ${role.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {role.isActive ? 'Active' : 'Inactive'}
                        </span>
                        {role.isSystemRole && (
                          <span className="px-2 py-1 rounded text-xs bg-blue-100 text-blue-800">System</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Conflicting IDs */}
            {Object.entries(inspectionData.conflictingIds).some(([_, items]: [string, any]) => items.length > 0) && (
              <div className="mb-6">
                <h5 className="font-semibold text-red-900 mb-3">⚠️ Conflicting IDs Found:</h5>
                <div className="bg-red-50 rounded-lg p-4">
                  {Object.entries(inspectionData.conflictingIds).map(([id, items]: [string, any]) => (
                    items.length > 0 && (
                      <div key={id} className="mb-2">
                        <p className="font-mono text-sm font-semibold text-red-800">ID: {id}</p>
                        {items.map((item: any, index: number) => (
                          <p key={index} className="ml-4 text-sm text-red-700">
                            Type: {item.type}, Name: {item.name || item.username || 'N/A'}
                          </p>
                        ))}
                      </div>
                    )
                  ))}
                </div>
              </div>
            )}

            {/* Items by Type */}
            <div>
              <h5 className="font-semibold text-gray-900 mb-3">Items by Type:</h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {inspectionData.summary.itemsByType.map((typeInfo: any) => (
                  <div key={typeInfo.type} className="bg-gray-50 rounded-lg p-3">
                    <h6 className="font-semibold text-gray-800">{typeInfo.type}</h6>
                    <p className="text-2xl font-bold text-gray-700">{typeInfo.count} items</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <button
                onClick={() => setInspectionData(null)}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
              >
                Clear Results
              </button>
              <button
                onClick={() => console.log('Full inspection data:', inspectionData)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                Log Full Data to Console
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Roles Table */}
      {customRoles.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-semibold text-gray-900">Custom Roles</h4>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedRoles.length === customRoles.length}
                  onChange={handleSelectAll}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Select All</span>
              </label>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="py-3 px-4 text-left font-semibold">Select</th>
                  <th className="py-3 px-4 text-left font-semibold">Role</th>
                  <th className="py-3 px-4 text-left font-semibold">Description</th>
                  <th className="py-3 px-4 text-left font-semibold">Permissions</th>
                  <th className="py-3 px-4 text-left font-semibold">Created</th>
                  <th className="py-3 px-4 text-left font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {customRoles.map((role) => (
                  <tr key={role.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-4 px-4">
                      <input
                        type="checkbox"
                        checked={selectedRoles.includes(role.id)}
                        onChange={() => handleSelectRole(role.id)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                    </td>
                    <td className="py-4 px-4">
                      <div className="font-semibold text-gray-900">{role.displayName}</div>
                      <div className="text-sm text-gray-500 font-mono">{role.name}</div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="text-sm text-gray-600 max-w-xs truncate">
                        {role.description || 'No description'}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="text-xs text-gray-500">
                        {Object.keys(role.permissions || {}).length} resources
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="text-xs text-gray-500">
                        {formatDateTime(role.createdAt)}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <button
                        onClick={() => roleService.deleteRole(role.id).then(onRolesChange)}
                        disabled={isDeleting}
                        className="p-2 text-red-600 hover:bg-red-50 rounded transition disabled:opacity-50"
                        title="Delete Role"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* System Roles Info */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h4 className="font-semibold text-gray-900 mb-2">System Roles</h4>
        <p className="text-sm text-gray-600 mb-3">
          System roles cannot be deleted and are managed by the application.
        </p>
        <div className="space-y-2">
          {systemRoles.map((role) => (
            <div key={role.id} className="flex items-center justify-between bg-white p-3 rounded border">
              <div>
                <div className="font-medium text-gray-900">{role.displayName}</div>
                <div className="text-sm text-gray-500">{role.description}</div>
              </div>
              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-semibold">
                System
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-[95vw] w-full">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <ExclamationTriangleIcon className="w-8 h-8 text-red-600" />
                <h3 className="text-lg font-semibold text-gray-900">Confirm Deletion</h3>
              </div>
              
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete all {customRoles.length} custom roles? 
                This action cannot be undone and may affect users with these roles.
              </p>
              
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAll}
                  disabled={isDeleting}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-red-400 transition"
                >
                  {isDeleting ? 'Deleting...' : 'Delete All'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Force Delete Confirmation Modal */}
      {showForceDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-[95vw] w-full">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <ExclamationTriangleIcon className="w-8 h-8 text-purple-600" />
                <h3 className="text-lg font-semibold text-gray-900">⚠️ FORCE DELETE ALL ROLES</h3>
              </div>
              
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <p className="text-red-800 font-semibold mb-2">DANGEROUS OPERATION!</p>
                <p className="text-red-700 text-sm">
                  This will PERMANENTLY delete ALL {roles.length} roles (including system roles) 
                  from the database. This action:
                </p>
                <ul className="text-red-700 text-sm mt-2 list-disc list-inside">
                  <li>Cannot be undone</li>
                  <li>Will break user access</li>
                  <li>Requires system role recreation</li>
                  <li>Should only be used to fix database conflicts</li>
                </ul>
              </div>
              
              <p className="text-gray-600 mb-6">
                Type "DELETE ALL ROLES" to confirm this destructive operation:
              </p>

              <input
                type="text"
                placeholder="Type: DELETE ALL ROLES"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-4"
                onChange={(e) => {
                  const button = document.getElementById('force-delete-button') as HTMLButtonElement;
                  if (button) {
                    button.disabled = e.target.value !== 'DELETE ALL ROLES' || isForceDeleting;
                  }
                }}
              />
              
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowForceDeleteConfirm(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  id="force-delete-button"
                  onClick={handleForceDeleteAll}
                  disabled={true}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-purple-400 transition"
                >
                  {isForceDeleting ? 'Force Deleting...' : '🚨 FORCE DELETE ALL'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}