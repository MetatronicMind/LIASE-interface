"use client";
import { useState } from "react";
import {
  PencilIcon,
  TrashIcon,
  XMarkIcon,
} from "@heroicons/react/24/solid";

// Dummy sections for permissions
const sections = [
  {
    key: "dashboard",
    label: "Dashboard",
    children: [
      { key: "viewDashboard", label: "View Dashboard" },
      { key: "editDashboard", label: "Edit Dashboard" },
    ],
  },
  {
    key: "reports",
    label: "Reports",
    children: [
      { key: "viewReports", label: "View Reports" },
      { key: "downloadReports", label: "Download Reports" },
    ],
  },
];

type Permissions = Record<string, boolean>;

type User = {
  id: number;
  username: string;
  name: string;
  role: string;
  lastLogin: string;
  isCurrent: boolean;
  permissions: Permissions;
};

type UserForm = Omit<User, "id"> & { id?: number };

const initialUsers: Omit<User, "permissions">[] = [
  { id: 1, username: "admin", name: "System Administrator", role: "Admin", lastLogin: "01-Dec-2024", isCurrent: true },
  { id: 2, username: "pv_user1", name: "John Smith", role: "Pharmacovigilance", lastLogin: "01-Dec-2024", isCurrent: false },
  { id: 3, username: "pv_user2", name: "Sarah Johnson", role: "Pharmacovigilance", lastLogin: "01-Dec-2024", isCurrent: false },
  { id: 4, username: "auditor", name: "Michael Brown", role: "Sponsor/Auditor", lastLogin: "30-Nov-2024", isCurrent: false },
  { id: 5, username: "user5", name: "Emily Davis", role: "Pharmacovigilance", lastLogin: "29-Nov-2024", isCurrent: false },
  { id: 6, username: "user6", name: "David Lee", role: "Sponsor/Auditor", lastLogin: "28-Nov-2024", isCurrent: false },
  { id: 7, username: "user7", name: "Sophia Martinez", role: "Admin", lastLogin: "27-Nov-2024", isCurrent: false },
  { id: 8, username: "user8", name: "James Wilson", role: "Pharmacovigilance", lastLogin: "26-Nov-2024", isCurrent: false },
  { id: 9, username: "user9", name: "Olivia Brown", role: "Sponsor/Auditor", lastLogin: "25-Nov-2024", isCurrent: false },
  { id: 10, username: "user10", name: "Liam Miller", role: "Admin", lastLogin: "24-Nov-2024", isCurrent: false },
  { id: 11, username: "user11", name: "Ava Anderson", role: "Pharmacovigilance", lastLogin: "23-Nov-2024", isCurrent: false },
  { id: 12, username: "user12", name: "William Thomas", role: "Sponsor/Auditor", lastLogin: "22-Nov-2024", isCurrent: false },
  { id: 13, username: "user13", name: "Mia Jackson", role: "Admin", lastLogin: "21-Nov-2024", isCurrent: false },
  { id: 14, username: "user14", name: "Benjamin White", role: "Pharmacovigilance", lastLogin: "20-Nov-2024", isCurrent: false },
  { id: 15, username: "user15", name: "Charlotte Harris", role: "Sponsor/Auditor", lastLogin: "19-Nov-2024", isCurrent: false },
  { id: 16, username: "user16", name: "Elijah Martin", role: "Admin", lastLogin: "18-Nov-2024", isCurrent: false },
  { id: 17, username: "user17", name: "Amelia Thompson", role: "Pharmacovigilance", lastLogin: "17-Nov-2024", isCurrent: false },
  { id: 18, username: "user18", name: "Lucas Garcia", role: "Sponsor/Auditor", lastLogin: "16-Nov-2024", isCurrent: false },
  { id: 19, username: "user19", name: "Harper Martinez", role: "Admin", lastLogin: "15-Nov-2024", isCurrent: false },
  { id: 20, username: "user20", name: "Evelyn Robinson", role: "Pharmacovigilance", lastLogin: "14-Nov-2024", isCurrent: false },
];

const defaultRoles = ["Admin", "Pharmacovigilance", "Sponsor/Auditor"];

const roleColors: Record<string, string> = {
  Admin: "bg-purple-100 text-purple-800",
  Pharmacovigilance: "bg-green-100 text-green-800",
  "Sponsor/Auditor": "bg-blue-100 text-blue-800",
};

export default function UserManagementPage() {
  function buildInitialPermissions() {
    const perms: Permissions = {};
    sections.forEach((section) => {
      perms[section.key] = true;
      if (section.children) {
        section.children.forEach((child) => {
          perms[child.key] = true;
        });
      }
    });
    return perms;
  }

  const [roles, setRoles] = useState<string[]>([...defaultRoles]);
  const [users, setUsers] = useState<User[]>(
    initialUsers.map((u) => ({ ...u, permissions: buildInitialPermissions() }))
  );

  const [modalOpen, setModalOpen] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [form, setForm] = useState<UserForm>({
    id: undefined,
    username: "",
    name: "",
    role: roles[0],
    lastLogin: new Date().toISOString().slice(0, 10),
    isCurrent: false,
    permissions: buildInitialPermissions(),
  });
  const [newRole, setNewRole] = useState("");

  // Search and Pagination
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const pageSizeOptions = [10, 25, 50, 100];
  // Filter users by search
  const filteredUsers = users.filter((u) => {
    const q = search.toLowerCase();
    return (
      u.username.toLowerCase().includes(q) ||
      u.name.toLowerCase().includes(q) ||
      u.role.toLowerCase().includes(q)
    );
  });
  const totalPages = Math.ceil(filteredUsers.length / pageSize);
  const paginatedUsers = filteredUsers.slice((page - 1) * pageSize, page * pageSize);

  const openAddModal = () => {
    setForm({
      id: undefined,
      username: "",
      name: "",
      role: roles[0] || "",
      lastLogin: new Date().toISOString().slice(0, 10),
      isCurrent: false,
      permissions: buildInitialPermissions(),
    });
    setEditUser(null);
    setModalOpen(true);
  };

  const openEditModal = (user: User) => {
    setForm({ ...user });
    setEditUser(user);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditUser(null);
  };

  const handleFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    if (type === "checkbox") {
      setForm((prev) => ({
        ...prev,
        [name]: (e.target as HTMLInputElement).checked,
      }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handlePermissionChange = (key: string, parentKey?: string) => {
    setForm((prev) => {
      const newPerms = { ...prev.permissions };
      newPerms[key] = !newPerms[key];
      if (
        parentKey === undefined &&
        sections.find((s) => s.key === key)?.children
      ) {
        const children = sections.find((s) => s.key === key)?.children || [];
        if (!newPerms[key]) {
          children.forEach((child) => {
            newPerms[child.key] = false;
          });
        }
      }
      if (parentKey && !newPerms[parentKey]) {
        newPerms[parentKey] = true;
      }
      return { ...prev, permissions: newPerms };
    });
  };

  const handleAddRole = (e: React.FormEvent) => {
    e.preventDefault();
    if (newRole.trim() && !roles.includes(newRole.trim())) {
      setRoles([...roles, newRole.trim()]);
      setForm((prev) => ({ ...prev, role: newRole.trim() }));
      setNewRole("");
    }
  };

  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (editUser && form.id !== undefined) {
      setUsers((prev) =>
        prev.map((u) => (u.id === form.id ? { ...u, ...form, id: form.id } : u))
      );
    } else {
      const newId = Math.max(0, ...users.map((u) => u.id)) + 1;
      setUsers((prev) => [
        ...prev,
        { ...form, id: newId, lastLogin: new Date().toISOString().slice(0, 10) },
      ]);
    }
    closeModal();
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen text-blue-900">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
        <h1 className="text-2xl font-semibold text-blue-900">User Management</h1>
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center w-full sm:w-auto">
          <input
            type="text"
            value={search}
            onChange={e => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by username, name, or role"
            className="border border-blue-400 rounded px-3 py-2 text-blue-900 placeholder-blue-400 bg-blue-50 focus:border-blue-600 focus:ring-2 focus:ring-blue-200 transition w-full sm:w-64"
          />
          <button
            onClick={openAddModal}
            className="bg-blue-700 text-white px-4 py-2 rounded-md hover:bg-blue-800 whitespace-nowrap"
          >
            <span className="text-lg">+</span> Add User
          </button>
        </div>
      </div>

      {/* Users table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-blue-100 text-blue-800 uppercase text-xs font-semibold">
            <tr>
              <th className="px-4 py-2 text-left">Username</th>
              <th className="px-4 py-2 text-left">Name</th>
              <th className="px-4 py-2 text-left">Role</th>
              <th className="px-4 py-2 text-left">Last Login</th>
              <th className="px-4 py-2 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {paginatedUsers.map((user) => (
              <tr key={user.id} className="hover:bg-blue-50">
                <td className="px-4 py-2">{user.username}</td>
                <td className="px-4 py-2">{user.name}</td>
                <td className="px-4 py-2">
                  <span
                    className={`px-2 py-1 text-xs rounded-full ${
                      roleColors[user.role] || "bg-blue-50 text-blue-800"
                    }`}
                  >
                    {user.role}
                  </span>
                </td>
                <td className="px-4 py-2">{user.lastLogin}</td>
                <td className="px-4 py-2 flex justify-center space-x-2">
                  <button
                    onClick={() => openEditModal(user)}
                    className="text-blue-700 hover:text-blue-900"
                  >
                    <PencilIcon className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() =>
                      setUsers((prev) => prev.filter((u) => u.id !== user.id))
                    }
                    className="text-red-700 hover:text-red-900"
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 bg-blue-50">
          <div className="flex items-center space-x-4">
            <span className="text-sm text-blue-800 font-semibold">Total Users: {filteredUsers.length}</span>
            <div className="flex items-center space-x-2">
              <label className="text-sm text-blue-800">Page size:</label>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="border border-blue-400 rounded px-2 py-1 text-sm text-blue-900 focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
              >
                {[10, 25, 50, 100].map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex items-center space-x-2 text-blue-800">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              className="px-2 py-1 border border-blue-600 text-blue-700 rounded disabled:opacity-50 hover:bg-blue-50"
            >
              Prev
            </button>
            <span className="text-sm">
              Page {page} of {totalPages}
            </span>
            <button
              disabled={page === totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="px-2 py-1 border border-blue-600 text-blue-700 rounded disabled:opacity-50 hover:bg-blue-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl relative">
            <button
              onClick={closeModal}
              className="absolute top-2 right-2 text-blue-600 hover:text-blue-800"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
            <div className="p-6 text-blue-900">
              <h2 className="text-lg font-semibold mb-4">
                {editUser ? "Edit User" : "Add User"}
              </h2>
              <form onSubmit={handleFormSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-blue-800 font-medium mb-1">Username</label>
                    <input
                      name="username"
                      value={form.username}
                      onChange={handleFormChange}
                      required
                      placeholder="Enter username"
                      className="w-full border border-blue-400 rounded px-2 py-2 text-blue-900 placeholder-blue-400 bg-blue-50 focus:border-blue-600 focus:ring-2 focus:ring-blue-200 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-blue-800 font-medium mb-1">Full Name</label>
                    <input
                      name="name"
                      value={form.name}
                      onChange={handleFormChange}
                      required
                      placeholder="Enter full name"
                      className="w-full border border-blue-400 rounded px-2 py-2 text-blue-900 placeholder-blue-400 bg-blue-50 focus:border-blue-600 focus:ring-2 focus:ring-blue-200 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-blue-800 font-medium mb-1">Role</label>
                    <select
                      name="role"
                      value={form.role}
                      onChange={handleFormChange}
                      className="w-full border border-blue-400 rounded px-2 py-2 text-blue-900 bg-blue-50 focus:border-blue-600 focus:ring-2 focus:ring-blue-200 transition"
                    >
                      <option value="" disabled>Select role</option>
                      {roles.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Add new role */}
                <div className="flex items-center space-x-2 mt-2">
                  <input
                    type="text"
                    placeholder="Add new role (e.g. Reviewer)"
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                    className="border border-blue-400 rounded px-2 py-2 flex-1 text-blue-900 placeholder-blue-400 bg-blue-50 focus:border-blue-600 focus:ring-2 focus:ring-blue-200 transition"
                  />
                  <button
                    onClick={handleAddRole}
                    className="bg-gradient-to-r from-blue-600 to-blue-800 text-white px-4 py-2 rounded shadow hover:from-blue-700 hover:to-blue-900 font-semibold transition"
                  >
                    Add
                  </button>
                </div>

                {/* Permissions */}
                <div className="mt-6">
                  <h3 className="text-sm font-semibold mb-2 text-blue-800">Permissions</h3>
                  <div className="space-y-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
                    {sections.map((section, idx) => (
                      <div key={section.key} className="mb-2">
                        <label className="flex items-center space-x-2 font-medium text-blue-900">
                          <input
                            type="checkbox"
                            checked={form.permissions[section.key] || false}
                            onChange={() => handlePermissionChange(section.key)}
                            className="text-blue-600 focus:ring-blue-600 accent-blue-700"
                          />
                          <span>{section.label}</span>
                        </label>
                        {section.children && (
                          <div className="ml-8 mt-2 space-y-1">
                            {section.children.map((child) => (
                              <label
                                key={child.key}
                                className="flex items-center space-x-2 text-blue-800"
                              >
                                <input
                                  type="checkbox"
                                  checked={form.permissions[child.key] || false}
                                  onChange={() => handlePermissionChange(child.key, section.key)}
                                  className="text-blue-600 focus:ring-blue-600 accent-blue-700"
                                />
                                <span className="text-sm">{child.label}</span>
                              </label>
                            ))}
                          </div>
                        )}
                        {idx !== sections.length - 1 && <div className="border-t border-blue-200 mt-4 pt-2" />}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end space-x-2 mt-6 border-t border-blue-200 pt-4">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-4 py-2 border border-blue-600 text-blue-700 rounded hover:bg-blue-50 font-semibold transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-gradient-to-r from-blue-600 to-blue-800 text-white px-6 py-2 rounded shadow hover:from-blue-700 hover:to-blue-900 font-bold transition"
                  >
                    {editUser ? "Update" : "Add"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
