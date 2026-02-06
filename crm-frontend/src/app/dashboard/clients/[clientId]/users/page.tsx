"use client";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
    MagnifyingGlassIcon,
    UserPlusIcon,
    PencilIcon,
    TrashIcon,
    CheckCircleIcon,
    XCircleIcon,
} from "@heroicons/react/24/outline";
import { getApiBaseUrl } from "@/config/api";

interface User {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    status: "active" | "inactive" | "pending";
    lastLogin?: string;
    createdAt: string;
}

export default function ClientUsersPage() {
    const params = useParams();
    const clientId = params.clientId as string;
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [roleFilter, setRoleFilter] = useState("all");
    const [apiError, setApiError] = useState<string | null>(null);

    useEffect(() => {
        fetchUsers();
    }, [clientId]);

    const fetchUsers = async () => {
        setApiError(null);
        try {
            const token = localStorage.getItem("auth_token");
            // Fetch users from the new CRM API endpoint
            const response = await fetch(
                `${getApiBaseUrl()}/organizations/${clientId}/users`,
                {
                    headers: { Authorization: `Bearer ${token}` },
                }
            );

            if (response.ok) {
                const data = await response.json();
                // Map backend format to frontend format
                const mappedUsers = (data.users || []).map((user: any) => ({
                    id: user.id,
                    email: user.email,
                    firstName: user.firstName || user.username?.split(".")[0] || "Unknown",
                    lastName: user.lastName || "",
                    role: user.role || "User",
                    status: user.isActive ? "active" : (user.isActive === false ? "inactive" : "pending"),
                    lastLogin: user.lastLogin,
                    createdAt: user.createdAt,
                }));
                setUsers(mappedUsers);
            } else if (response.status === 404) {
                setApiError("Organization not found");
                setUsers([]);
            } else {
                // Fallback to mock data if API fails
                console.warn("API returned error, using sample data");
                setUsers([
                    {
                        id: "1",
                        email: "admin@client.com",
                        firstName: "Admin",
                        lastName: "User",
                        role: "Admin",
                        status: "active",
                        lastLogin: new Date().toISOString(),
                        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
                    },
                ]);
            }
        } catch (error) {
            console.error("Failed to fetch users", error);
            setApiError("Failed to connect to server");
        } finally {
            setLoading(false);
        }
    };

    const filteredUsers = users.filter((user) => {
        const matchesSearch =
            user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            `${user.firstName} ${user.lastName}`
                .toLowerCase()
                .includes(searchTerm.toLowerCase());
        const matchesRole = roleFilter === "all" || user.role === roleFilter;
        return matchesSearch && matchesRole;
    });

    const roles = [...new Set(users.map((u) => u.role))];

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "active":
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                        <CheckCircleIcon className="w-3 h-3" /> Active
                    </span>
                );
            case "inactive":
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
                        <XCircleIcon className="w-3 h-3" /> Inactive
                    </span>
                );
            case "pending":
                return (
                    <span className="inline-flex items-center px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">
                        Pending
                    </span>
                );
            default:
                return null;
        }
    };

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return "Never";
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffHours < 1) return "Just now";
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString();
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h2 className="text-xl font-semibold text-gray-800">Client Users</h2>
                    <p className="text-sm text-gray-500">
                        Manage users associated with this client organization
                    </p>
                </div>
                <button className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
                    <UserPlusIcon className="w-5 h-5" />
                    Add User
                </button>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex flex-col sm:flex-row gap-4">
                <div className="flex-1 flex items-center gap-2">
                    <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search by name or email..."
                        className="flex-1 outline-none text-gray-700"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-600">Role:</label>
                    <select
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value)}
                        className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                        <option value="all">All Roles</option>
                        {roles.map((role) => (
                            <option key={role} value={role}>
                                {role}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Users Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                        <p className="mt-2 text-gray-500">Loading users...</p>
                    </div>
                ) : (
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    User
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Role
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Status
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Last Login
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredUsers.map((user) => (
                                <tr key={user.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-sm">
                                                {user.firstName[0]}
                                                {user.lastName[0]}
                                            </div>
                                            <div className="ml-3">
                                                <p className="text-sm font-medium text-gray-900">
                                                    {user.firstName} {user.lastName}
                                                </p>
                                                <p className="text-sm text-gray-500">{user.email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                                            {user.role}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {getStatusBadge(user.status)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {formatDate(user.lastLogin)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors">
                                                <PencilIcon className="w-4 h-4" />
                                            </button>
                                            <button className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors">
                                                <TrashIcon className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}

                {!loading && filteredUsers.length === 0 && (
                    <div className="p-8 text-center text-gray-500">
                        No users found matching your criteria.
                    </div>
                )}
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                    <p className="text-sm text-gray-500">Total Users</p>
                    <p className="text-2xl font-bold text-gray-900">{users.length}</p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                    <p className="text-sm text-gray-500">Active Users</p>
                    <p className="text-2xl font-bold text-green-600">
                        {users.filter((u) => u.status === "active").length}
                    </p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                    <p className="text-sm text-gray-500">Pending Invitations</p>
                    <p className="text-2xl font-bold text-yellow-600">
                        {users.filter((u) => u.status === "pending").length}
                    </p>
                </div>
            </div>
        </div>
    );
}
