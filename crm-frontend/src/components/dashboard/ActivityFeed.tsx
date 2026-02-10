"use client";

import { useDateTime } from "@/hooks/useDateTime";

interface Activity {
    action: string;
    resource: string;
    timestamp: string;
    userName: string;
    clientId: string;
    clientName: string;
}

interface ActivityFeedProps {
    activities: Activity[];
    loading?: boolean;
}

export default function ActivityFeed({ activities, loading }: ActivityFeedProps) {
    const { formatDate } = useDateTime();

    const formatAction = (activity: Activity) => {
        const action = activity.action?.toLowerCase() || "performed action";
        const resource = activity.resource || "resource";
        return `${action} ${resource}`;
    };

    const formatTimeAgo = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 1) return "Just now";
        if (diffMins < 60) return `${diffMins} min ago`;
        if (diffHours < 24) return `${diffHours} hours ago`;
        if (diffDays < 7) return `${diffDays} days ago`;
        return formatDate(dateString);
    };

    const getInitials = (name: string) => {
        if (!name || name === "System") return "SY";
        const parts = name.split(" ");
        if (parts.length >= 2) {
            return (parts[0][0] + parts[1][0]).toUpperCase();
        }
        return name.substring(0, 2).toUpperCase();
    };

    if (loading) {
        return (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="h-6 bg-gray-200 rounded w-40 mb-4 animate-pulse"></div>
                <div className="space-y-4">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="flex items-start space-x-3 animate-pulse">
                            <div className="h-10 w-10 bg-gray-200 rounded-full"></div>
                            <div className="flex-1">
                                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                                <div className="h-3 bg-gray-200 rounded w-24"></div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
                Recent Activity
            </h2>
            {activities.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-8">
                    No recent activity to display.
                </p>
            ) : (
                <div className="space-y-4">
                    {activities.map((activity, index) => (
                        <div
                            key={`${activity.clientId}-${activity.timestamp}-${index}`}
                            className="flex items-start space-x-3 pb-4 border-b border-gray-50 last:border-0 last:pb-0"
                        >
                            <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-xs font-bold flex-shrink-0">
                                {getInitials(activity.userName)}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm text-gray-800">
                                    <span className="font-medium text-indigo-600">
                                        {activity.clientName}
                                    </span>
                                    {" - "}
                                    <span className="font-medium">{activity.userName}</span>{" "}
                                    {formatAction(activity)}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                    {formatTimeAgo(activity.timestamp)}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
