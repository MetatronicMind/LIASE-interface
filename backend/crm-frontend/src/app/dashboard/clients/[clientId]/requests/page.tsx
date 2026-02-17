"use client";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
    CheckIcon,
    XMarkIcon,
    ClockIcon,
    EyeIcon,
    FunnelIcon,
    ArrowPathIcon,
} from "@heroicons/react/24/outline";
import { getApiBaseUrl } from "@/config/api";

type RequestStatus = "pending" | "approved" | "rejected";
type RequestType = "workflow" | "triage" | "setting" | "user";

interface ChangeRequest {
    id: string;
    type: RequestType;
    title: string;
    description: string;
    requestedBy: {
        name: string;
        email: string;
    };
    requestedAt: string;
    status: RequestStatus;
    currentValue: any;
    proposedValue: any;
    reviewedBy?: string;
    reviewedAt?: string;
}

export default function ClientRequestsPage() {
    const params = useParams();
    const clientId = params.clientId as string;
    const [requests, setRequests] = useState<ChangeRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<RequestStatus | "all">("all");
    const [typeFilter, setTypeFilter] = useState<RequestType | "all">("all");
    const [selectedRequest, setSelectedRequest] = useState<ChangeRequest | null>(null);
    const [processing, setProcessing] = useState<string | null>(null);

    useEffect(() => {
        fetchRequests();
    }, [clientId]);

    const fetchRequests = async () => {
        try {
            const token = localStorage.getItem("auth_token");
            const response = await fetch(
                `${getApiBaseUrl()}/organizations/${clientId}/requests`,
                {
                    headers: { Authorization: `Bearer ${token}` },
                }
            );
            if (response.ok) {
                const data = await response.json();
                // API returns { requests: [], total: number, pending: number }
                const requestsData = data.requests || [];
                // Map API format if needed
                const mappedRequests = requestsData.map((req: any) => ({
                    id: req.id,
                    type: req.type || "setting",
                    title: req.title || req.description?.substring(0, 50) || "Change Request",
                    description: req.description || "",
                    requestedBy: req.requestedBy || { name: "Unknown", email: "" },
                    requestedAt: req.requestedAt || req.createdAt,
                    status: req.status || "pending",
                    currentValue: req.currentValue || req.oldValue || {},
                    proposedValue: req.proposedValue || req.newValue || {},
                    reviewedBy: req.reviewedBy,
                    reviewedAt: req.reviewedAt,
                }));
                setRequests(mappedRequests);
            } else {
                // Mock data for demo when API returns error
                setRequests([
                    {
                        id: "req-1",
                        type: "workflow",
                        title: "Enable Medical Review Stage",
                        description: "Client requests to enable the Medical Review stage in their workflow pipeline.",
                        requestedBy: { name: "John Admin", email: "admin@client.com" },
                        requestedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
                        status: "pending",
                        currentValue: { medicalReview: false },
                        proposedValue: { medicalReview: true },
                    },
                    {
                        id: "req-2",
                        type: "triage",
                        title: "Increase Batch Allocation Size",
                        description: "Request to increase the triage batch size from 100 to 150 cases.",
                        requestedBy: { name: "Jane Manager", email: "manager@client.com" },
                        requestedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
                        status: "pending",
                        currentValue: { batchAllocationSize: 100 },
                        proposedValue: { batchAllocationSize: 150 },
                    },
                ]);
            }
        } catch (error) {
            console.error("Failed to fetch requests", error);
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (requestId: string) => {
        setProcessing(requestId);
        try {
            const token = localStorage.getItem("auth_token");
            // API call to approve request
            await fetch(
                `${getApiBaseUrl()}/organizations/${clientId}/requests/${requestId}/approve`,
                {
                    method: "POST",
                    headers: { Authorization: `Bearer ${token}` },
                }
            );
            // Update local state
            setRequests((prev) =>
                prev.map((req) =>
                    req.id === requestId
                        ? {
                            ...req,
                            status: "approved" as RequestStatus,
                            reviewedBy: "Current Admin",
                            reviewedAt: new Date().toISOString(),
                        }
                        : req
                )
            );
            setSelectedRequest(null);
        } catch (error) {
            console.error("Failed to approve request", error);
        } finally {
            setProcessing(null);
        }
    };

    const handleReject = async (requestId: string) => {
        setProcessing(requestId);
        try {
            const token = localStorage.getItem("auth_token");
            // API call to reject request
            await fetch(
                `${getApiBaseUrl()}/organizations/${clientId}/requests/${requestId}/reject`,
                {
                    method: "POST",
                    headers: { Authorization: `Bearer ${token}` },
                }
            );
            // Update local state
            setRequests((prev) =>
                prev.map((req) =>
                    req.id === requestId
                        ? {
                            ...req,
                            status: "rejected" as RequestStatus,
                            reviewedBy: "Current Admin",
                            reviewedAt: new Date().toISOString(),
                        }
                        : req
                )
            );
            setSelectedRequest(null);
        } catch (error) {
            console.error("Failed to reject request", error);
        } finally {
            setProcessing(null);
        }
    };

    const filteredRequests = requests.filter((req) => {
        const matchesStatus = statusFilter === "all" || req.status === statusFilter;
        const matchesType = typeFilter === "all" || req.type === typeFilter;
        return matchesStatus && matchesType;
    });

    const pendingCount = requests.filter((r) => r.status === "pending").length;

    const getStatusBadge = (status: RequestStatus) => {
        switch (status) {
            case "pending":
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">
                        <ClockIcon className="w-3.5 h-3.5" /> Pending
                    </span>
                );
            case "approved":
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                        <CheckIcon className="w-3.5 h-3.5" /> Approved
                    </span>
                );
            case "rejected":
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">
                        <XMarkIcon className="w-3.5 h-3.5" /> Rejected
                    </span>
                );
        }
    };

    const getTypeBadge = (type: RequestType) => {
        const colors: Record<RequestType, string> = {
            workflow: "bg-purple-100 text-purple-800",
            triage: "bg-blue-100 text-blue-800",
            setting: "bg-gray-100 text-gray-800",
            user: "bg-indigo-100 text-indigo-800",
        };
        return (
            <span
                className={`px-2 py-1 rounded text-xs font-medium capitalize ${colors[type]}`}
            >
                {type}
            </span>
        );
    };

    const formatTimeAgo = (dateStr: string) => {
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
                    <h2 className="text-xl font-semibold text-gray-800">
                        Request Management
                    </h2>
                    <p className="text-sm text-gray-500">
                        Review and approve client configuration change requests
                    </p>
                </div>
                {pendingCount > 0 && (
                    <div className="flex items-center gap-2 px-4 py-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <ClockIcon className="w-5 h-5 text-yellow-600" />
                        <span className="text-sm font-medium text-yellow-800">
                            {pendingCount} pending request{pendingCount > 1 ? "s" : ""}
                        </span>
                    </div>
                )}
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex flex-wrap gap-4">
                <div className="flex items-center gap-2">
                    <FunnelIcon className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-600">Filters:</span>
                </div>
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as RequestStatus | "all")}
                    className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                    <option value="all">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                </select>
                <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value as RequestType | "all")}
                    className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                    <option value="all">All Types</option>
                    <option value="workflow">Workflow</option>
                    <option value="triage">Triage</option>
                    <option value="setting">Setting</option>
                    <option value="user">User</option>
                </select>
                <button
                    onClick={fetchRequests}
                    className="ml-auto flex items-center gap-1 text-sm text-gray-600 hover:text-indigo-600"
                >
                    <ArrowPathIcon className="w-4 h-4" />
                    Refresh
                </button>
            </div>

            {/* Requests List */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                        <p className="mt-2 text-gray-500">Loading requests...</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-200">
                        {filteredRequests.map((request) => (
                            <div
                                key={request.id}
                                className={`p-4 hover:bg-gray-50 transition-colors ${request.status === "pending" ? "bg-yellow-50/30" : ""
                                    }`}
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            {getTypeBadge(request.type)}
                                            {getStatusBadge(request.status)}
                                        </div>
                                        <h3 className="font-medium text-gray-900">{request.title}</h3>
                                        <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                                            {request.description}
                                        </p>
                                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                                            <span>By {request.requestedBy.name}</span>
                                            <span>{formatTimeAgo(request.requestedAt)}</span>
                                            {request.reviewedBy && (
                                                <span className="text-green-600">
                                                    Reviewed by {request.reviewedBy}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => setSelectedRequest(request)}
                                            className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                            title="View Details"
                                        >
                                            <EyeIcon className="w-5 h-5" />
                                        </button>
                                        {request.status === "pending" && (
                                            <>
                                                <button
                                                    onClick={() => handleApprove(request.id)}
                                                    disabled={processing === request.id}
                                                    className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
                                                    title="Approve"
                                                >
                                                    <CheckIcon className="w-5 h-5" />
                                                </button>
                                                <button
                                                    onClick={() => handleReject(request.id)}
                                                    disabled={processing === request.id}
                                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                                                    title="Reject"
                                                >
                                                    <XMarkIcon className="w-5 h-5" />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {!loading && filteredRequests.length === 0 && (
                    <div className="p-8 text-center text-gray-500">
                        No requests found matching your filters.
                    </div>
                )}
            </div>

            {/* Request Detail Modal */}
            {selectedRequest && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[80vh] overflow-hidden flex flex-col">
                        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-gray-900">
                                Request Details
                            </h3>
                            <button
                                onClick={() => setSelectedRequest(null)}
                                className="p-1 hover:bg-gray-100 rounded"
                            >
                                <XMarkIcon className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-4">
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    {getTypeBadge(selectedRequest.type)}
                                    {getStatusBadge(selectedRequest.status)}
                                </div>
                                <h4 className="text-xl font-medium text-gray-900">
                                    {selectedRequest.title}
                                </h4>
                                <p className="text-gray-600 mt-2">{selectedRequest.description}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-red-50 p-4 rounded-lg">
                                    <p className="text-xs font-medium text-red-600 uppercase mb-2">
                                        Current Value
                                    </p>
                                    <pre className="text-sm text-gray-800 whitespace-pre-wrap">
                                        {JSON.stringify(selectedRequest.currentValue, null, 2)}
                                    </pre>
                                </div>
                                <div className="bg-green-50 p-4 rounded-lg">
                                    <p className="text-xs font-medium text-green-600 uppercase mb-2">
                                        Proposed Value
                                    </p>
                                    <pre className="text-sm text-gray-800 whitespace-pre-wrap">
                                        {JSON.stringify(selectedRequest.proposedValue, null, 2)}
                                    </pre>
                                </div>
                            </div>

                            <div className="bg-gray-50 p-4 rounded-lg">
                                <p className="text-xs font-medium text-gray-500 uppercase mb-2">
                                    Requested By
                                </p>
                                <p className="font-medium">{selectedRequest.requestedBy.name}</p>
                                <p className="text-sm text-gray-500">
                                    {selectedRequest.requestedBy.email}
                                </p>
                                <p className="text-sm text-gray-500 mt-1">
                                    {new Date(selectedRequest.requestedAt).toLocaleString()}
                                </p>
                            </div>
                        </div>

                        {selectedRequest.status === "pending" && (
                            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3 bg-gray-50">
                                <button
                                    onClick={() => handleReject(selectedRequest.id)}
                                    disabled={processing === selectedRequest.id}
                                    className="px-4 py-2 text-red-600 border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-50"
                                >
                                    Reject
                                </button>
                                <button
                                    onClick={() => handleApprove(selectedRequest.id)}
                                    disabled={processing === selectedRequest.id}
                                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                                >
                                    Approve & Apply
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
