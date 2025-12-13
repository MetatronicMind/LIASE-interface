"use client";
import { useState, useEffect } from "react";
import { PencilIcon, TrashIcon, UserCircleIcon, PlusIcon } from "@heroicons/react/24/solid";
import { useRouter } from "next/navigation";
import { PermissionGate, useConditionalPermissions } from "@/components/PermissionProvider";
import { userService, User } from "@/services/userService";
import { useDateTime } from "@/hooks/useDateTime";

const getRoleColor = (roleName: string) => {
  const colors: Record<string, string> = {
    superadmin: "bg-red-100 text-red-700",
    admin: "bg-blue-100 text-blue-700",
    pharmacovigilance: "bg-green-100 text-green-700",
    sponsor_auditor: "bg-purple-100 text-purple-700",
  };
  return colors[roleName] || "bg-gray-100 text-gray-700";
};

export default function UserManagementPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { canManageUsers, canDeleteUsers } = useConditionalPermissions();
  const { formatDate } = useDateTime();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const data = await userService.getUsers();
      setUsers(data.users);
      setError(null);
    } catch (err: any) {
      console.error('User fetch error:', err);
      
      if (err.message?.includes('Invalid token') || err.message?.includes('TOKEN_INVALID')) {
        setError('Your session has expired. Please log in again.');
        // Redirect to login after a short delay
        setTimeout(() => {
          window.location.href = '/login';
        }, 2000);
      } else {
        setError(err.message || 'Failed to fetch users');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string, username: string) => {
    // First confirmation - soft or hard delete
    const deleteType = confirm(
      `Delete user "${username}"?\n\n` +
      `Click OK for SOFT DELETE (recommended - can be recovered)\n` +
      `Click Cancel to choose PERMANENT DELETE`
    );

    let hardDelete = false;
    
    if (!deleteType) {
      // User clicked Cancel - ask if they want permanent deletion
      const confirmPermanent = confirm(
        `⚠️ PERMANENT DELETION ⚠️\n\n` +
        `This will PERMANENTLY delete "${username}" from the database.\n` +
        `This action CANNOT be undone!\n\n` +
        `Are you absolutely sure you want to permanently delete this user?`
      );
      
      if (!confirmPermanent) {
        return; // User cancelled
      }
      hardDelete = true;
    }

    try {
      await userService.deleteUser(userId, hardDelete);
      await fetchUsers();
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to delete user');
    }
  };

  const handleAddUser = () => {
    router.push("/dashboard/user-management/add-user");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-2 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading users...</p>
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
            <h1 className="text-4xl font-black text-gray-900 mb-1 tracking-wider drop-shadow-sm">User Management</h1>
            <div className="text-gray-600 text-base font-medium">Manage user accounts and access privileges</div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 self-start sm:self-auto">
            <PermissionGate resource="roles" action="read">
              <button
                className="bg-green-600 hover:bg-green-700 text-white font-bold px-5 py-2 rounded-lg shadow transition flex items-center gap-2"
                onClick={() => router.push("/dashboard/user-management/role-management")}
              >
                <UserCircleIcon className="w-5 h-5" />
                Manage Roles
              </button>
            </PermissionGate>
            <PermissionGate resource="users" action="write">
              <button
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2 rounded-lg shadow transition flex items-center gap-2"
                onClick={handleAddUser}
              >
                <PlusIcon className="w-5 h-5" />
                Add New User
              </button>
            </PermissionGate>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow border border-blue-100 p-0">
          <div className="px-6 pt-6 pb-2 text-lg font-bold text-blue-900">System Users ({users.length})</div>
          
          {error && (
            <div className="mx-6 mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded flex items-center justify-between">
              <span>{error}</span>
              <div className="flex gap-2">
                <button
                  onClick={() => {setError(null); fetchUsers();}}
                  className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm"
                >
                  Retry
                </button>
                <a
                  href="/debug-permissions"
                  className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded text-sm"
                >
                  Debug
                </a>
              </div>
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm border border-blue-100 rounded-lg">
              <thead>
                <tr className="bg-blue-50 text-blue-900">
                  <th className="py-3 px-4 text-left font-semibold whitespace-nowrap">Username</th>
                  <th className="py-3 px-4 text-left font-semibold whitespace-nowrap">Full Name</th>
                  <th className="py-3 px-4 text-left font-semibold whitespace-nowrap">Role</th>
                  <th className="py-3 px-4 text-left font-semibold whitespace-nowrap">Last Login</th>
                  <th className="py-3 px-4 text-left font-semibold whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-t border-blue-100 hover:bg-blue-50 transition">
                    <td className="py-3 px-4 align-top font-bold text-gray-900 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1">
                        <span className="font-mono">{user.username}</span>
                      </span>
                    </td>
                    <td className="py-3 px-4 align-top text-gray-900 whitespace-nowrap">
                      {user.firstName} {user.lastName}
                    </td>
                    <td className="py-3 px-4 align-top whitespace-nowrap">
                      <span className={`px-3 py-1 rounded text-xs font-semibold ${getRoleColor(user.role)}`}>
                        {user.roleDisplayName || user.role}
                      </span>
                    </td>
                    <td className="py-3 px-4 align-top text-gray-700 whitespace-nowrap">
                      {user.lastLogin ? formatDate(user.lastLogin) : 'Never'}
                    </td>
                    <td className="py-3 px-4 align-top">
                      <div className="flex gap-2">
                        <PermissionGate resource="users" action="write">
                          <button 
                            onClick={() => router.push(`/dashboard/user-management/edit-user?id=${user.id}`)}
                            className="bg-gray-100 hover:bg-blue-100 text-blue-700 p-2 rounded transition" 
                            title="Edit"
                          >
                            <PencilIcon className="w-4 h-4" />
                          </button>
                        </PermissionGate>
                        <PermissionGate resource="users" action="delete">
                          <button 
                            onClick={() => handleDeleteUser(user.id, user.username)}
                            className="bg-red-100 hover:bg-red-200 text-red-600 p-2 rounded transition" 
                            title="Delete"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </PermissionGate>
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
