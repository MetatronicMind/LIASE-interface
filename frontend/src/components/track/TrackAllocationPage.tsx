"use client";
import React, { useState, useEffect, useCallback } from "react";
import authService from "@/services/authService";

interface TrackAllocationPageProps {
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
}

export default function TrackAllocationPage({ trackType, trackDisplayName }: TrackAllocationPageProps) {
    const [studies, setStudies] = useState<Study[]>([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [allocationPercentage, setAllocationPercentage] = useState(10);
    const [configuredPercentage, setConfiguredPercentage] = useState(10);
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
                `${process.env.NEXT_PUBLIC_API_URL}/track/${trackType}/allocation?page=${page}&limit=${limit}`,
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
                if (data.allocationPercentage !== undefined) {
                    setConfiguredPercentage(data.allocationPercentage);
                    setAllocationPercentage(data.allocationPercentage);
                }
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

    const handleProcessAllocation = async () => {
        const token = getToken();
        if (!token) return;

        const confirmation = window.confirm(
            `Process allocation for ${totalItems} studies?\n\n` +
            `${allocationPercentage}% will be retained for manual assessment.\n` +
            `${100 - allocationPercentage}% will be auto-passed.\n\n` +
            `This action cannot be undone.`
        );

        if (!confirmation) return;

        setProcessing(true);

        try {
            const response = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/track/${trackType}/allocate`,
                {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ retainPercentage: allocationPercentage }),
                }
            );

            const data = await response.json();

            if (data.success) {
                alert(
                    `Allocation complete!\n\n` +
                    `${data.results.retained} studies retained for assessment\n` +
                    `${data.results.autoPassed} studies auto-passed`
                );
                fetchStudies();
            } else {
                alert(data.error || "Failed to process allocation");
            }
        } catch (err: any) {
            alert(err.message || "Failed to process allocation");
        } finally {
            setProcessing(false);
        }
    };

    const retainedCount = Math.ceil(totalItems * (allocationPercentage / 100));
    const autoPassedCount = totalItems - retainedCount;
    const totalPages = Math.ceil(totalItems / limit);

    return (
        <div className="p-6">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-800">
                    {trackDisplayName} Allocation
                </h1>
                <p className="text-gray-600 mt-1">
                    Manage allocation percentages for {trackDisplayName} studies
                </p>
            </div>

            {/* Allocation Control Panel */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
                <h2 className="text-lg font-semibold text-gray-800 mb-4">
                    Allocation Settings
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Percentage Slider */}
                    <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Retain Percentage for Manual Assessment
                        </label>
                        <div className="flex items-center gap-4">
                            <input
                                type="range"
                                min="0"
                                max="100"
                                value={allocationPercentage}
                                onChange={(e) => setAllocationPercentage(Number(e.target.value))}
                                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                            />
                            <input
                                type="number"
                                min="0"
                                max="100"
                                value={allocationPercentage}
                                onChange={(e) => setAllocationPercentage(Math.min(100, Math.max(0, Number(e.target.value))))}
                                className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-center"
                            />
                            <span className="text-gray-500">%</span>
                        </div>
                        <p className="text-sm text-gray-500 mt-1">
                            Configured default: {configuredPercentage}%
                        </p>
                    </div>

                    {/* Preview */}
                    <div className="bg-gray-50 rounded-lg p-4">
                        <h3 className="text-sm font-medium text-gray-700 mb-2">Preview</h3>
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Total Studies:</span>
                                <span className="font-semibold">{totalItems}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-green-600">Retained:</span>
                                <span className="font-semibold text-green-600">{retainedCount}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-blue-600">Auto-Passed:</span>
                                <span className="font-semibold text-blue-600">{autoPassedCount}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Process Button */}
                <div className="mt-6 flex justify-end">
                    <button
                        onClick={handleProcessAllocation}
                        disabled={processing || totalItems === 0}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                    >
                        {processing ? (
                            <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                Processing...
                            </>
                        ) : (
                            "Process Allocation"
                        )}
                    </button>
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

            {/* Studies Table */}
            {!loading && !error && (
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200">
                        <h2 className="text-lg font-semibold text-gray-800">
                            Studies Pending Allocation
                        </h2>
                    </div>

                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    PMID
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Title
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Drug
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Classification
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Updated
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {studies.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                                        No studies pending allocation in {trackDisplayName} track
                                    </td>
                                </tr>
                            ) : (
                                studies.map((study) => (
                                    <tr key={study.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                                            <a
                                                href={`https://pubmed.ncbi.nlm.nih.gov/${study.pmid}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="hover:underline"
                                            >
                                                {study.pmid}
                                            </a>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-900 max-w-md truncate">
                                            {study.title}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {study.drugName || "-"}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full
                        ${study.effectiveClassification === 'ICSR'
                                                    ? 'bg-red-100 text-red-800'
                                                    : study.effectiveClassification === 'AOI'
                                                        ? 'bg-yellow-100 text-yellow-800'
                                                        : 'bg-gray-100 text-gray-800'
                                                }`}>
                                                {study.effectiveClassification || study.userTag || 'Pending'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {new Date(study.updatedAt).toLocaleDateString()}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="bg-gray-50 px-6 py-3 flex items-center justify-between border-t border-gray-200">
                            <div className="text-sm text-gray-500">
                                Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, totalItems)} of {totalItems} studies
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    className="px-3 py-1 border rounded hover:bg-gray-100 disabled:opacity-50"
                                >
                                    Previous
                                </button>
                                <span className="px-3 py-1">
                                    Page {page} of {totalPages}
                                </span>
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
            )}
        </div>
    );
}
