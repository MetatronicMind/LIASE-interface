"use client";

import {
    BuildingOffice2Icon,
    UserGroupIcon,
    DocumentTextIcon,
    BeakerIcon,
} from "@heroicons/react/24/outline";

interface SummaryStats {
    totalClients: number;
    totalUsers: number;
    totalActiveUsers: number;
    totalStudies: number;
    totalPendingStudies: number;
    totalDrugs: number;
    totalActiveDrugs: number;
}

interface CRMDashboardStatsProps {
    stats: SummaryStats;
    loading?: boolean;
}

export default function CRMDashboardStats({ stats, loading }: CRMDashboardStatsProps) {
    const statsCards = [
        {
            label: "Total Clients",
            value: stats.totalClients,
            icon: BuildingOffice2Icon,
            color: "bg-indigo-500",
            bgLight: "bg-indigo-50",
            textColor: "text-indigo-600",
        },
        {
            label: "Total Users",
            value: stats.totalUsers,
            subValue: `${stats.totalActiveUsers} active`,
            icon: UserGroupIcon,
            color: "bg-blue-500",
            bgLight: "bg-blue-50",
            textColor: "text-blue-600",
        },
        {
            label: "Total Studies",
            value: stats.totalStudies,
            subValue: `${stats.totalPendingStudies} pending`,
            icon: DocumentTextIcon,
            color: "bg-green-500",
            bgLight: "bg-green-50",
            textColor: "text-green-600",
        },
        {
            label: "Total Drugs",
            value: stats.totalDrugs,
            subValue: `${stats.totalActiveDrugs} active`,
            icon: BeakerIcon,
            color: "bg-purple-500",
            bgLight: "bg-purple-50",
            textColor: "text-purple-600",
        },
    ];

    if (loading) {
        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 animate-pulse">
                        <div className="h-10 w-10 bg-gray-200 rounded-full mb-4"></div>
                        <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                        <div className="h-8 bg-gray-200 rounded w-16"></div>
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {statsCards.map((card) => (
                <div
                    key={card.label}
                    className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow"
                >
                    <div className="flex items-center justify-between mb-4">
                        <div className={`p-3 rounded-full ${card.bgLight}`}>
                            <card.icon className={`h-6 w-6 ${card.textColor}`} />
                        </div>
                    </div>
                    <h3 className="text-sm font-medium text-gray-500">{card.label}</h3>
                    <p className="text-3xl font-bold text-gray-900 mt-1">
                        {card.value.toLocaleString()}
                    </p>
                    {card.subValue && (
                        <p className="text-xs text-gray-500 mt-1">{card.subValue}</p>
                    )}
                </div>
            ))}
        </div>
    );
}
