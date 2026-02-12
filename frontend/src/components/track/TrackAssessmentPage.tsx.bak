"use client";
import React, { useState, useEffect, useCallback } from "react";
import authService from "@/services/authService";
import {
    PencilSquareIcon,
    UserIcon,
    ChartBarIcon,
} from "@heroicons/react/24/outline";

interface TrackAssessmentPageProps {
    trackType: "ICSR" | "AOI" | "NoCase";
    trackDisplayName: string;
}

interface Study {
    id: string;
    pmid: string;
    title: string;
    authors: string[];
    journal: string;
    drugName?: string;
    status: string;
    userTag?: string;
    workflowTrack?: string;
    subStatus?: string;
    updatedAt: string;
    effectiveClassification?: string;
    isAutoPassed?: boolean;
}

type Destination = "data_entry" | "medical_review" | "reporting";

const destinationOptions: { id: Destination; label: string; icon: React.ReactNode; description: string }[] = [
    {
        id: "data_entry",
        label: "Data Entry",
        icon: <PencilSquareIcon className="w-5 h-5" />,
        description: "Route to data entry for further processing",
    },
    {
        id: "medical_review",
        label: "Medical Review",
        icon: <UserIcon className="w-5 h-5" />,
        description: "Fast-track to medical review",
    },
    {
        id: "reporting",
        label: "Reports",
        icon: <ChartBarIcon className="w-5 h-5" />,
        description: "Complete and send to reporting",
    },
];

export default function TrackAssessmentPage({ trackType, trackDisplayName }: TrackAssessmentPageProps) {
    const [studies, setStudies] = useState<Study[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedStudy, setSelectedStudy] = useState<Study | null>(null);
    const [routingStudyId, setRoutingStudyId] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const limit = 25;

    const getToken = () => authService.getToken();

    const fetchStudies = useCallback(async () => {
        const token = getToken();
        if (!token) return;

        setLoading(true);
        setError(null);

        try {
            const response = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/track/${trackType}/assessment?page=${page}&limit=${limit}`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                    },
                }
            );

            const data = await response.json();

            if (data.success) {
                setStudies(data.data || []);
                setTotalItems(data.pagination?.total || 0);
            } else {
                setError(data.error || "Failed to fetch studies");
            }
        } catch (err: any) {
            setError(err.message || "Failed to fetch studies");
        } finally {
            setLoading(false);
        }
    }, [trackType, page]);

    useEffect(() => {
        fetchStudies();
    }, [fetchStudies]);

    const handleRoute = async (studyId: string, destination: Destination) => {
        const token = getToken();
        if (!token) return;

        const confirmation = window.confirm(
            `Route this study to ${destination.replace("_", " ")}?\n\nThis action cannot be undone.`
        );

        if (!confirmation) return;

        setRoutingStudyId(studyId);

        try {
            const response = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/track/route/${studyId}`,
                {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ destination }),
                }
            );

            const data = await response.json();

            if (data.success) {
                // Remove study from list
                setStudies(prev => prev.filter(s => s.id !== studyId));
                setTotalItems(prev => prev - 1);
                setSelectedStudy(null);
            } else {
                alert(data.error || "Failed to route study");
            }
        } catch (err: any) {
            alert(err.message || "Failed to route study");
        } finally {
            setRoutingStudyId(null);
        }
    };

    const totalPages = Math.ceil(totalItems / limit);

    return (
        <div className="p-6">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-800">
                    {trackDisplayName} Assessment
                </h1>
                <p className="text-gray-600 mt-1">
                    Review retained studies and route to next destination
                </p>
            </div>

            {/* Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-white rounded-lg shadow p-4">
                    <div className="text-sm text-gray-500">Awaiting Assessment</div>
                    <div className="text-2xl font-bold text-blue-600">{totalItems}</div>
                </div>
                <div className="bg-white rounded-lg shadow p-4">
                    <div className="text-sm text-gray-500">Track</div>
                    <div className="text-2xl font-bold text-gray-800">{trackDisplayName}</div>
                </div>
                <div className="bg-white rounded-lg shadow p-4">
                    <div className="text-sm text-gray-500">Status</div>
                    <div className="text-2xl font-bold text-green-600">Assessment Phase</div>
                </div>
            </div>

            {/* Loading State */}
            {loading && (
                <div className="flex justify-center items-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
            )}

            {/* Error State */}
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
                    {error}
                </div>
            )}

            {/* Studies List */}
            {!loading && !error && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Studies List */}
                    <div className="lg:col-span-2 bg-white rounded-lg shadow overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-200">
                            <h2 className="text-lg font-semibold text-gray-800">
                                Studies for Assessment
                            </h2>
                        </div>

                        <div className="divide-y divide-gray-200">
                            {studies.length === 0 ? (
                                <div className="px-6 py-12 text-center text-gray-500">
                                    No studies awaiting assessment in {trackDisplayName} track
                                </div>
                            ) : (
                                studies.map((study) => (
                                    <div
                                        key={study.id}
                                        onClick={() => setSelectedStudy(study)}
                                        className={`px-6 py-4 cursor-pointer transition-colors ${selectedStudy?.id === study.id
                                            ? 'bg-blue-50 border-l-4 border-blue-600'
                                            : 'hover:bg-gray-50'
                                            }`}
                                    >
                                        <div className="flex justify-between items-start">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <a
                                                        href={`https://pubmed.ncbi.nlm.nih.gov/${study.pmid}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="text-sm font-medium text-blue-600 hover:underline"
                                                    >
                                                        PMID: {study.pmid}
                                                    </a>
                                                    <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full
                            ${study.effectiveClassification === 'ICSR'
                                                            ? 'bg-red-100 text-red-800'
                                                            : study.effectiveClassification === 'AOI'
                                                                ? 'bg-yellow-100 text-yellow-800'
                                                                : 'bg-gray-100 text-gray-800'
                                                        }`}>
                                                        {study.effectiveClassification || study.userTag || 'Pending'}
                                                    </span>
                                                </div>
                                                <h3 className="mt-1 text-sm text-gray-900 line-clamp-2">
                                                    {study.title}
                                                </h3>
                                                <div className="mt-1 text-xs text-gray-500">
                                                    {study.drugName && <span>{study.drugName} • </span>}
                                                    {new Date(study.updatedAt).toLocaleDateString()}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="bg-gray-50 px-6 py-3 flex items-center justify-between border-t border-gray-200">
                                <div className="text-sm text-gray-500">
                                    Page {page} of {totalPages}
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setPage(p => Math.max(1, p - 1))}
                                        disabled={page === 1}
                                        className="px-3 py-1 border rounded hover:bg-gray-100 disabled:opacity-50"
                                    >
                                        Previous
                                    </button>
                                    <button
                                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                        disabled={page === totalPages}
                                        className="px-3 py-1 border rounded hover:bg-gray-100 disabled:opacity-50"
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Routing Panel */}
                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-lg shadow sticky top-6">
                            <div className="px-6 py-4 border-b border-gray-200">
                                <h2 className="text-lg font-semibold text-gray-800">
                                    Route Study
                                </h2>
                            </div>

                            {selectedStudy ? (
                                <div className="p-6">
                                    <div className="mb-4">
                                        <div className="text-sm text-gray-500">Selected Study</div>
                                        <div className="font-medium text-gray-900">PMID: {selectedStudy.pmid}</div>
                                        <p className="text-sm text-gray-600 mt-1 line-clamp-3">
                                            {selectedStudy.title}
                                        </p>
                                    </div>

                                    <div className="space-y-3">
                                        {destinationOptions.map((option) => (
                                            <button
                                                key={option.id}
                                                onClick={() => handleRoute(selectedStudy.id, option.id)}
                                                disabled={routingStudyId === selectedStudy.id}
                                                className="w-full flex items-center gap-3 px-4 py-3 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left disabled:opacity-50"
                                            >
                                                <div className="text-blue-600">{option.icon}</div>
                                                <div className="flex-1">
                                                    <div className="font-medium text-gray-900">{option.label}</div>
                                                    <div className="text-xs text-gray-500">{option.description}</div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="p-6 text-center text-gray-500">
                                    Select a study to view routing options
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
