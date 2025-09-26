"use client";
import { useState, ChangeEvent, FormEvent } from "react";
import { ArrowLeftIcon } from "@heroicons/react/24/solid";

const sections = [
  { key: "dashboard", label: "Dashboard" },
  { key: "studyReview", label: "Study Review" },
  { key: "drugManagement", label: "Drug Management" },
  { key: "userManagement", label: "User Management" },
  { key: "auditTrail", label: "Audit Trail" },
];

type SectionKey = typeof sections[number]["key"];
type Permissions = Record<SectionKey, boolean>;

const roles = [
  "Admin",
  "Pharmacovigilance",
  "Sponsor/Auditor",
];

export default function AddUserPage() {
  const [form, setForm] = useState<{
    username: string;
    name: string;
    role: string;
    permissions: Permissions;
  }>({
    username: "",
    name: "",
    role: roles[0],
    permissions: sections.reduce((acc, s) => {
      (acc as Permissions)[s.key as SectionKey] = false;
      return acc;
    }, {} as Permissions),
  });
  const [success, setSuccess] = useState(false);

  function handleChange(e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function handlePermissionChange(key: SectionKey) {
    setForm((prev) => ({
      ...prev,
      permissions: { ...prev.permissions, [key]: !prev.permissions[key] },
    }));
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // Here you would call your backend API to create the user
    setSuccess(true);
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-2 sm:px-6">
      <div className="max-w-xl mx-auto bg-white rounded-xl shadow border border-blue-100 p-8">
        <a href="/dashboard/user-management" className="flex items-center text-blue-600 hover:underline mb-6">
          <ArrowLeftIcon className="w-5 h-5 mr-1" /> Back to User Management
        </a>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Add New User</h2>
        <p className="text-gray-600 mb-6">Fill in the details and assign permissions for the new user.</p>
        {success ? (
          <div className="bg-green-100 text-green-800 px-4 py-3 rounded mb-4">User created successfully!</div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                required
                className="w-full border border-blue-200 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
              <input
                type="text"
                name="username"
                value={form.username}
                onChange={handleChange}
                required
                className="w-full border border-blue-200 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
              <select
                name="role"
                value={form.role}
                onChange={handleChange}
                className="w-full border border-blue-200 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                {roles.map((role) => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Permissions</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {sections.map((section) => (
                  <label key={section.key} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={form.permissions[section.key as SectionKey]}
                      onChange={() => handlePermissionChange(section.key as SectionKey)}
                      className="accent-blue-600 h-4 w-4 rounded"
                    />
                    <span>{section.label}</span>
                  </label>
                ))}
              </div>
            </div>
            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded-lg shadow transition"
            >
              Create User
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
