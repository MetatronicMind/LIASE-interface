"use client";

import Link from "next/link";
import {
    ChevronRightIcon,
    MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
import { useDateTime } from "@/hooks/useDateTime";

interface Client {
    id: string;
    name: string;
    plan: string;
    contactEmail: string;
    userCount: number;
    activeUsers: number;
    studyCount: number;
    pendingStudies: number;
    drugCount: number;
    lastActivity: string;
    createdAt: string;
}

interface ClientsTableProps {
    clients: Client[];
    loading?: boolean;
    searchTerm: string;
    onSearchChange: (term: string) => void;
}

export default function ClientsTable({
    clients,
    loading,
    searchTerm,
    onSearchChange,
}: ClientsTableProps) {
    const { formatDate } = useDateTime();

    const filteredClients = clients.filter((client) =>
        client.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getPlanBadgeColor = (plan: string) => {
        switch (plan?.toLowerCase()) {
            case "enterprise":
                return "bg-purple-100 text-purple-800";
            case "pro":
                return "bg-blue-100 text-blue-800";
            case "premium":
                return "bg-indigo-100 text-indigo-800";
            default:
                return "bg-gray-100 text-gray-800";
        }
    };

    const formatTimeAgo = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 1) return "Just now";
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return formatDate(dateString);
    };

    if (loading) {
        return (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-100">
                    <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
                </div>
                <div className="p-6 space-y-4">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="h-16 bg-gray-100 rounded animate-pulse"></div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            {/* Header with Search */}
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-800">Clients Overview</h2>
                <div className="relative">
                    <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                    <input
                        type="text"
                        placeholder="Search clients..."
                        value={searchTerm}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm w-64"
                    />
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Client
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Plan
                            </th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Users
                            </th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Studies
                            </th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Drugs
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Last Activity
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {filteredClients.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                                    {searchTerm
                                        ? "No clients found matching your search."
                                        : "No clients onboarded yet. Click 'Onboard New Client' to get started."}
                                </td>
                            </tr>
                        ) : (
                            filteredClients.map((client) => (
                                <tr key={client.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div>
                                            <Link
                                                href={`/dashboard/clients/${client.id}`}
                                                className="text-sm font-medium text-gray-900 hover:text-indigo-600"
                                            >
                                                {client.name}
                                            </Link>
                                            <p className="text-xs text-gray-500 truncate max-w-[200px]">
                                                {client.contactEmail}
                                            </p>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span
                                            className={`px-2 py-1 text-xs font-semibold rounded-full ${getPlanBadgeColor(
                                                client.plan
                                            )}`}
                                        >
                                            {client.plan}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className="text-sm font-medium text-gray-900">
                                            {client.userCount}
                                        </span>
                                        <span className="text-xs text-gray-500 block">
                                            {client.activeUsers} active
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className="text-sm font-medium text-gray-900">
                                            {client.studyCount}
                                        </span>
                                        {client.pendingStudies > 0 && (
                                            <span className="text-xs text-orange-600 block">
                                                {client.pendingStudies} pending
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className="text-sm font-medium text-gray-900">
                                            {client.drugCount}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-sm text-gray-500">
                                            {formatTimeAgo(client.lastActivity)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <Link
                                            href={`/dashboard/clients/${client.id}`}
                                            className="inline-flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-900"
                                        >
                                            Manage
                                            <ChevronRightIcon className="h-4 w-4 ml-1" />
                                        </Link>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
