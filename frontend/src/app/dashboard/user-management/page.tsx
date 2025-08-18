"use client";
export default function UserManagementPage() {
  const users = [
    { id: 1, name: "Dr. Alice Smith", username: "alice", role: "Pharmacovigilance", lastLogin: "15-Aug-2025" },
    { id: 2, name: "Bob Johnson", username: "bob", role: "Admin", lastLogin: "12-Aug-2025" },
    { id: 3, name: "Carol Lee", username: "carol", role: "Sponsor/Auditor", lastLogin: "10-Aug-2025" },
    { id: 4, name: "David Kim", username: "david", role: "Pharmacovigilance", lastLogin: "09-Aug-2025" },
  ];
  return (
    <div className="bg-white rounded-3xl shadow-2xl border border-blue-100 p-4 sm:p-8 md:p-12 w-full max-w-4xl mx-auto">
      <h1 className="text-3xl font-black text-primary mb-4 tracking-wider drop-shadow-sm text-center">User Management</h1>
      <p className="text-lg text-gray-600 mb-8 text-center">Manage user privileges and access here.</p>
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-blue-100 rounded-lg">
          <thead>
            <tr className="bg-blue-50">
              <th className="py-2 px-3 text-left text-xs font-semibold text-gray-700 uppercase">Name</th>
              <th className="py-2 px-3 text-left text-xs font-semibold text-gray-700 uppercase">Username</th>
              <th className="py-2 px-3 text-left text-xs font-semibold text-gray-700 uppercase">Role</th>
              <th className="py-2 px-3 text-left text-xs font-semibold text-gray-700 uppercase">Last Login</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-t border-blue-100 hover:bg-blue-50 transition">
                <td className="py-2 px-3 text-sm text-gray-900 whitespace-nowrap">{user.name}</td>
                <td className="py-2 px-3 text-sm text-gray-700 whitespace-nowrap">{user.username}</td>
                <td className="py-2 px-3 text-sm text-primary font-semibold whitespace-nowrap">{user.role}</td>
                <td className="py-2 px-3 text-sm text-gray-500 whitespace-nowrap">{user.lastLogin}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
