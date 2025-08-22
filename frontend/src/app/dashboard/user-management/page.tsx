"use client";
import { PencilIcon, TrashIcon, UserCircleIcon } from "@heroicons/react/24/solid";
import { useRouter } from "next/navigation";

const users = [
  { id: 1, username: "admin", name: "System Administrator", role: "Admin", lastLogin: "01-Dec-2024", isCurrent: true },
  { id: 2, username: "pv_user1", name: "John Smith", role: "Pharmacovigilance", lastLogin: "01-Dec-2024" },
  { id: 3, username: "pv_user2", name: "Sarah Johnson", role: "Pharmacovigilance", lastLogin: "01-Dec-2024" },
  { id: 4, username: "auditor", name: "Michael Brown", role: "Sponsor/Auditor", lastLogin: "30-Nov-2024" },
];

const roleColors: Record<string, string> = {
  Admin: "bg-blue-100 text-blue-700",
  Pharmacovigilance: "bg-blue-50 text-blue-700",
  "Sponsor/Auditor": "bg-blue-50 text-blue-700",
};

export default function UserManagementPage() {
  const router = useRouter();
  const handleAddUser = () => {
    router.push("/dashboard/user-management/add-user");
  };
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-2 sm:px-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
          <div>
            <h1 className="text-4xl font-black text-gray-900 mb-1 tracking-wider drop-shadow-sm">User Management</h1>
            <div className="text-gray-600 text-base font-medium">Manage user accounts and access privileges</div>
          </div>
          <button
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2 rounded-lg shadow transition flex items-center gap-2 self-start sm:self-auto"
            onClick={handleAddUser}
          >
            + Add New User
          </button>
        </div>
        <div className="bg-white rounded-xl shadow border border-blue-100 p-0">
          <div className="px-6 pt-6 pb-2 text-lg font-bold text-blue-900">System Users ({users.length})</div>
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
                        {user.isCurrent && (
                          <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-600 text-white">Current User</span>
                        )}
                      </span>
                    </td>
                    <td className="py-3 px-4 align-top text-gray-900 whitespace-nowrap">{user.name}</td>
                    <td className="py-3 px-4 align-top whitespace-nowrap">
                      <span className={`px-3 py-1 rounded text-xs font-semibold ${roleColors[user.role] || "bg-gray-100 text-gray-700"}`}>{user.role}</span>
                    </td>
                    <td className="py-3 px-4 align-top text-gray-700 whitespace-nowrap">{user.lastLogin}</td>
                    <td className="py-3 px-4 align-top">
                      <div className="flex gap-2">
                        <button className="bg-gray-100 hover:bg-blue-100 text-blue-700 p-2 rounded transition" title="Edit">
                          <PencilIcon className="w-4 h-4" />
                        </button>
                        <button className="bg-red-100 hover:bg-red-200 text-red-600 p-2 rounded transition" title="Delete">
                          <TrashIcon className="w-4 h-4" />
                        </button>
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
